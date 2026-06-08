import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { EventTicker } from "@/components/shell/event-ticker";
import { CommandPalette } from "@/components/shell/command-palette";
import { CopilotDock } from "@/components/copilot/copilot-dock";
import { AppStateProvider } from "@/components/providers/app-state";
import { KillSwitchBanner } from "@/components/shell/kill-switch";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PANTHEON · Sovereign Finance OS", template: "%s · PANTHEON" },
  description:
    "PANTHEON — the AI-native finance OS. Multi-asset terminal, order-flow cockpit, alt-data signals, quant research, and institutional risk & execution, fused into one sovereign, point-in-time platform.",
  applicationName: "PANTHEON",
  keywords: ["finance terminal", "order flow", "risk", "quant", "alt-data", "backtesting", "AI copilot"],
  authors: [{ name: "PANTHEON" }],
  openGraph: { title: "PANTHEON · Sovereign Finance OS", description: "One terminal, every market, total intelligence.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#07090a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <AppStateProvider>
          <div className="flex h-screen w-full overflow-hidden">
            <div className="hidden lg:block">
              <Sidebar />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <EventTicker />
              <KillSwitchBanner />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">{children}</div>
              </main>
            </div>
          </div>
          <CommandPalette />
          <CopilotDock />
        </AppStateProvider>
      </body>
    </html>
  );
}
