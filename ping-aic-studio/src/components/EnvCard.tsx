import { cn } from "@/lib/utils";
import { ScopesBadge } from "@/components/LastPullModal";
import { HealthBadge } from "@/components/ui/HealthBadge";
import type { Environment } from "@/lib/fr-config";
import type { ReleaseCacheEntry } from "@/lib/release/types";
import type { HealthCacheEntry } from "@/lib/health/types";
import { classifyUpgrade, daysUntil } from "@/lib/release/urgency";

export type EnvHealth = "healthy" | "stale" | "locked" | "error";

export interface EnvCardProps {
  env: Environment & { baseUrl?: string };
  health: EnvHealth;
  /** Raw tenant-health probe result for tooltip / latency display. */
  healthInfo?: HealthCacheEntry | null;
  lastPull: { at: string; status: "success" | "failed"; scopes?: string[] } | null;
  lastPush: { at: string; status: "success" | "failed"; scopes?: string[] } | null;
  release?: ReleaseCacheEntry | null;
  onClick?: () => void;
  className?: string;
}

const DOT: Record<string, string> = {
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
  slate: "bg-slate-400",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function EnvCard({ env, health, healthInfo, lastPull, lastPush, release, onClick, className }: EnvCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        "card p-5 text-left transition-colors hover:border-line-2",
        onClick && "cursor-pointer",
        health === "error" && "border-rose-200",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-2 h-2 rounded-full shrink-0", DOT[env.color] ?? DOT.slate)} />
            <span className="font-semibold text-base text-ink truncate">{env.label}</span>
            <span className="font-mono text-xs text-ink-3 shrink-0">{env.name}</span>
          </div>
          {env.baseUrl && (
            <div className="mt-1 text-xs text-ink-3 font-mono truncate" title={env.baseUrl}>{env.baseUrl}</div>
          )}
        </div>
        <HealthBadge state={health} info={healthInfo} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <div className="rounded-lg bg-inset ring-1 ring-inset ring-line px-3 py-2.5 min-w-0">
          <div className="text-xs text-ink-3">Last pull</div>
          <div className={cn("font-semibold text-sm mt-0.5", lastPull?.status === "failed" ? "text-rose-600" : "text-ink")}>
            {lastPull ? timeAgo(lastPull.at) : "—"}
          </div>
          {lastPull && lastPull.scopes && lastPull.scopes.length > 0 && (
            <div className="text-xs truncate">
              <ScopesBadge env={env.name} scopes={lastPull.scopes} timestamp={lastPull.at} />
            </div>
          )}
        </div>
        <div className="rounded-lg bg-inset ring-1 ring-inset ring-line px-3 py-2.5 min-w-0">
          <div className="text-xs text-ink-3">Last push</div>
          <div className={cn("font-semibold text-sm mt-0.5", lastPush?.status === "failed" ? "text-rose-600" : "text-ink")}>
            {lastPush ? `${timeAgo(lastPush.at)}${lastPush.status === "failed" ? ", failed" : ""}` : "—"}
          </div>
          {lastPush && lastPush.scopes && lastPush.scopes.length > 0 && (
            <div
              className="text-xs text-ink-2 truncate"
              title={lastPush.scopes.join(", ")}
            >
              {lastPush.scopes.length} scope{lastPush.scopes.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
      {release !== undefined && <ReleaseStrip release={release} />}
    </div>
  );
}

function ReleaseStrip({ release }: { release: ReleaseCacheEntry | null }) {
  if (!release) {
    return (
      <div className="mt-3 text-xs text-ink-3">
        Version unknown — refresh to fetch
      </div>
    );
  }
  if (release.error || !release.info) {
    const msg = release.error ?? "unknown error";
    // Shape/parse warnings (server reachable but payload didn't match)
    // are amber, not red — the tenant is up, just unexpected.
    const isWarning = /unexpected release shape|missing\/invalid|invalid release/i.test(msg);
    return (
      <div
        className={cn(
          "mt-3 text-xs truncate",
          isWarning ? "text-amber-700" : "text-rose-600",
        )}
        title={msg}
      >
        release {isWarning ? "warning" : "fetch failed"}: {msg}
      </div>
    );
  }
  const { channel, currentVersion, nextUpgrade } = release.info;
  const urgency = classifyUpgrade(nextUpgrade);
  const days = daysUntil(nextUpgrade);
  const plannedDate = nextUpgrade ? formatPlannedDate(nextUpgrade) : null;
  const urgencyBadge =
    urgency === "overdue" ? (
      <span className="text-rose-600 font-medium" title={nextUpgrade ?? undefined}>
        overdue{days !== null ? ` by ${Math.abs(days)}d` : ""}
        {plannedDate && <span className="ml-1 font-normal opacity-75">(planned {plannedDate})</span>}
      </span>
    )
      : urgency === "soon" ? (
        <span className="text-amber-700 font-medium" title={nextUpgrade ?? undefined}>
          upgrade in {days}d
          {plannedDate && <span className="ml-1 font-normal opacity-75">({plannedDate})</span>}
        </span>
      )
        : urgency === "later" ? (
          <span className="text-ink-2" title={nextUpgrade ?? undefined}>
            upgrade in {days}d
            {plannedDate && <span className="ml-1 opacity-75">({plannedDate})</span>}
          </span>
        )
          : <span className="text-ink-3">no upgrade scheduled</span>;
  return (
    <div className="mt-3 text-[12.5px] flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-mono text-ink truncate" title={currentVersion}>v{currentVersion}</span>
        <span className={cn(
          "inline-block px-2 rounded-md font-mono text-[11.5px] ring-1 ring-inset",
          channel === "rapid"
            ? "text-indigo-600 ring-indigo-400"
            : "text-ink-2 ring-line-2",
        )}>
          {channel}
        </span>
      </div>
      <div className="text-right">{urgencyBadge}</div>
    </div>
  );
}

function formatPlannedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


