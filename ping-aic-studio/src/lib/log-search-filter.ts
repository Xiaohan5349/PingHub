import { parseQuery, type QueryOptions } from "./log-query";

/**
 * Pre-process the Search keywords box before passing to parseQuery.
 *
 * The boolean parser treats whitespace between barewords as implicit AND,
 * which is the right default for the Filter and Highlight boxes. For the
 * Search keywords box, however, users typically paste a phrase (e.g. an
 * error message or audit description) and expect it to match as-is. To make
 * that work without forcing them to add quotes, when the input contains no
 * boolean operators (`&&`, `||`, `,`), parens, or quotes, we wrap it as a
 * single quoted phrase so the parser sees one literal TERM.
 */
export function normalizeSearchKeywords(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const hasOperator =
    trimmed.includes("&&") ||
    trimmed.includes("||") ||
    /[,()"]/.test(trimmed);
  if (hasOperator) return trimmed;
  // Bareword phrase: escape backslashes (no quotes possible because of the
  // regex above) and wrap in double quotes.
  return `"${trimmed.replace(/\\/g, "\\\\")}"`;
}

function escapeFilterValue(v: string) { return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

/**
 * Build the server-side `_queryFilter` from the Search keywords box.
 *
 * Server-side filtering is a conservative OR over the query's positive leaf
 * terms; the client predicate still enforces && / () precisely. A query that
 * fails to parse returns `error` rather than an empty filter, so the caller
 * never falls back to downloading the whole time range unfiltered.
 */
export function buildSearchQueryFilter(
  raw: string,
  opts: QueryOptions,
): { queryFilter?: string; error?: string } {
  const parsed = parseQuery(normalizeSearchKeywords(raw), opts);
  if (parsed.error) return { error: `Search keywords: ${parsed.error}` };
  const terms = parsed.highlightTerms;
  if (terms.length === 0) return { queryFilter: undefined };
  return {
    queryFilter: terms.map((t) => {
      const v = escapeFilterValue(t);
      return `(/payload co "${v}") or (/payload/message co "${v}") or (/payload/eventName co "${v}")`;
    }).join(" or "),
  };
}
