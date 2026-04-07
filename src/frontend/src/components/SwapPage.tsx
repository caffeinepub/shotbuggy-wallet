import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useICPSwap } from "../hooks/useICPSwap";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLedgerBalances } from "../hooks/useLedgerBalances";
import { useRecordTransaction } from "../hooks/useQueries";
import { useTokenPrices } from "../hooks/useTokenPrices";

const ICP_IMG = "/assets/generated/icp-token-transparent.dim_48x48.png";
const SHBY_IMG = "/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png";

type TokenSymbol = "ICP" | "SHBY";

interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  img: string;
  canisterId: string;
}

const TOKENS: Record<TokenSymbol, TokenConfig> = {
  ICP: {
    symbol: "ICP",
    name: "Internet Computer",
    img: ICP_IMG,
    canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  },
  SHBY: {
    symbol: "SHBY",
    name: "ShotBuggy Token",
    img: SHBY_IMG,
    canisterId: "r4e4i-jiaaa-aaaaj-qrbwq-cai",
  },
};

const SLIPPAGE = 0.005; // 0.5%

function formatAmount(value: number, decimals = 4): string {
  if (value === 0) return "0";
  if (value < 0.0001) return value.toExponential(2);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatE8s(e8s: bigint, decimals = 4): string {
  return formatAmount(Number(e8s) / 1e8, decimals);
}

function TokenBadge({ token }: { token: TokenConfig }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={token.img}
        alt={token.symbol}
        className="w-7 h-7 rounded-full object-contain bg-background ring-1 ring-border"
      />
      <div>
        <div className="text-sm font-semibold text-foreground leading-none">
          {token.symbol}
        </div>
        <div className="text-[11px] text-muted-foreground leading-none mt-0.5">
          {token.name}
        </div>
      </div>
    </div>
  );
}

const STEP_LABELS: Record<string, string> = {
  transferring: "Transferring...",
  depositing: "Depositing...",
  swapping: "Swapping...",
  withdrawing: "Withdrawing...",
};

