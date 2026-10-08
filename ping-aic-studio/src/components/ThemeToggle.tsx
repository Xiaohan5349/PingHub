"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const STORAGE_KEY = "pinghub.theme"; // also read by the pre-paint script in app/layout.tsx

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Light/dark switch. Until the user clicks it, the theme follows the OS
 * setting (live). A click flips to the other theme and remembers it, after
 * which the OS setting no longer applies.
 */
export function ThemeToggle() {
  // null until mounted: the server cannot know which theme the script chose.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (storedTheme()) return; // an explicit choice wins over the OS
      const next: Theme = mq.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    if (!theme) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked: applies to this page view only */ }
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-lg grid place-items-center text-ink-2 hover:text-ink hover:bg-hover transition-colors"
    >
      {theme === "dark" ? <Moon className="w-[18px] h-[18px]" /> : theme === "light" ? <Sun className="w-[18px] h-[18px]" /> : null}
    </button>
  );
}
