import { ShieldCheck } from "lucide-react";
import { useCallerPrincipal } from "../hooks/useQueries";

export default function HeroStrip() {
  const { data: principal } = useCallerPrincipal();

  const displayName = principal ? `${principal.slice(0, 8)}...` : "Wallet";

  return (
    <div
      className="w-full py-8 px-4 sm:px-6"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.12 0.04 240) 0%, oklch(0.18 0.05 250) 50%, oklch(0.14 0.03 255) 100%)",
      }}
    >
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-1">
            Welcome Back, {displayName}!
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "oklch(0.72 0.18 145)" }}
            >
              <ShieldCheck className="w-4 h-4" />
              Wallet Active
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/50 text-sm">
              Internet Computer Network
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div
            className="px-4 py-2 rounded-lg border text-sm font-medium"
            style={{
              background: "oklch(0.22 0.05 240 / 0.6)",
              borderColor: "oklch(0.4 0.08 240)",
              color: "oklch(0.85 0.04 240)",
            }}
          >
            <span className="text-white/50 text-xs block mb-0.5">
              Powered by
            </span>
            <span className="font-semibold">Internet Computer Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
