"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

/** What the user chose. "system" = follow the OS light/dark setting. */
export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pinghub.theme"; // also read by the pre-paint script in app/layout.tsx

/**
 * Decide which preference a click on the toggle moves to.
 *
 * @param current      the preference in effect before the click
 * @param systemIsDark whether the OS is currently in dark mode
 * @returns            the preference to switch to
 */
export function nextThemePreference(current: ThemePreference, systemIsDark: boolean): ThemePreference {
  // TODO(user): choose the click behaviour — see the note in the restyle hand-off.
  void systemIsDark;
  return current;
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePreference) {
  const resolved: ResolvedTheme = pref === "system" ? (systemDark() ? "dark" : "light") : pref;
  document.documentElement.dataset.theme = resolved;
  try {
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch { /* storage blocked: theme still applies for this page view */ }
}

const LABEL: Record<ThemePreference, string> = {
  system: "Theme: follow system",
  light: "Theme: light",
  dark: "Theme: dark",
};

export function ThemeToggle() {
  // null until mounted: the server cannot know the stored preference.
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => { setPref(readPreference()); }, []);

  // While following the system, track OS changes live.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const onClick = useCallback(() => {
    if (!pref) return;
    const next = nextThemePreference(pref, systemDark());
    apply(next);
    setPref(next);
  }, [pref]);

  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;
  const label = LABEL[pref ?? "system"];
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-lg grid place-items-center text-ink-2 hover:text-ink hover:bg-hover transition-colors"
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}
