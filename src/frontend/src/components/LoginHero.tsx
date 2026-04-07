import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Wallet, Zap } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginHero() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.11 0.03 240) 0%, oklch(0.17 0.05 250) 50%, oklch(0.13 0.04 260) 100%)",
      }}
    >
      {/* Logo mark */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
        style={{
          background: "oklch(0.57 0.18 258 / 0.15)",
          border: "1px solid oklch(0.57 0.18 258 / 0.3)",
        }}
      >
        <Wallet
          className="w-10 h-10"
          style={{ color: "oklch(0.7 0.18 258)" }}
        />
      </div>

      <h1 className="text-4xl md:text-5xl font-display font-bold text-white text-center mb-4">
        ShotBuggy Wallet
      </h1>
      <p className="text-white/50 text-center text-lg max-w-md mb-10">
        Send and receive ICP and SHBY tokens securely on the Internet Computer.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        {[
          { icon: Shield, label: "Internet Identity" },
          { icon: Zap, label: "Instant Transfers" },
          { icon: Wallet, label: "Multi-Token" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              background: "oklch(0.22 0.05 240 / 0.5)",
              border: "1px solid oklch(0.35 0.06 240)",
              color: "oklch(0.80 0.04 240)",
            }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: "oklch(0.65 0.18 258)" }}
            />
            {label}
          </div>
        ))}
      </div>

      <Button
        data-ocid="login.connect_wallet.button"
        size="lg"
        onClick={login}
        disabled={isLoggingIn}
        className="bg-primary hover:bg-primary/90 text-white font-semibold text-base px-8 py-6 rounded-xl"
      >
        {isLoggingIn ? (
          "Connecting..."
        ) : (
          <>
            Connect Wallet
            <ArrowRight className="ml-2 w-5 h-5" />
          </>
        )}
      </Button>
      <p className="text-white/30 text-xs mt-4">
        Secure login via Internet Identity
      </p>
    </div>
  );
}
