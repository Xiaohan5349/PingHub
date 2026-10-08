import Link from "next/link";
import { getEnvironments } from "@/lib/fr-config";
import { readHistoryMerged } from "@/lib/op-history";
import type { HistoryRecord } from "@/lib/op-history";
import { EnvCard, type EnvHealth } from "@/components/EnvCard";
import { readReleaseInfo } from "@/lib/release/persistence";
import { classifyUpgrade, daysUntil } from "@/lib/release/urgency";
import type { ReleaseCacheEntry } from "@/lib/release/types";
import { triggerStaleRefreshAsync } from "@/lib/release/auto-refresh";
import { triggerStaleHealthRefreshAsync } from "@/lib/health/auto-refresh";
import { readHealthInfo } from "@/lib/health/persistence";
import type { HealthCacheEntry } from "@/lib/health/types";

// Always render fresh on each request — the env list / health / release caches
// can change underneath us (import, refresh, manual edits) and Next must not
// serve a stale RSC payload.
export const dynamic = "force-dynamic";

const DASHBOARD_BANNER_SOON_DAYS = 7;

function deriveHealth(
  health: HealthCacheEntry | null,
  lastPull: HistoryRecord | null,
  lastPush: HistoryRecord | null,
): EnvHealth {
  // Tenant reachability is the primary signal.
  if (health?.status === "unhealthy") return "error";
  if (!health) return "stale";
  // When the tenant is healthy, surface a sync-status warning if the most
  // recent operation failed — distinct from tenant being down.
  if (lastPull?.status === "failed" || lastPush?.status === "failed") return "error";
  return "healthy";
}

export default function DashboardPage() {
  triggerStaleRefreshAsync();
  triggerStaleHealthRefreshAsync();
  const environments = getEnvironments();
  const history = readHistoryMerged({ limit: 500 }).filter((r) => r.type !== "log-search");

  const envCards = environments.map((env) => {
    const lastPull = history.find((r) => r.type === "pull" && r.environment === env.name) ?? null;
    const lastPush = history.find((r) => r.type === "push" && r.environment === env.name) ?? null;
    const health = readHealthInfo(env.name);
    return {
      env,
      health: deriveHealth(health, lastPull, lastPush),
      healthInfo: health,
      lastPull: lastPull && { at: lastPull.completedAt, status: lastPull.status, scopes: lastPull.scopes },
      lastPush: lastPush && { at: lastPush.completedAt, status: lastPush.status, scopes: lastPush.scopes },
      release: readReleaseInfo(env.name),
    };
  });

  const upcomingUpgrades: UpgradeItem[] = envCards.flatMap(({ env, release }) => {
    const nextUpgrade = release?.info?.nextUpgrade ?? null;
    const urgency = classifyUpgrade(nextUpgrade, undefined, { soonDays: DASHBOARD_BANNER_SOON_DAYS });
    if (urgency !== "soon" && urgency !== "overdue") return [];
    return [{ env, release, urgency, days: daysUntil(nextUpgrade) }];
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="page-title">Dashboard</h1>
        <p className="section-subtitle mt-1">
          Manage your Ping Advanced Identity Cloud configuration pipeline.
        </p>
      </header>

      {envCards.length === 0 ? (
        <div className="card-padded text-center text-sm text-ink-2">
          No environments configured.{" "}
          <Link href="/environments" className="text-accent hover:underline">Add one</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 grid-flow-row-dense">
          <PipelineTile
            stages={envCards.map(({ env, health, healthInfo }) => ({ env, health, latencyMs: healthInfo?.latencyMs }))}
            className={upcomingUpgrades.length > 0 ? "md:col-span-4" : "md:col-span-4 xl:col-span-6"}
          />
          {upcomingUpgrades.length > 0 && (
            <UpcomingUpgradesTile items={upcomingUpgrades} className="md:col-span-4 xl:col-span-2 xl:row-span-2" />
          )}
          {envCards.map(({ env, health, healthInfo, lastPull, lastPush, release }) => (
            <EnvCard
              key={env.name}
              env={env}
              health={health}
              healthInfo={healthInfo}
              lastPull={lastPull ?? null}
              lastPush={lastPush ?? null}
              release={release as ReleaseCacheEntry | null}
              className="md:col-span-2"
            />
          ))}
        </div>
      )}
    </div>
  );
}

const HEALTH_WORD: Record<EnvHealth, { label: string; tone: string }> = {
  healthy: { label: "healthy", tone: "text-emerald-600" },
  stale: { label: "checking…", tone: "text-amber-600" },
  locked: { label: "locked", tone: "text-rose-600" },
  error: { label: "unhealthy", tone: "text-rose-600" },
};

const STAGE_DOT: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-slate-400",
};

