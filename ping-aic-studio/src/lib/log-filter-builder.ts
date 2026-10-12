// Helpers for building an AIC Log API `_queryFilter` (CREST filter syntax) by
// picking fields from a displayed log entry.
//
// Verified against a tenant's /monitoring/logs:
// - eq / co / sw / pr and `!( )` work; string matching is case-insensitive.
// - gt / ge / lt / le work on numeric fields only — on strings AIC returns 500,
//   so they're offered for numbers only and numbers are sent unquoted.
// - `/payload co "x"` only matches plaintext payloads; JSON payloads need a
//   field path, which is why the builder works from flattened leaf paths.

export type FieldType = "string" | "number" | "boolean";
export type FilterOp = "eq" | "co" | "sw" | "gt" | "ge" | "lt" | "le" | "pr";

export interface PayloadField {
    /** JSON pointer from the log entry root, e.g. `/payload/response/status`. */
    path: string;
    /** Leaf value as display text. */
    value: string;
    type: FieldType;
}

function escapePointerToken(key: string): string {
    return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Flatten a log entry's payload into leaf fields. Arrays are walked without
 * indexes because AIC matches a pointer through an array against any element.
 * Null leaves are skipped — there's no value to compare against.
 */
export function flattenPayload(payload: unknown): PayloadField[] {
    const out: PayloadField[] = [];
    const walk = (v: unknown, path: string) => {
        if (v === null || v === undefined) return;
        if (Array.isArray(v)) { for (const item of v) walk(item, path); return; }
        if (typeof v === "object") {
            for (const [k, child] of Object.entries(v)) walk(child, `${path}/${escapePointerToken(k)}`);
            return;
        }
        if (typeof v === "number" || typeof v === "boolean") {
            out.push({ path, value: String(v), type: typeof v as FieldType });
            return;
        }
        out.push({ path, value: String(v), type: "string" });
    };
    walk(payload, "/payload");
    return out;
}

export function operatorsFor(type: FieldType): FilterOp[] {
    if (type === "number") return ["eq", "gt", "ge", "lt", "le", "pr"];
    if (type === "boolean") return ["eq", "pr"];
    return ["eq", "co", "sw", "pr"];
}

export function buildClause(c: { path: string; op: FilterOp; value: string; type: FieldType; negate: boolean }): string {
    let clause: string;
    if (c.op === "pr") {
        clause = `${c.path} pr`;
    } else {
        const literal = c.type === "string"
            ? `"${c.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
            : c.value.trim();
        clause = `${c.path} ${c.op} ${literal}`;
    }
    return c.negate ? `!(${clause})` : clause;
}

/** True if `filter` has an `or` outside any parentheses or quoted string. */
function hasTopLevelOr(filter: string): boolean {
    let depth = 0;
    let inString = false;
    for (let i = 0; i < filter.length; i++) {
        const ch = filter[i];
        if (inString) {
            if (ch === "\\") i++;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (depth === 0 && /\s/.test(ch) && /^\s+or[\s(!]/.test(filter.slice(i))) return true;
    }
    return false;
}

/**
 * Append a clause to an existing filter. `and` binds tighter than `or`, so
 * and-ing onto a filter with a top-level `or` wraps it first: `(A or B) and C`.
 */
export function appendClause(existing: string, clause: string, join: "and" | "or"): string {
    const base = existing.trim();
    if (!base) return clause;
    if (join === "and" && hasTopLevelOr(base)) return `(${base}) and ${clause}`;
    return `${base} ${join} ${clause}`;
}
