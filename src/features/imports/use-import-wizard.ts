import { useCallback, useState } from 'react';

import { toMinorUnits } from '@/utils/money';
import { AppError } from '@/utils/errors';
import { providerFor } from '@/services/ocr/providers';
import { bytesToText, readFileBytes, type PickedFile } from '@/features/documents/api';
import { parseDelimited, type DelimitedTable } from '@/features/imports/delimited';
import { guessColumnMapping, type ColumnMapping } from '@/features/imports/normalise';
import { parseStatement, type ParsedStatement } from '@/features/imports/parse-statement';
import { reconcile, findContinuityBreaks, type ReconciliationResult } from '@/features/imports/reconcile';
import { findDuplicates, type DuplicateMatch, type ExistingTransaction } from '@/features/imports/duplicates';
import {
  applyImportRules,
  suggestCounterparties,
  type CounterpartyAlias,
  type CounterpartyCandidate,
  type ImportRuleLike,
} from '@/features/imports/counterparty-match';

/**
 * Drives the statement import from picked file to reviewable rows.
 *
 * Kept as a hook with explicit steps rather than one do-everything call so
 * the column mapping can be corrected and the parse re-run without
 * re-reading the file — correcting the mapping is the single most common
 * thing a user needs to do, since no two banks label their columns alike.
 */

export interface ImportPreview {
  table: DelimitedTable;
  statement: ParsedStatement;
  reconciliation: ReconciliationResult;
  duplicates: DuplicateMatch[];
  continuityBreaks: ReturnType<typeof findContinuityBreaks>;
  suggestions: Record<number, { counterpartyId: string | null; categoryId: string | null }>;
  /** The parsed balances, so saving doesn't have to re-parse the typed text. */
  openingBalanceMinor: number | null;
  closingBalanceMinor: number | null;
}

export interface AnalyseOptions {
  currency: string;
  openingBalance: string;
  closingBalance: string;
  existingTransactions: ExistingTransaction[];
  counterparties: CounterpartyCandidate[];
  aliases: CounterpartyAlias[];
  rules: ImportRuleLike[];
  dateFormat?: string | null;
}

export function useImportWizard() {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [table, setTable] = useState<DelimitedTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  /**
   * Reads the file and proposes a column mapping.
   *
   * The engine is chosen by MIME type; an unavailable one (photo OCR, PDF
   * text) surfaces its own explanation rather than a generic failure, which
   * is the whole reason `providerFor` returns unavailable providers instead
   * of hiding them.
   */
  const load = useCallback(async (picked: PickedFile, headerPattern?: string | null) => {
    setIsReading(true);
    setError(null);
    setPreview(null);

    try {
      const provider = providerFor(picked.mimeType);

      if (!provider) {
        throw new AppError('unsupported_document', `Nothing in this app can read ${picked.mimeType} files.`);
      }

      const availability = provider.availability();
      if (!availability.available) {
        throw new AppError('unsupported_document', availability.reason ?? 'That file type cannot be read.');
      }

      const bytes = await readFileBytes(picked.uri);
      const text = await provider
        .extractText({ uri: picked.uri, mimeType: picked.mimeType, text: bytesToText(bytes) })
        .then((result) => result.text);

      const parsed = parseDelimited(text, headerPattern);

      if (parsed.header.length === 0) {
        throw new AppError(
          'unsupported_document',
          provider.engine === 'server_fallback'
            ? "No transaction table was found in that photo. This works best on a clear, flat photo of a bank or wallet statement page — for a single receipt, use Scan → File a document instead."
            : 'No table could be found in that file.'
        );
      }

      setFile(picked);
      setRawText(text);
      setTable(parsed);
      setMapping(guessColumnMapping(parsed.header));
    } catch (loadFailure) {
      setError(loadFailure instanceof AppError ? loadFailure.message : 'That file could not be read.');
    } finally {
      setIsReading(false);
    }
  }, []);

  /** Re-runs parsing, validation and matching against the current mapping. */
  const analyse = useCallback(
    (options: AnalyseOptions) => {
      if (!table) return;

      const statement = parseStatement(table, {
        mapping,
        currency: options.currency,
        dateFormat: options.dateFormat,
      });

      const openingBalanceMinor = safeMinorUnits(options.openingBalance, options.currency);
      const closingBalanceMinor = safeMinorUnits(options.closingBalance, options.currency);

      const suggestions: ImportPreview['suggestions'] = {};

      for (const row of statement.rows) {
        if (!row.rawDescription) continue;

        // A confirmed rule is a decision the user already made, so it wins
        // over a fresh fuzzy guess.
        const ruleMatch = applyImportRules(row.rawDescription, options.rules);
        if (ruleMatch) {
          suggestions[row.rowNumber] = ruleMatch;
          continue;
        }

        const [best] = suggestCounterparties(row.rawDescription, options.counterparties, options.aliases, 1);
        suggestions[row.rowNumber] = {
          counterpartyId: best?.counterpartyId ?? null,
          categoryId: null,
        };
      }

      setPreview({
        table,
        statement,
        reconciliation: reconcile(statement.rows, openingBalanceMinor, closingBalanceMinor),
        duplicates: findDuplicates(statement.rows, options.existingTransactions),
        continuityBreaks: findContinuityBreaks(statement.rows),
        suggestions,
        openingBalanceMinor,
        closingBalanceMinor,
      });
    },
    [table, mapping]
  );

  const reset = useCallback(() => {
    setFile(null);
    setRawText(null);
    setTable(null);
    setMapping({});
    setPreview(null);
    setError(null);
  }, []);

  return { file, rawText, table, mapping, setMapping, preview, error, isReading, load, analyse, reset };
}

/** A blank or unparseable balance means "not stated", not zero. */
function safeMinorUnits(value: string, currency: string): number | null {
  if (value.trim() === '') return null;
  try {
    return toMinorUnits(value, currency);
  } catch {
    return null;
  }
}
