import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import ActivityPage from "./components/ActivityPage";
import AppBar from "./components/AppBar";
import AssetsPage from "./components/AssetsPage";
import DashboardPage from "./components/DashboardPage";
import Footer from "./components/Footer";
import HeroStrip from "./components/HeroStrip";
import LoginHero from "./components/LoginHero";
import SendReceivePage from "./components/SendReceivePage";
import SettingsPage from "./components/SettingsPage";
import SwapPage from "./components/SwapPage";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useTheme } from "./hooks/useTheme";

export type Page =
  | "dashboard"
  | "send"
  | "swap"
  | "activity"
  | "assets"
  | "settings";

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const { identity, isInitializing } = useInternetIdentity();
  const isConnected = !!identity;
  const { theme, toggleTheme } = useTheme();

  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.14 0.03 240)" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-sm">Loading ShotBuggy Wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" />
      <AppBar
        activePage={activePage}
        onNavigate={setActivePage}
        isConnected={isConnected}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {isConnected ? (
        <>
          <HeroStrip />
          <main className="flex-1 py-6">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
              {activePage === "dashboard" && (
                <DashboardPage onNavigate={setActivePage} />
              )}
              {activePage === "send" && <SendReceivePage />}
              {activePage === "swap" && <SwapPage />}
              {activePage === "activity" && <ActivityPage />}
              {activePage === "assets" && <AssetsPage />}
              {activePage === "settings" && (
                <SettingsPage theme={theme} onToggleTheme={toggleTheme} />
              )}
            </div>
          </main>
        </>
      ) : (
        <main className="flex-1">
          <LoginHero />
        </main>
      )}
      <Footer />
    </div>
  );
}
