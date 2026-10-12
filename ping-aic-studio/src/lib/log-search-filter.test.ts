import { describe, expect, it } from "vitest";
import { buildSearchQueryFilter } from "./log-search-filter";

const ci = { matchCase: false, wholeWord: false };

describe("buildSearchQueryFilter", () => {
    it("returns no filter for empty keywords", () => {
        expect(buildSearchQueryFilter("   ", ci)).toEqual({ queryFilter: undefined });
    });

    it("treats a bareword phrase as one term", () => {
        const { queryFilter, error } = buildSearchQueryFilter("user not found", ci);
        expect(error).toBeUndefined();
        expect(queryFilter).toBe(
            '(/payload co "user not found") or (/payload/message co "user not found") or (/payload/eventName co "user not found")',
        );
    });

    it("ORs the leaf terms of a boolean query", () => {
        const { queryFilter } = buildSearchQueryFilter("login && failed", ci);
        expect(queryFilter).toContain('(/payload co "login")');
        expect(queryFilter).toContain('(/payload co "failed")');
    });

    it("escapes quotes and backslashes", () => {
        const { queryFilter } = buildSearchQueryFilter('"a\\"b"', ci);
        expect(queryFilter).toContain('(/payload co "a\\"b")');
    });

    it("returns an error instead of an empty filter when the query does not parse", () => {
        const result = buildSearchQueryFilter("login && (failed", ci);
        expect(result.error).toBeTruthy();
        expect(result.queryFilter).toBeUndefined();
    });
});
