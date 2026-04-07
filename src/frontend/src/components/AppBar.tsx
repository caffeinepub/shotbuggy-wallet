import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCallerPrincipal } from "../hooks/useQueries";
import type { Theme } from "../hooks/useTheme";

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "send", label: "Send/Receive" },
  { id: "swap", label: "Swap" },
  { id: "activity", label: "Activity" },
  { id: "assets", label: "Assets" },
  { id: "settings", label: "Settings" },
];

interface AppBarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isConnected: boolean;
  theme: Theme;
  onToggleTheme: () => void;
}

function truncatePrincipal(principal: string | null | undefined): string {
  if (!principal) return "";
  if (principal.length <= 16) return principal;
  return `${principal.slice(0, 8)}...${principal.slice(-4)}`;
}

export default function AppBar({
  activePage,
  onNavigate,
  isConnected,
  theme,
  onToggleTheme,
}: AppBarProps) {
  const { login, clear, isLoggingIn } = useInternetIdentity();
  const { data: principal } = useCallerPrincipal();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.11 0.03 240) 0%, oklch(0.16 0.04 245) 100%)",
        borderBottom: "1px solid oklch(0.25 0.04 240)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src="/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png"
              alt="ShotBuggy logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="text-white font-display font-700 text-lg tracking-tight">
            ShotBuggy
          </span>
        </div>

        {/* Desktop Nav */}
        {isConnected && (
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.id}
                data-ocid={`nav.${item.id}.link`}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activePage === item.id
                    ? "bg-primary/20 text-primary"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex-1 md:flex-none" />

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            type="button"
            data-ocid="nav.theme_toggle.button"
            onClick={onToggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[10px] bg-primary/30 text-primary">
                    {principal ? principal.slice(0, 2).toUpperCase() : "W"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white/80 text-xs font-mono">
                  {truncatePrincipal(principal)}
                </span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </div>
              <Button
                data-ocid="nav.disconnect.button"
                variant="outline"
                size="sm"
                onClick={clear}
                className="hidden sm:flex border-white/20 text-white/70 hover:bg-white/10 hover:text-white bg-transparent text-xs"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              data-ocid="nav.connect_wallet.button"
              size="sm"
              onClick={login}
              disabled={isLoggingIn}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-sm"
            >
              {isLoggingIn ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}

          {/* Mobile menu toggle */}
          {isConnected && (
            <button
              type="button"
              className="md:hidden text-white/70 p-1"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {isConnected && mobileOpen && (
        <nav className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              data-ocid={`nav.mobile.${item.id}.link`}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activePage === item.id
                  ? "bg-primary/20 text-primary"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-white/10 mt-1">
            <Button
              data-ocid="nav.mobile.disconnect.button"
              variant="outline"
              size="sm"
              onClick={clear}
              className="w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white bg-transparent text-xs"
            >
              Disconnect
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
