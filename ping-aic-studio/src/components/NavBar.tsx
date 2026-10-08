"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Activity, ChartColumn, ChevronDown, Database, FolderTree, GitBranch, GitCompare, History,
  LayoutGrid, RefreshCw, Search, Server, ShieldCheck, SquareTerminal, ArrowUpRight, Workflow,
  type LucideIcon,
} from "lucide-react";
import { useBusyState } from "@/hooks/useBusyState";
import { useWorkingEnv } from "@/hooks/useWorkingEnv";
import { useDialog } from "@/components/ConfirmDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Environment } from "@/lib/fr-config";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Pages grouped by workflow. A group with one item renders as a plain link;
// the others open a menu and show their pages as a second row of tabs.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    items: [{ href: "/", label: "Dashboard", description: "Manage your AIC configuration pipeline.", icon: LayoutGrid }],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/sync", label: "Sync", description: "Pull config from your tenants into this repo.", icon: RefreshCw },
      { href: "/compare", label: "Compare", description: "Diff config between environments or versions.", icon: GitCompare },
      { href: "/promote", label: "Promote", description: "Move verified config from source to target, safely.", icon: ArrowUpRight },
      { href: "/history", label: "History", description: "Every pull, push, promote and search, with logs.", icon: History },
    ],
  },
  {
    label: "Explore",
    items: [
      { href: "/configs", label: "Browse", description: "Explore the pulled configuration tree.", icon: FolderTree },
      { href: "/search", label: "Search", description: "Find code across scripts, endpoints and config.", icon: Search },
      { href: "/analyze", label: "Report", description: "Journey outcomes, failure nodes and ESV orphans.", icon: ChartColumn },
    ],
  },
  {
    label: "Observe",
    items: [
      { href: "/logs", label: "Logs", description: "Search and inspect tenant logs.", icon: SquareTerminal },
      { href: "/data", label: "Data", description: "Pull and browse managed object records.", icon: Database },
      { href: "/monitor", label: "Monitor", description: "Server, TLS and RCS health across tenants.", icon: Activity },
      { href: "/federation", label: "Federation", description: "SAML entity providers, metadata and certificates.", icon: ShieldCheck },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/environments", label: "Environments", description: "Tenants, service accounts and backups.", icon: Server },
      { href: "/settings", label: "Repo", description: "Git remote, commits and push scope.", icon: GitBranch },
    ],
  },
];

const COLOR_RING: Record<string, string> = {
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
  slate: "bg-slate-400",
};

