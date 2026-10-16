/**
 * Deterministic checks that run on every model output before a person sees it. They are the reason a pill
 * cannot quietly absorb a hallucination: a claim with no source sentence, a number the source never states, or a
 * rule id that does not exist is dropped and listed, never repaired by guessing.
 */

const NUM = /\d+(?:[.,]\d+)?/g;

export function numbersIn(s: string): string[] {
  return (s.match(NUM) ?? []).map((n) => n.replace(",", "."));
}

/** Every number in `claim` must appear in at least one of `sources`. Rule and sentence ids are not counted as numbers. */
export function unsupportedNumbers(claim: string, sources: string[]): string[] {
  const cleaned = claim.replace(/\b[RGQF]-?\d{1,3}\b/g, "").replace(/[A-Z0-9-]+:S\d+/g, "");
  const pool = new Set(sources.flatMap(numbersIn));
  return [...new Set(numbersIn(cleaned))].filter((n) => !pool.has(n));
}

export function missingIds(ids: string[], allowed: Set<string>): string[] {
  return ids.filter((i) => !allowed.has(i));
}
