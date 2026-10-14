"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildDownloadFiles, selectEntries, type DownloadFormat, type DownloadScope } from "@/lib/log-download";

type RangeKind = "page" | "all" | "pages";

const FORMATS: { value: DownloadFormat; label: string; title: string }[] = [
  { value: "json", label: "JSON", title: "Raw AIC log entries as a JSON array" },
  { value: "ndjson", label: "NDJSON", title: "Raw AIC log entries, one JSON object per line" },
  { value: "text", label: "Text", title: "Lines as shown in the Terminal view" },
];

function saveFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download button + panel for the Logs toolbar. Works on the entries the page
 * currently shows (after Level / Search loaded / Dedupe); pages are the Table
 * pages (`pageSize` each, page 1 = oldest).
 */
export function DownloadMenu<T>({
  entries,
  pageSize,
  currentPage,
  baseName,
  toText,
}: {
  entries: T[];
  pageSize: number;
  currentPage: number;
  /** File name without extension, e.g. `logs-am-core-20261013T020830`. */
  baseName: () => string;
  toText: (e: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<RangeKind>("all");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [format, setFormat] = useState<DownloadFormat>("json");
  const [split, setSplit] = useState(false);
  const [splitSize, setSplitSize] = useState("10000");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const fromN = Number(from);
  const toN = Number(to);
  const rangeInvalid = range === "pages" && !(
    Number.isInteger(fromN) && Number.isInteger(toN) && fromN >= 1 && toN >= fromN && toN <= totalPages
  );
  const splitN = Number(splitSize);
  const splitInvalid = split && !(Number.isInteger(splitN) && splitN >= 1);

  const scope: DownloadScope =
    range === "all" ? { kind: "all" }
      : range === "page" ? { kind: "pages", from: currentPage, to: currentPage }
        : { kind: "pages", from: fromN, to: toN };
  const selected = rangeInvalid ? [] : selectEntries(entries, scope, pageSize);
  const fileCount = split && !splitInvalid ? Math.max(1, Math.ceil(selected.length / splitN)) : 1;

  function download() {
    const suffix = range === "page" ? `-p${currentPage}` : range === "pages" ? `-p${fromN}-${toN}` : "";
    const files = buildDownloadFiles(selected, {
      format,
      splitSize: split ? splitN : 0,
      baseName: `${baseName()}${suffix}`,
      toText,
    });
    // Browsers drop clicks fired in the same tick; space them out.
    files.forEach((f, i) => setTimeout(() => saveFile(f.name, f.content, f.mime), i * 300));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          if (!open) { setFrom(String(currentPage)); setTo(String(currentPage)); }
          setOpen((o) => !o);
        }}
        className={cn("text-xs transition-colors", open ? "text-ink" : "text-slate-400 hover:text-slate-600")}
        title="Download logs as JSON, NDJSON or text"
      >
        Download ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-lg border border-line-2 bg-tile shadow-lg p-3 space-y-3 text-xs">
          <div className="space-y-1.5">
            <div className="label-xs">Range</div>
            <div className="seg-sm">
              {([["page", `Page ${currentPage}`], ["all", "All"], ["pages", "Pages…"]] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setRange(v)} className={cn("seg-sm-item", range === v && "seg-sm-item-active")}>
                  {label}
                </button>
              ))}
            </div>
            {range === "pages" && (
              <div className="flex items-center gap-1.5 text-ink-2">
                <input
                  type="number" min={1} max={totalPages} value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={cn("w-16 rounded border px-2 py-0.5 tabular-nums focus:outline-none focus:ring-1", rangeInvalid ? "border-rose-400 focus:ring-rose-400" : "border-slate-300 focus:ring-sky-500")}
                />
                <span>to</span>
                <input
                  type="number" min={1} max={totalPages} value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={cn("w-16 rounded border px-2 py-0.5 tabular-nums focus:outline-none focus:ring-1", rangeInvalid ? "border-rose-400 focus:ring-rose-400" : "border-slate-300 focus:ring-sky-500")}
                />
                <span className="text-ink-3">of {totalPages}</span>
              </div>
            )}
            <div className="text-ink-3">{pageSize} entries per page (the Table page size), page 1 = oldest.</div>
          </div>

          <div className="space-y-1.5">
            <div className="label-xs">Format</div>
            <div className="seg-sm">
              {FORMATS.map((f) => (
                <button key={f.value} type="button" title={f.title} onClick={() => setFormat(f.value)} className={cn("seg-sm-item", format === f.value && "seg-sm-item-active")}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-ink-2 cursor-pointer">
            <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} className="rounded border-slate-300" />
            Split every
            <input
              type="number" min={1} value={splitSize} disabled={!split}
              onChange={(e) => setSplitSize(e.target.value)}
              className={cn("w-20 rounded border px-2 py-0.5 tabular-nums focus:outline-none focus:ring-1 disabled:opacity-50", splitInvalid ? "border-rose-400 focus:ring-rose-400" : "border-slate-300 focus:ring-sky-500")}
            />
            entries
          </label>

          {fileCount > 1 && (
            <div className="text-ink-3">The browser may ask once to allow multiple downloads.</div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-line">
            <span className="text-ink-3 tabular-nums">
              {selected.length.toLocaleString("en-US")} entries · {fileCount} file{fileCount !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={download}
              disabled={rangeInvalid || splitInvalid || selected.length === 0}
              className="btn-primary !px-3 !py-1 !text-xs"
            >
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
