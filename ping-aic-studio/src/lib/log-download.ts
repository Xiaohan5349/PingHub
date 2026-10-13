// Builds log download files from the entries on the Logs page. Entries are the
// AIC Log API `result` items exactly as returned, so JSON / NDJSON output is
// the raw log response; "text" is the Terminal line rendering.

export type DownloadFormat = "json" | "ndjson" | "text";
export type DownloadScope =
    | { kind: "all" }
    | { kind: "pages"; from: number; to: number }; // 1-based, inclusive

export interface DownloadFile {
    name: string;
    content: string;
    mime: string;
}

const EXT: Record<DownloadFormat, string> = { json: "json", ndjson: "ndjson", text: "log" };
const MIME: Record<DownloadFormat, string> = { json: "application/json", ndjson: "application/x-ndjson", text: "text/plain" };

/** Entries in the scope; pages are `pageSize` long, page 1 = oldest. Out-of-range pages are clamped. */
export function selectEntries<T>(entries: T[], scope: DownloadScope, pageSize: number): T[] {
    if (scope.kind === "all") return entries;
    const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
    const from = Math.min(Math.max(1, Math.min(scope.from, scope.to)), totalPages);
    const to = Math.min(Math.max(1, Math.max(scope.from, scope.to)), totalPages);
    return entries.slice((from - 1) * pageSize, to * pageSize);
}

export function formatEntries<T>(entries: T[], format: DownloadFormat, toText: (e: T) => string): string {
    if (format === "json") return JSON.stringify(entries, null, 2);
    if (format === "ndjson") return entries.map((e) => JSON.stringify(e)).join("\n");
    return entries.map(toText).join("\n");
}

/**
 * One file per `splitSize` entries (`splitSize` <= 0 = a single file).
 * Split files are numbered `-part01-of03` so they sort in order.
 */
export function buildDownloadFiles<T>(
    entries: T[],
    opts: { format: DownloadFormat; splitSize: number; baseName: string; toText: (e: T) => string },
): DownloadFile[] {
    const { format, splitSize, baseName, toText } = opts;
    const ext = EXT[format];
    const mime = MIME[format];
    if (splitSize <= 0 || entries.length <= splitSize) {
        return [{ name: `${baseName}.${ext}`, content: formatEntries(entries, format, toText), mime }];
    }
    const count = Math.ceil(entries.length / splitSize);
    const width = Math.max(2, String(count).length);
    const files: DownloadFile[] = [];
    for (let i = 0; i < count; i++) {
        const part = String(i + 1).padStart(width, "0");
        files.push({
            name: `${baseName}-part${part}-of${String(count).padStart(width, "0")}.${ext}`,
            content: formatEntries(entries.slice(i * splitSize, (i + 1) * splitSize), format, toText),
            mime,
        });
    }
    return files;
}
