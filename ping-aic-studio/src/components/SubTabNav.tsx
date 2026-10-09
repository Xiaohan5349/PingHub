// src/components/SubTabNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SubTab {
  href: string;
  label: string;
}

// "tabs"      — subtle underlined text tabs (default).
// "segmented" — a prominent segmented control with clearly button-like
//               controls; use when the sub-tabs are primary actions that
//               should stand out (e.g. the Data tab's Browse / Pull).
export type SubTabVariant = "tabs" | "segmented";

export function SubTabNav({
  tabs,
  variant = "tabs",
}: {
  tabs: SubTab[];
  variant?: SubTabVariant;
}) {
  const pathname = usePathname();

  // Both variants render the shared segmented control; "segmented" keeps
  // its historical extra bottom margin for the Data tab.
  return (
    <nav className={cn("seg", variant === "segmented" ? "mb-4" : "mb-3")}>
      {tabs.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn("seg-item", isActive && "seg-item-active")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