/** Environments in configured (pipeline) order with their tenant health. */
function PipelineTile({
  stages,
  className,
}: {
  stages: { env: { name: string; label: string; color: string }; health: EnvHealth; latencyMs?: number }[];
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="tile-caption">environments / pipeline order</h2>
        <Link href="/environments" className="text-sm text-accent hover:underline">Manage →</Link>
      </div>
      <ol className="mt-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
        {stages.map(({ env, health, latencyMs }, i) => (
          <li key={env.name} className="contents">
            {i > 0 && (
              <span aria-hidden className="hidden md:block shrink-0 w-10 mx-1.5 h-px bg-line-3 relative after:absolute after:-right-px after:-top-[4px] after:border-[4.5px] after:border-transparent after:border-l-[7px] after:border-l-line-3" />
            )}
            <div className="flex-1 min-w-0 rounded-xl bg-tile-2 ring-1 ring-inset ring-line px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-[15px] text-ink truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT[env.color] ?? STAGE_DOT.slate}`} />
                {env.label}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[12.5px]">
                <span className={HEALTH_WORD[health].tone}>{HEALTH_WORD[health].label}</span>
                {typeof latencyMs === "number" && <span className="font-mono text-ink-2">{latencyMs} ms</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface UpgradeItem {
  env: { name: string; label: string };
  release: ReleaseCacheEntry | null;
  urgency: "soon" | "overdue";
  days: number | null;
}

/** Most urgent upgrade as the page's one big number; any others listed below it. */
function UpcomingUpgradesTile({ items, className }: { items: UpgradeItem[]; className?: string }) {
  const sorted = [...items].sort((a, b) =>
    a.urgency !== b.urgency ? (a.urgency === "overdue" ? -1 : 1) : (a.days ?? 0) - (b.days ?? 0),
  );
  const [first, ...rest] = sorted;
  const overdue = first.urgency === "overdue";
  const tone = overdue ? "text-rose-600" : "text-amber-600";
  return (
    <section className={`card p-5 flex flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="tile-caption">upcoming aic upgrade{items.length > 1 ? "s" : ""}</h2>
        <span className={overdue ? "pill-danger" : "pill-warning"}>{overdue ? "overdue" : "soon"}</span>
      </div>
      <div className={`mt-5 flex items-baseline gap-2 ${tone}`}>
        <span className="text-[72px] font-semibold tracking-tight leading-none">
          {first.days !== null ? Math.abs(first.days) : "—"}
        </span>
        <span className="text-lg font-semibold text-ink-2">
          {first.days === null ? (overdue ? "overdue" : "soon") : `day${Math.abs(first.days) === 1 ? "" : "s"}${overdue ? " overdue" : ""}`}
        </span>
      </div>
      <UpgradeFacts item={first} />
      {rest.length > 0 && (
        <ul className="mt-4 pt-3 border-t border-line space-y-2">
          {rest.map((x) => (
            <li key={x.env.name} className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-ink font-medium truncate">
                {x.env.label}
                {x.env.name !== x.env.label && <span className="font-mono text-xs text-ink-3"> {x.env.name}</span>}
              </span>
              <span className={x.urgency === "overdue" ? "text-rose-600" : "text-amber-600"}>
                {x.urgency === "overdue"
                  ? x.days !== null ? `overdue by ${Math.abs(x.days)}d` : "overdue"
                  : x.days !== null ? `in ${x.days}d` : "soon"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpgradeFacts({ item }: { item: UpgradeItem }) {
  const planned = item.release?.info?.nextUpgrade;
  const current = item.release?.info?.currentVersion;
  return (
    <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      <dt className="text-ink-3">Environment</dt>
      <dd className="text-ink font-medium">
        {item.env.label}
        {item.env.name !== item.env.label && <span className="font-mono text-ink-3"> {item.env.name}</span>}
      </dd>
      {planned && (
        <>
          <dt className="text-ink-3">Planned</dt>
          <dd className="text-ink font-medium" title={planned}>{formatPlannedDate(planned)}</dd>
        </>
      )}
      {current && (
        <>
          <dt className="text-ink-3">Version</dt>
          <dd className="font-mono text-ink">v{current} → ?</dd>
        </>
      )}
    </dl>
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
