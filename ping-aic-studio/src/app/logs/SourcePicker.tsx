"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { groupLogSources, overlappingSources } from "@/lib/logs/log-source-groups";

/** Log Source dropdown: the tenant's sources grouped AM / IDM / Other, multi-select. */
export function SourcePicker({
  sources,
  selected,
  onChange,
  disabled,
  loading,
}: {
  /** Sources the tenant offers (from /monitoring/logs/sources). */
  sources: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Keep selected sources the tenant doesn't list (yet) visible so they can be unticked.
  const groups = groupLogSources([...new Set([...sources, ...selected])]);
  const overlap = overlappingSources(selected);

  function toggle(s: string, on: boolean) {
    onChange(on ? [...selected, s] : selected.filter((x) => x !== s));
  }

  function box(s: string, label: string) {
    return (
      <label key={s} title={s} className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={selected.includes(s)}
          onChange={(e) => toggle(s, e.target.checked)}
          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className={cn("font-mono text-xs", overlap.includes(s) ? "text-amber-600" : "text-ink")}>{label}</span>
      </label>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={selected.join(", ")}
        className="flex items-center gap-2 h-9 px-3 max-w-[22rem] rounded-lg border border-slate-200 bg-white text-left outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={cn("font-mono text-xs truncate", selected.length === 0 && "text-ink-3")}>
          {selected.length === 0 ? "Select sources" : selected.join(", ")}
        </span>
        <svg className="w-3.5 h-3.5 shrink-0 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[28rem] rounded-lg border border-line-2 bg-tile shadow-lg p-3 space-y-3 text-xs">
          {groups.map((g) => (
            <div key={g.label} className="flex gap-3">
              <div className="label-xs w-10 shrink-0 pt-0.5">{g.label}</div>
              <div className="space-y-1.5 min-w-0">
                {g.everything && box(g.everything, g.everything)}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {g.sources.map((s) => box(s, g.label === "Other" ? s : s.replace(/^(am|idm)-/, "")))}
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-line text-ink-3 space-y-1">
            {loading && <div>Loading this tenant&apos;s sources…</div>}
            {overlap.length > 0 && (
              <div className="text-amber-600">
                {overlap.join(", ")} {overlap.length === 1 ? "is" : "are"} already in *-everything — those entries will show twice.
              </div>
            )}
            <div>Each source is a separate Log API call (Tail is limited to 60 requests/min).</div>
          </div>
        </div>
      )}
    </div>
  );
}
