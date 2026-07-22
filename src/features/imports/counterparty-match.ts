import Fuse from 'fuse.js';

import { normaliseDescription } from '@/features/imports/normalise';

/**
 * Suggesting which person or business a statement line refers to.
 *
 * Two rules from the pipeline design govern everything here:
 *   - a suggestion is **never** auto-applied; the user confirms it, and only
 *     then is an alias written so the same raw text resolves next time;
 *   - two counterparties are never merged automatically.
 *
 * So this module only ever returns ranked candidates with a confidence, and
 * has no side effects.
 */

export interface CounterpartyCandidate {
  id: string;
  display_name: string;
}

export interface CounterpartyAlias {
  counterparty_id: string;
  alias: string;
}

export interface MatchSuggestion {
  counterpartyId: string;
  displayName: string;
  /** 0–1; 1 means an exact alias hit. */
  score: number;
  source: 'alias' | 'fuzzy';
}

/**
 * Fuse scores are distances (0 = perfect), and anything above this is noise
 * on short bank descriptions — two unrelated Kathmandu shop names will
 * happily score 0.6.
 */
const FUZZY_THRESHOLD = 0.45;

/**
 * Ranks counterparties against one raw statement description.
 *
 * Confirmed aliases are checked first and exactly: once the user has told the
 * app that this raw text means this person, there is nothing to guess at, and
 * a fuzzy match must never override it.
 */
export function suggestCounterparties(
  rawDescription: string,
  counterparties: CounterpartyCandidate[],
  aliases: CounterpartyAlias[],
  limit = 3
): MatchSuggestion[] {
  const normalised = normaliseDescription(rawDescription);
  if (normalised === '') return [];

  const byId = new Map(counterparties.map((row) => [row.id, row]));

  const aliasHit = aliases.find((alias) => normaliseDescription(alias.alias) === normalised);
  if (aliasHit) {
    const counterparty = byId.get(aliasHit.counterparty_id);
    if (counterparty) {
      return [
        {
          counterpartyId: counterparty.id,
          displayName: counterparty.display_name,
          score: 1,
          source: 'alias',
        },
      ];
    }
  }

  if (counterparties.length === 0) return [];

  const fuse = new Fuse(counterparties, {
    keys: ['display_name'],
    includeScore: true,
    threshold: FUZZY_THRESHOLD,
    ignoreLocation: true,
  });

  return fuse
    .search(normalised)
    .slice(0, limit)
    .map((result) => ({
      counterpartyId: result.item.id,
      displayName: result.item.display_name,
      // Fuse's score is a distance, so invert it into a confidence.
      score: 1 - (result.score ?? 1),
      source: 'fuzzy' as const,
    }));
}

/**
 * Suggests a category from rules the user has already confirmed.
 *
 * Deliberately not fuzzy: an import rule is an explicit "this description
 * always means this category" statement, and applying it approximately would
 * make it unpredictable. A rule either matches the normalised text or it
 * doesn't.
 */
export interface ImportRuleLike {
  match_text: string;
  category_id: string | null;
  counterparty_id: string | null;
}

export interface RuleSuggestion {
  categoryId: string | null;
  counterpartyId: string | null;
}

export function applyImportRules(rawDescription: string, rules: ImportRuleLike[]): RuleSuggestion | null {
  const normalised = normaliseDescription(rawDescription);
  if (normalised === '') return null;

  // Longest match wins, so a specific rule beats a general one.
  const matching = rules
    .filter((rule) => {
      const ruleText = normaliseDescription(rule.match_text);
      return ruleText !== '' && normalised.includes(ruleText);
    })
    .sort((a, b) => b.match_text.length - a.match_text.length);

  const best = matching[0];
  if (!best) return null;

  return { categoryId: best.category_id, counterpartyId: best.counterparty_id };
}