export default function SwapPage() {
  const [fromToken, setFromToken] = useState<TokenSymbol>("ICP");
  const [fromAmount, setFromAmount] = useState("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastSwapOutput, setLastSwapOutput] = useState<bigint | null>(null);

  const { identity } = useInternetIdentity();
  const { isFetching: isActorLoading } = useActor();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const { data: balances, refetch: refetchBalances } = useLedgerBalances();
  const { data: prices } = useTokenPrices();
  const recordTx = useRecordTransaction();
  const {
    pool,
    isPoolLoading,
    poolError,
    getQuote,
    executeSwap,
    isSwapping,
    swapStep,
  } = useICPSwap();

  const icpUsd = prices?.icpUsd ?? 12.84;
  const shbyUsd = prices?.shbyUsd ?? 0.000824;

  const toToken: TokenSymbol = fromToken === "ICP" ? "SHBY" : "ICP";
  const from = TOKENS[fromToken];
  const to = TOKENS[toToken];

  const fromBalance =
    fromToken === "ICP"
      ? (balances?.icpBalance ?? 0)
      : (balances?.shbyBalance ?? 0);
  const toBalance =
    toToken === "ICP"
      ? (balances?.icpBalance ?? 0)
      : (balances?.shbyBalance ?? 0);

  const parsedFrom = Number.parseFloat(fromAmount) || 0;

  // Debounce quote requests by 500ms
  const [debouncedAmount, setDebouncedAmount] = useState(parsedFrom);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedAmount(parsedFrom);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [parsedFrom]);

  // Determine zeroForOne based on current swap direction
  const zeroForOne =
    pool !== null
      ? fromToken === "ICP"
        ? pool.zeroForOne // ICP→SHBY direction
        : !pool.zeroForOne // SHBY→ICP direction (reversed)
      : true;

  // Live quote from ICPSwap pool
  const amountInE8s = BigInt(Math.round(debouncedAmount * 1e8));
  const quoteQuery = useQuery<bigint>({
    queryKey: [
      "icpswap-quote",
      pool?.canisterId,
      zeroForOne,
      amountInE8s.toString(),
    ],
    queryFn: async () => {
      if (!pool || amountInE8s <= BigInt(0)) return BigInt(0);
      return getQuote(pool.canisterId, zeroForOne, amountInE8s);
    },
    enabled: !!pool && amountInE8s > BigInt(0),
    staleTime: 10_000,
    retry: 1,
  });

  const quotedOutputE8s = quoteQuery.data ?? BigInt(0);
  const toAmount = Number(quotedOutputE8s) / 1e8;
  const amountOutMinimum = toAmount * (1 - SLIPPAGE);

  // Fallback rate from prices when no quote available yet
  const ICP_TO_SHBY = icpUsd / shbyUsd;
  const SHBY_TO_ICP = shbyUsd / icpUsd;
  const fallbackToAmount =
    fromToken === "ICP" ? parsedFrom * ICP_TO_SHBY : parsedFrom * SHBY_TO_ICP;

  const displayToAmount = quoteQuery.isFetching
    ? null
    : quoteQuery.data !== undefined && debouncedAmount > 0
      ? toAmount
      : parsedFrom > 0
        ? fallbackToAmount
        : 0;

  // Prefer live quote rate; fallback to price-based
  const rateFromQuote =
    quotedOutputE8s > BigInt(0) && debouncedAmount > 0
      ? toAmount / debouncedAmount
      : null;

  const rateDisplay =
    rateFromQuote !== null
      ? fromToken === "ICP"
        ? `1 ICP \u2248 ${formatAmount(rateFromQuote, 0)} SHBY`
        : `1 SHBY \u2248 ${formatAmount(rateFromQuote, 8)} ICP`
      : fromToken === "ICP"
        ? `1 ICP \u2248 ${formatAmount(ICP_TO_SHBY, 0)} SHBY`
        : `1 SHBY \u2248 ${formatAmount(SHBY_TO_ICP, 8)} ICP`;

  const rateUSD =
    fromToken === "ICP"
      ? `($${icpUsd.toFixed(2)} / $${shbyUsd.toFixed(6)})`
      : `($${shbyUsd.toFixed(6)} / $${icpUsd.toFixed(2)})`;

  const rateSource =
    rateFromQuote !== null ? "ICPSwap live quote" : "CoinGecko prices";

  function handleFlip() {
    setIsFlipping(true);
    setFromAmount("");
    setLastSwapOutput(null);
    setFromToken((prev) => (prev === "ICP" ? "SHBY" : "ICP"));
    setTimeout(() => setIsFlipping(false), 300);
  }

  function handleMaxFrom() {
    setFromAmount(fromBalance > 0 ? fromBalance.toString() : "");
  }

  const handleConfirmSwap = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      toast.error("Please log in with Internet Identity to swap tokens.");
      return;
    }
    if (!parsedFrom || parsedFrom <= 0) {
      toast.error("Enter a valid amount to swap.");
      return;
    }
    if (parsedFrom > fromBalance) {
      toast.error(`Insufficient ${fromToken} balance.`);
      return;
    }
    if (!pool) {
      toast.error("No ICP/SHBY pool found on ICPSwap.");
      return;
    }

    try {
      const outputE8s = await executeSwap({
        identity,
        fromToken,
        amountIn: parsedFrom,
        amountOutMinimum,
        poolCanisterId: pool.canisterId,
        zeroForOne,
      });

      setLastSwapOutput(outputE8s);
      const outputHuman = Number(outputE8s) / 1e8;

      // Record in app activity log (non-critical)
      try {
        await recordTx.mutateAsync({
          txType: "Swap",
          token: fromToken,
          amount: parsedFrom.toString(),
          counterparty: pool.canisterId,
          status: "Confirmed",
          memo: `Swap ${formatAmount(parsedFrom, 4)} ${fromToken} \u2192 ${formatAmount(outputHuman, 4)} ${toToken} via ICPSwap`,
        });
      } catch (_logErr) {
        // Non-critical: don't fail the whole swap if activity logging fails
      }

      toast.success(
        `Swapped ${formatAmount(parsedFrom, 4)} ${fromToken} \u2192 ${formatAmount(outputHuman, 4)} ${toToken} (on-chain via ICPSwap)`,
        { duration: 6000 },
      );

      setFromAmount("");
      refetchBalances();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      if (
        message.includes("Insufficient funds") ||
        message.includes("insufficient")
      ) {
        toast.error(
          "Insufficient funds. Check your balance and try a smaller amount.",
        );
      } else if (
        message.includes("Slippage") ||
        message.includes("slippage") ||
        message.includes("minimum")
      ) {
        toast.error(
          "Slippage exceeded \u2014 try increasing tolerance or reducing amount.",
        );
      } else if (
        message.includes("Unauthorized") ||
        message.includes("anonymous")
      ) {
        toast.error("Authentication required. Please log in and try again.");
      } else if (message.includes("Not connected")) {
        toast.error(
          "Wallet not connected. Please wait a moment and try again.",
        );
      } else {
        toast.error(`Swap failed: ${message}`);
      }
    }
  }, [
    isAuthenticated,
    identity,
    parsedFrom,
    fromBalance,
    fromToken,
    toToken,
    pool,
    zeroForOne,
    amountOutMinimum,
    executeSwap,
    recordTx,
    refetchBalances,
  ]);

  const isLoading = isSwapping || isActorLoading;
  const canSwap =
    isAuthenticated &&
    parsedFrom > 0 &&
    parsedFrom <= fromBalance &&
    !!pool &&
    !isPoolLoading;

  const swapButtonLabel = () => {
    if (isSwapping && swapStep) return STEP_LABELS[swapStep] ?? "Processing...";
    if (isSwapping) return "Processing...";
    if (!isAuthenticated) return "Log in to Swap";
    if (isPoolLoading) return "Finding pool...";
    if (!pool && !isPoolLoading) return "No pool available";
    if (parsedFrom > 0) {
      const outStr =
        displayToAmount !== null
          ? formatAmount(displayToAmount, fromToken === "ICP" ? 0 : 6)
          : "...";
      return `Confirm Swap \u00b7 ${formatAmount(parsedFrom, 4)} ${fromToken} \u2192 ${outStr} ${toToken}`;
    }
    return "Confirm Swap";
  };

  return (
    <motion.div
      className="max-w-lg mx-auto"
      data-ocid="swap.page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page heading */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-display font-bold">Swap Tokens</h2>
        <Badge
          variant="secondary"
          className="flex items-center gap-1 text-xs font-medium"
        >
          <Zap className="w-3 h-3" />
          ICPSwap DEX
        </Badge>
      </div>

      {/* Auth warning */}
      {!isAuthenticated && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          You must be logged in with Internet Identity to use the swap feature.
        </div>
      )}

      {/* Pool loading indicator */}
      {isAuthenticated && isPoolLoading && (
        <div
          data-ocid="swap.pool.loading_state"
          className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Finding ICP/SHBY pool on ICPSwap...
        </div>
      )}

      {/* No pool found */}
      {isAuthenticated && !isPoolLoading && pool === null && (
        <div
          data-ocid="swap.pool.error_state"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          No ICP/SHBY pool found on ICPSwap. Swaps are currently unavailable.
          {poolError && (
            <span className="block text-xs mt-1 opacity-70">
              {poolError instanceof Error
                ? poolError.message
                : String(poolError)}
            </span>
          )}
        </div>
      )}

      {/* Pool found indicator */}
      {pool && !isPoolLoading && (
        <div
          data-ocid="swap.pool.success_state"
          className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pool found — real on-chain swaps enabled</span>
          </div>
          <a
            href="https://app.icpswap.com/swap"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
            ICPSwap <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <Card className="border-border shadow-card overflow-visible">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Token Exchange
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* FROM */}
          <div
            className="rounded-xl border border-border bg-muted/40 p-4 space-y-3"
            data-ocid="swap.from.panel"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                From
              </Label>
              <button
                type="button"
                onClick={handleMaxFrom}
                data-ocid="swap.max_from.button"
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Balance: {formatAmount(fromBalance, 4)} {fromToken}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <TokenBadge token={from} />
              </div>
              <div className="flex-1">
                <Input
                  data-ocid="swap.from_amount.input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary h-auto pb-1"
                />
              </div>
            </div>
          </div>

          {/* FLIP BUTTON */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              type="button"
              data-ocid="swap.flip.button"
              onClick={handleFlip}
              aria-label="Flip swap direction"
              className={`w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all duration-300 ${
                isFlipping ? "rotate-180 scale-95" : "rotate-0 scale-100"
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* TO */}
          <div
            className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
            data-ocid="swap.to.panel"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                To (estimated)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Balance: {formatAmount(toBalance, 4)} {toToken}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <TokenBadge token={to} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-foreground/80 py-1 border-b border-border/50 min-h-[28px] flex items-center">
                  {quoteQuery.isFetching && parsedFrom > 0 ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : displayToAmount !== null && displayToAmount > 0 ? (
                    formatAmount(displayToAmount, fromToken === "ICP" ? 0 : 6)
                  ) : (
                    <span className="text-muted-foreground/50">0.00</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Last swap result */}
          {lastSwapOutput !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400"
              data-ocid="swap.success_state"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                Last swap received:{" "}
                <strong>
                  {formatE8s(lastSwapOutput, 4)} {toToken}
                </strong>
              </span>
            </motion.div>
          )}

          {/* RATE INFO */}
          <div className="rounded-lg bg-muted/30 border border-border/50 px-4 py-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Exchange rate
              </span>
              <span className="font-medium text-foreground">{rateDisplay}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">USD prices</span>
              <span className="text-muted-foreground/70">{rateUSD}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Rate source</span>
              <span className="text-muted-foreground/70">{rateSource}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Slippage tolerance</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                0.5%
              </Badge>
            </div>
          </div>

          {/* CTA */}
          <Button
            data-ocid="swap.confirm.button"
            className="w-full mt-1 font-semibold text-sm"
            size="lg"
            onClick={handleConfirmSwap}
            disabled={!canSwap || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {swapButtonLabel()}
              </>
            ) : (
              swapButtonLabel()
            )}
          </Button>

          {/* Disclaimer */}
          <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
            Powered by ICPSwap DEX. Real on-chain swap.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