function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavBar() {
  const { busy, dirty } = useBusyState();
  const warnOnLeave = busy || dirty;
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useDialog();
  const [workingEnv] = useWorkingEnv();
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  // How the open menu was opened. A click on a menu that hover just opened
  // must keep it open (touch taps fire an emulated hover first).
  const openedByClick = useRef(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetch("/api/environments").then((r) => r.ok ? r.json() : []).then(setEnvs).catch(() => { });
  }, []);

  // Close the menu on navigation, Escape, or a click outside the header.
  useEffect(() => { setOpenGroup(null); }, [pathname]);
  useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenGroup(null); };
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [openGroup]);

  const active = envs.find((e) => e.name === workingEnv);
  const dot = active ? COLOR_RING[active.color] ?? COLOR_RING.slate : "bg-slate-300";
  const currentGroup = NAV_GROUPS.find((g) => g.items.some((i) => isActiveHref(pathname, i.href)));

  const guardedClick = (href: string) =>
    warnOnLeave
      ? async (e: ReactMouseEvent) => {
        e.preventDefault();
        setOpenGroup(null);
        const ok = await confirm({
          title: "Leave this page? Progress will be lost.",
          message: "You have an operation in progress or unsaved task state. Navigating away will discard it.",
          confirmLabel: "Leave",
          variant: "warning",
        });
        if (ok) router.push(href);
      }
      : undefined;

  const hoverOpen = (label: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (openGroup !== label) openedByClick.current = false;
    setOpenGroup(label);
  };
  const clickToggle = (label: string) => {
    if (openGroup === label && openedByClick.current) {
      setOpenGroup(null);
      return;
    }
    openedByClick.current = true;
    setOpenGroup(label);
  };
  const hoverClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenGroup(null), 140);
  };

  return (
    <header ref={headerRef} className="bg-canvas border-b border-line sticky top-0 z-50">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-7">
        <div className="flex items-center gap-3 sm:gap-6 h-[58px]">
          <Link href="/" onClick={guardedClick("/")} className="flex items-center gap-2.5 shrink-0 font-semibold text-[15px] tracking-tight text-ink">
            <span className="w-[30px] h-[30px] rounded-[9px] bg-accent text-on-accent grid place-items-center">
              <Workflow className="w-4 h-4" strokeWidth={2.2} />
            </span>
            <span className="hidden lg:inline">Ping AIC Studio</span>
          </Link>

          <nav className="flex items-center gap-0.5 min-w-0 overflow-x-auto sm:overflow-visible scrollbar-hidden" aria-label="Main">
            {NAV_GROUPS.map((group) => {
              const isCurrent = group === currentGroup;
              const groupBtn = cn(
                "flex items-center gap-1 h-[34px] px-2.5 sm:px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                isCurrent
                  ? "bg-tile text-ink ring-1 ring-inset ring-line-2"
                  : "text-ink-2 hover:text-ink hover:bg-hover",
              );
              if (group.items.length === 1) {
                const item = group.items[0];
                return (
                  <Link key={group.label} href={item.href} onClick={guardedClick(item.href)} className={groupBtn}>
                    {item.label}
                  </Link>
                );
              }
              const isOpen = openGroup === group.label;
              return (
                <div
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => hoverOpen(group.label)}
                  onMouseLeave={hoverClose}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    onClick={() => clickToggle(group.label)}
                    className={cn(groupBtn, isOpen && !isCurrent && "bg-hover text-ink")}
                  >
                    {group.label}
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>
                  {isOpen && (
                    <div className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-[54px] sm:top-[42px] z-50 grid sm:grid-cols-2 gap-0.5 p-2 rounded-[18px] bg-tile ring-1 ring-inset ring-line-2 shadow-[var(--popover-shadow)] sm:w-[544px]">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const on = isActiveHref(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={guardedClick(item.href)}
                            className={cn(
                              "grid grid-cols-[34px_1fr] gap-x-2.5 items-start p-2.5 rounded-xl text-ink",
                              on ? "bg-accent-weak" : "hover:bg-hover",
                            )}
                          >
                            <span className={cn(
                              "row-span-2 w-[34px] h-[34px] rounded-lg bg-inset ring-1 ring-inset ring-line grid place-items-center",
                              on ? "text-accent" : "text-ink-2",
                            )}>
                              <Icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className="text-sm font-semibold">{item.label}</span>
                            <span className="text-[12.5px] leading-snug text-ink-3">{item.description}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {active && (
              <div className="flex items-center gap-2 h-9 px-3.5 rounded-full bg-tile ring-1 ring-inset ring-line text-[13px]">
                <span className={cn("w-2 h-2 rounded-full", dot)} />
                <span className="hidden md:inline text-ink-2">Working env</span>
                <span className="font-semibold text-ink">{active.label}</span>
              </div>
            )}
          </div>
        </div>

        {currentGroup && currentGroup.items.length > 1 && (
          <nav className="flex items-center gap-1 pb-2.5 overflow-x-auto" aria-label={currentGroup.label}>
            {currentGroup.items.map((item) => {
              const Icon = item.icon;
              const on = isActiveHref(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={guardedClick(item.href)}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13.5px] whitespace-nowrap transition-colors",
                    on
                      ? "bg-tile text-ink font-semibold ring-1 ring-inset ring-line-2"
                      : "text-ink-2 font-medium hover:text-ink hover:bg-hover",
                  )}
                >
                  <Icon className={cn("w-[15px] h-[15px]", on && "text-accent")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
