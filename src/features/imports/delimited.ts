/**
 * Delimited-text parsing for bank and wallet statement exports.
 *
 * Hand-written rather than pulled from a library because the requirements
 * are narrow (RFC 4180 quoting, a couple of delimiters) and every dependency
 * added here has to work identically on Android, iOS and web. It is pure, so
 * the quoting rules are unit-testable without a file.
 */

export type Delimiter = ',' | ';' | '\t' | '|';

const CANDIDATE_DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

/**
 * Guesses the delimiter by which candidate yields the most *consistent*
 * column count across the first few lines.
 *
 * Consistency beats raw frequency: a description field full of commas would
 * win a naive count, but produces ragged rows, whereas the real delimiter
 * gives every line the same width.
 */
export function detectDelimiter(text: string): Delimiter {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 10);
  if (lines.length === 0) return ',';

  let best: { delimiter: Delimiter; score: number } = { delimiter: ',', score: -1 };

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const widths = lines.map((line) => parseLine(line, delimiter).length);
    const modal = widths[0]!;
    if (modal < 2) continue;

    const consistent = widths.filter((width) => width === modal).length;
    // Favour consistency first, then wider splits to break ties.
    const score = consistent * 100 + modal;

    if (score > best.score) best = { delimiter, score };
  }

  return best.score === -1 ? ',' : best.delimiter;
}

/**
 * Splits one line, honouring RFC 4180 double-quote escaping.
 *
 * A quoted field can contain the delimiter, and `""` inside a quoted field is
 * a literal quote. Bank exports lean on both constantly — a payee called
 * `"SHRESTHA, RAM"` is entirely normal.
 */
export function parseLine(line: string, delimiter: Delimiter): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;

    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

export interface DelimitedTable {
  header: string[];
  rows: string[][];
  delimiter: Delimiter;
  /** Lines skipped before the header — bank exports often carry a preamble. */
  skippedLines: number;
}

/**
 * Parses delimited text into a header plus rows.
 *
 * `headerPattern` (from an `import_profiles` row) locates the header when the
 * file opens with a preamble of account details and blank lines, which most
 * Nepali bank exports do. Without one, the first line wide enough to be a
 * table is taken as the header.
 */
export function parseDelimited(text: string, headerPattern?: string | null): DelimitedTable {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/);

  let headerIndex = -1;

  if (headerPattern) {
    const needle = headerPattern.toLowerCase();
    headerIndex = lines.findIndex((line) => line.toLowerCase().includes(needle));
  }

  if (headerIndex === -1) {
    headerIndex = lines.findIndex((line) => parseLine(line, delimiter).filter(Boolean).length >= 2);
  }

  if (headerIndex === -1) return { header: [], rows: [], delimiter, skippedLines: 0 };

  const header = parseLine(lines[headerIndex]!, delimiter);
  const rows = lines
    .slice(headerIndex + 1)
    .filter((line) => line.trim().length > 0)
    .map((line) => parseLine(line, delimiter))
    // A trailing totals line or stray fragment has fewer columns than the
    // header; keeping it would produce a row of nulls in the review queue.
    .filter((fields) => fields.filter(Boolean).length >= 2);

  return { header, rows, delimiter, skippedLines: headerIndex };
}
