import type { Metadata } from "next";
import "./globals.css";
import { BusyProvider } from "@/hooks/useBusyState";
import { NavBar } from "@/components/NavBar";
import { DialogProvider } from "@/components/ConfirmDialog";
import { GlobalJobBanner } from "@/components/GlobalJobBanner";
import { MonitorWarningBanner } from "@/components/MonitorWarningBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import { readInstalledInfo } from "@/lib/system-update";

// Resolves the theme before first paint so there is no light/dark flash:
// stored preference ("light" | "dark") wins, otherwise follow the OS.
// ThemeToggle keeps the attribute in sync afterwards.
const THEME_BOOTSTRAP = `(function(){try{var p=localStorage.getItem("pinghub.theme");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export const metadata: Metadata = {
  title: "Ping AIC Studio",
  description: "Ping Advanced Identity Cloud Configuration Pipeline UI",
};

// Every page reads per-request filesystem state (tenant configs, history,
// logs, git status). Opt the whole app out of static generation so pages
// re-render on each request in `next start`.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full bg-canvas text-ink antialiased flex flex-col">
        <BusyProvider>
          <DialogProvider>
            <NavBar />
            <GlobalJobBanner />
            <MonitorWarningBanner />
            <UpdateBanner />
            <main className="flex-1 px-4 sm:px-7 py-6 w-full max-w-[1760px] mx-auto">
              {children}
            </main>
            <footer className="mt-auto border-t border-line">
              <div className="max-w-[1760px] mx-auto px-4 sm:px-7 py-4 text-xs text-ink-3 flex items-center justify-between">
                <span>
                  &copy; {new Date().getFullYear()} <span className="font-semibold text-ink-2">Boston Identity</span>
                </span>
                <span className="font-mono">Ping AIC Studio v{readInstalledInfo().version}</span>
              </div>
            </footer>
          </DialogProvider>
        </BusyProvider>
      </body>
    </html>
  );
}
