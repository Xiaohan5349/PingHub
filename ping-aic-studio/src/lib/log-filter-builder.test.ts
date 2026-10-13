import { describe, expect, it } from "vitest";
import { appendClause, buildClause, flattenPayload, operatorsFor } from "./log-filter-builder";

describe("flattenPayload", () => {
    it("treats a plaintext payload as the single field /payload", () => {
        expect(flattenPayload("SEVERE: boom")).toEqual([
            { path: "/payload", value: "SEVERE: boom", type: "string" },
        ]);
    });

    it("flattens nested objects into JSON-pointer leaf paths", () => {
        expect(flattenPayload({ eventName: "X", response: { elapsedTime: 12, ok: true } })).toEqual([
            { path: "/payload/eventName", value: "X", type: "string" },
            { path: "/payload/response/elapsedTime", value: "12", type: "number" },
            { path: "/payload/response/ok", value: "true", type: "boolean" },
        ]);
    });

    it("walks arrays without indexes, one row per element", () => {
        // AIC matches a pointer through an array against any element
        // (e.g. /payload/entries/info/nodeType in the docs).
        expect(flattenPayload({ principal: ["a", "b"], entries: [{ info: { nodeType: "N" } }] })).toEqual([
            { path: "/payload/principal", value: "a", type: "string" },
            { path: "/payload/principal", value: "b", type: "string" },
            { path: "/payload/entries/info/nodeType", value: "N", type: "string" },
        ]);
    });

    it("skips null leaves and escapes ~ and / in keys", () => {
        expect(flattenPayload({ gone: null, "a/b~c": "v" })).toEqual([
            { path: "/payload/a~1b~0c", value: "v", type: "string" },
        ]);
    });
});

describe("operatorsFor", () => {
    it("offers ordering operators only for numbers", () => {
        expect(operatorsFor("string")).toEqual(["eq", "co", "sw", "pr"]);
        expect(operatorsFor("number")).toEqual(["eq", "gt", "ge", "lt", "le", "pr"]);
        expect(operatorsFor("boolean")).toEqual(["eq", "pr"]);
    });
});

describe("buildClause", () => {
    it("quotes and escapes string values", () => {
        expect(buildClause({ path: "/payload/message", op: "co", value: 'say "hi" \\ bye', type: "string", negate: false }))
            .toBe('/payload/message co "say \\"hi\\" \\\\ bye"');
    });

    it("leaves numbers and booleans unquoted", () => {
        expect(buildClause({ path: "/payload/response/elapsedTime", op: "gt", value: "100", type: "number", negate: false }))
            .toBe("/payload/response/elapsedTime gt 100");
        expect(buildClause({ path: "/payload/ok", op: "eq", value: "true", type: "boolean", negate: false }))
            .toBe("/payload/ok eq true");
    });

    it("drops the value for pr", () => {
        expect(buildClause({ path: "/payload/userId", op: "pr", value: "ignored", type: "string", negate: false }))
            .toBe("/payload/userId pr");
    });

    it("wraps a negated clause in !( )", () => {
        expect(buildClause({ path: "/payload/eventName", op: "eq", value: "X", type: "string", negate: true }))
            .toBe('!(/payload/eventName eq "X")');
    });
});

describe("appendClause", () => {
    it("returns the clause alone when the filter is empty", () => {
        expect(appendClause("   ", "C", "and")).toBe("C");
    });

    it("joins plainly when precedence is not at risk", () => {
        expect(appendClause("A and B", "C", "and")).toBe("A and B and C");
        expect(appendClause("A or B", "C", "or")).toBe("A or B or C");
        expect(appendClause("A and B", "C", "or")).toBe("A and B or C");
    });

    it("wraps a top-level or before and-ing, so it reads (A or B) and C", () => {
        expect(appendClause("A or B", "C", "and")).toBe("(A or B) and C");
        expect(appendClause("A or(B)", "C", "and")).toBe("(A or(B)) and C");
        expect(appendClause("A or !(B)", "C", "and")).toBe("(A or !(B)) and C");
    });

    it("ignores or inside parentheses and quoted strings", () => {
        expect(appendClause("(A or B) and D", "C", "and")).toBe("(A or B) and D and C");
        expect(appendClause('/payload/message co "this or that"', "C", "and"))
            .toBe('/payload/message co "this or that" and C');
        expect(appendClause('/payload/message co "a \\" or b"', "C", "and"))
            .toBe('/payload/message co "a \\" or b" and C');
    });

    it("trims surrounding whitespace from the existing filter", () => {
        expect(appendClause("  A  ", "C", "and")).toBe("A and C");
    });
});
