"use client";

import { cn } from "@/lib/utils";
import type { EsvDisplayMode } from "@/lib/esv-decode";

interface Props {
  mode: EsvDisplayMode;
  onChange: (m: EsvDisplayMode) => void;
  className?: string;
}

/**
 * Two-segment pill toggling how ESV (variables / secrets) values render:
 *   • base64  — what's on disk
 *   • decoded — base64 decoded as UTF-8 and shown under a `value` field
 * Preference is shared across browse, compare, and dry-run via localStorage.
 */
export function EsvDisplayToggle({ mode, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "seg-sm",
        className,
      )}
      title="Toggle how ESV values are displayed"
    >
      {(["base64", "decoded"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn("seg-sm-item", mode === m && "seg-sm-item-active")}
        >
          {m === "base64" ? "Base64" : "Decoded"}
        </button>
      ))}
    </div>
  );
}
