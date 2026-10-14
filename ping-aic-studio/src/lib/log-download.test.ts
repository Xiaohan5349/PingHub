import { describe, expect, it } from "vitest";
import { buildDownloadFiles, formatEntries, selectEntries } from "./log-download";

const nums = Array.from({ length: 10 }, (_, i) => i + 1);

describe("selectEntries", () => {
    it("returns everything for scope all", () => {
        expect(selectEntries(nums, { kind: "all" }, 3)).toEqual(nums);
    });

    it("returns an inclusive page range (page 1 = oldest)", () => {
        expect(selectEntries(nums, { kind: "pages", from: 2, to: 3 }, 3)).toEqual([4, 5, 6, 7, 8, 9]);
        expect(selectEntries(nums, { kind: "pages", from: 4, to: 4 }, 3)).toEqual([10]);
    });

    it("clamps out-of-range and swapped pages", () => {
        expect(selectEntries(nums, { kind: "pages", from: 9, to: 0 }, 3)).toEqual(nums);
    });
});

describe("formatEntries", () => {
    const entries = [{ payload: { a: 1 }, source: "am-core" }, { payload: "line", source: "idm-core" }];

    it("writes raw entries as a JSON array or one per line", () => {
        expect(JSON.parse(formatEntries(entries, "json", String))).toEqual(entries);
        expect(formatEntries(entries, "ndjson", String)).toBe(
            '{"payload":{"a":1},"source":"am-core"}\n{"payload":"line","source":"idm-core"}',
        );
    });

    it("uses the text renderer for text", () => {
        expect(formatEntries(entries, "text", (e) => e.source)).toBe("am-core\nidm-core");
    });
});

describe("buildDownloadFiles", () => {
    it("makes one file when not splitting", () => {
        const files = buildDownloadFiles(nums, { format: "ndjson", splitSize: 0, baseName: "logs", toText: String });
        expect(files.map((f) => f.name)).toEqual(["logs.ndjson"]);
        expect(files[0].content.split("\n")).toHaveLength(10);
    });

    it("splits into numbered parts", () => {
        const files = buildDownloadFiles(nums, { format: "text", splitSize: 4, baseName: "logs", toText: String });
        expect(files.map((f) => f.name)).toEqual(["logs-part01-of03.log", "logs-part02-of03.log", "logs-part03-of03.log"]);
        expect(files[2].content).toBe("9\n10");
        expect(files[0].mime).toBe("text/plain");
    });
});
