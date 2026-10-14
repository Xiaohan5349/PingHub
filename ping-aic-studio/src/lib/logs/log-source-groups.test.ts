import { describe, expect, it } from "vitest";
import { groupLogSources, overlappingSources } from "./log-source-groups";

describe("groupLogSources", () => {
    it("splits AM / IDM / Other and pulls out *-everything", () => {
        const groups = groupLogSources(["jas", "idm-core", "am-everything", "am-core", "am-access", "idm-everything", "iga-api"]);
        expect(groups).toEqual([
            { label: "AM", everything: "am-everything", sources: ["am-access", "am-core"] },
            { label: "IDM", everything: "idm-everything", sources: ["idm-core"] },
            { label: "Other", sources: ["iga-api", "jas"] },
        ]);
    });

    it("omits empty groups", () => {
        expect(groupLogSources(["am-core"])).toEqual([{ label: "AM", everything: undefined, sources: ["am-core"] }]);
    });
});

describe("overlappingSources", () => {
    it("flags sources already covered by a selected *-everything", () => {
        expect(overlappingSources(["am-everything", "am-core", "idm-core", "jas"])).toEqual(["am-core"]);
        expect(overlappingSources(["am-core", "idm-core"])).toEqual([]);
    });
});
