// Groups the tenant's Log API sources (GET /monitoring/logs/sources) for the
// Logs source picker. Sandbox returned (2026-10-13): am-access, am-activity,
// am-authentication, am-config, am-core, am-everything, environment-access,
// idm-access, idm-activity, idm-authentication, idm-config, idm-core,
// idm-everything, idm-recon, idm-sync, iga-api, jas.

/** Used when the sources call fails (e.g. no network to the tenant). */
export const FALLBACK_LOG_SOURCES = [
    "am-access", "am-activity", "am-authentication", "am-config", "am-core", "am-everything",
    "idm-access", "idm-activity", "idm-authentication", "idm-config", "idm-core", "idm-everything",
    "idm-recon", "idm-sync",
];

export interface SourceGroup {
    label: string;
    /** `am-everything` / `idm-everything`, when the tenant has it. */
    everything?: string;
    sources: string[];
}

export function groupLogSources(all: string[]): SourceGroup[] {
    const groups: SourceGroup[] = [];
    const used = new Set<string>();
    for (const [prefix, label] of [["am-", "AM"], ["idm-", "IDM"]] as const) {
        const mine = all.filter((s) => s.startsWith(prefix)).sort();
        if (mine.length === 0) continue;
        mine.forEach((s) => used.add(s));
        const everything = mine.find((s) => s === `${prefix}everything`);
        groups.push({ label, everything, sources: mine.filter((s) => s !== everything) });
    }
    const other = all.filter((s) => !used.has(s)).sort();
    if (other.length > 0) groups.push({ label: "Other", sources: other });
    return groups;
}

/** Selected sources that `*-everything` (also selected) already includes — their entries show up twice. */
export function overlappingSources(selected: string[]): string[] {
    return selected.filter((s) =>
        (s.startsWith("am-") && s !== "am-everything" && selected.includes("am-everything"))
        || (s.startsWith("idm-") && s !== "idm-everything" && selected.includes("idm-everything")));
}
