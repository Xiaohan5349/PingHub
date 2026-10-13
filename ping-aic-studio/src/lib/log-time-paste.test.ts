import { describe, expect, it } from "vitest";
import { parsePastedTimestamp } from "./log-time-paste";

const iso = (d: Date | null) => d?.toISOString() ?? null;

describe("parsePastedTimestamp", () => {
    it("reads an AIC log timestamp and rounds to whole seconds", () => {
        expect(iso(parsePastedTimestamp("2026-10-13T02:08:30.383Z", "local", "floor"))).toBe("2026-10-13T02:08:30.000Z");
        expect(iso(parsePastedTimestamp("2026-10-13T02:08:30.383Z", "local", "ceil"))).toBe("2026-10-13T02:08:31.000Z");
        expect(iso(parsePastedTimestamp("2026-10-13T02:08:30Z", "local", "ceil"))).toBe("2026-10-13T02:08:30.000Z");
    });

    it("honours an explicit offset and strips surrounding quotes", () => {
        expect(iso(parsePastedTimestamp('"2026-10-13T04:08:30+02:00"', "local", "floor"))).toBe("2026-10-13T02:08:30.000Z");
    });

    it("reads epoch seconds and milliseconds", () => {
        expect(iso(parsePastedTimestamp("1791856110", "local", "floor"))).toBe("2026-10-13T01:48:30.000Z");
        expect(iso(parsePastedTimestamp("1791856110383", "local", "ceil"))).toBe("2026-10-13T01:48:31.000Z");
    });

    it("reads a zoneless time in the display zone", () => {
        expect(iso(parsePastedTimestamp("2026-10-13 02:08:30.383", "utc", "floor"))).toBe("2026-10-13T02:08:30.000Z");
        const local = parsePastedTimestamp("2026-10-13 02:08", "local", "floor");
        expect(local?.getHours()).toBe(2);
        expect(local?.getMinutes()).toBe(8);
    });

    it("returns null for text that is not a timestamp", () => {
        expect(parsePastedTimestamp("yesterday", "local", "floor")).toBeNull();
        expect(parsePastedTimestamp("2026-10-13", "local", "floor")).toBeNull();
        expect(parsePastedTimestamp("2026-13-45T99:99:99Z", "local", "floor")).toBeNull();
    });
});
