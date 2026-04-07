import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLedgerBalances } from "../hooks/useLedgerBalances";
import { useTokenPrices } from "../hooks/useTokenPrices";

const TOKEN_META = [
  {
    symbol: "ICP",
    name: "Internet Computer Protocol",
    canister: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    img: "/assets/generated/icp-token-transparent.dim_48x48.png",
    change24h: "+3.2%",
    positive: true,
    color: "oklch(0.55 0.22 270)",
    bgColor: "oklch(0.93 0.04 270)",
    textColor: "oklch(0.4 0.18 270)",
    description:
      "The native token of the Internet Computer blockchain. Used for governance, cycles, and transfers.",
    explorer: "https://dashboard.internetcomputer.org/",
  },
  {
    symbol: "SHBY",
    name: "ShotBuggy Token",
    canister: "r4e4i-jiaaa-aaaaj-qrbwq-cai",
    img: "/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png",
    change24h: "+8.1%",
    positive: true,
    color: "oklch(0.72 0.15 65)",
    bgColor: "oklch(0.96 0.06 65)",
    textColor: "oklch(0.48 0.13 65)",
    description:
      "The SHBY community token on the Internet Computer. Deployed on canister r4e4i-jiaaa-aaaaj-qrbwq-cai.",
    explorer:
      "https://dashboard.internetcomputer.org/canister/r4e4i-jiaaa-aaaaj-qrbwq-cai",
  },
];

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success("Canister ID copied!");
}

export default function AssetsPage() {
  const { icpBalance, shbyBalance, isLoading } = useLedgerBalancesFlat();
  const { data: prices, isLoading: pricesLoading } = useTokenPrices();

  const icpUsd = prices?.icpUsd ?? 12.84;
  const shbyUsd = prices?.shbyUsd ?? 0.000824;

  const tokenPrices: Record<string, number> = {
    ICP: icpUsd,
    SHBY: shbyUsd,
  };

  const balances: Record<string, number> = {
    ICP: icpBalance ?? 0,
    SHBY: shbyBalance ?? 0,
  };

  return (
    <div className="animate-fade-in" data-ocid="assets.page">
      <h2 className="text-xl font-display font-bold mb-5">
        Assets &amp; Token Management
      </h2>

      <div className="grid gap-4">
        {TOKEN_META.map((token, i) => {
          const balance = balances[token.symbol];
          const usdPrice = tokenPrices[token.symbol];
          const usdValue = balance * usdPrice;
          return (
            <Card
              key={token.symbol}
              data-ocid={`assets.token.${i + 1}`}
              className="border-border shadow-card"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <img
                    src={token.img}
                    alt={token.symbol}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg font-bold">
                        {token.symbol}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {token.name}
                      </span>
                      <Badge
                        className="text-[10px] px-2 py-0.5"
                        style={{
                          background: token.bgColor,
                          color: token.textColor,
                          border: "none",
                        }}
                      >
                        {token.change24h} 24h
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {token.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mb-1" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {balance.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    )}
                    {isLoading || pricesLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        $
                        {usdValue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "oklch(0.96 0.008 240)" }}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Canister ID
                    </p>
                    <p className="text-xs font-mono text-foreground truncate">
                      {token.canister}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      data-ocid={`assets.token.copy.${i + 1}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyToClipboard(token.canister)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <a
                      href={token.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        data-ocid={`assets.token.explorer.${i + 1}`}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: "oklch(0.96 0.008 240)" }}
                  >
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    {pricesLoading ? (
                      <Skeleton className="h-5 w-16 mx-auto" />
                    ) : (
                      <p className="text-sm font-bold">
                        $
                        {usdPrice < 0.01
                          ? usdPrice.toFixed(6)
                          : usdPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: "oklch(0.96 0.008 240)" }}
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      Balance
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-16 mx-auto" />
                    ) : (
                      <p className="text-sm font-bold">
                        {balance.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: "oklch(0.96 0.008 240)" }}
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      Value USD
                    </p>
                    {isLoading || pricesLoading ? (
                      <Skeleton className="h-5 w-14 mx-auto" />
                    ) : (
                      <p className="text-sm font-bold">
                        ${usdValue.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function useLedgerBalancesFlat() {
  const result = useLedgerBalances();
  return {
    icpBalance: result.data?.icpBalance ?? null,
    shbyBalance: result.data?.shbyBalance ?? null,
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}
