import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp } from "lucide-react";
import type { Page } from "../App";
import { useLedgerBalances } from "../hooks/useLedgerBalances";
import { useTransactionHistory } from "../hooks/useQueries";
import { useTokenPrices } from "../hooks/useTokenPrices";
import RecentActivityTable from "./RecentActivityTable";
import SendReceiveCard from "./SendReceiveCard";

// Simple inline sparkline SVG
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label="Price sparkline"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mini chart (dark panel)
function MiniChart() {
  const data = [38, 41, 37, 43, 40, 45, 42, 46, 44, 48, 47, 52, 50, 54];
  const w = 260;
  const h = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPts = `0,${h} ${pts} ${w},${h}`;

  return (
    <svg
      role="img"
      aria-label="7-day performance chart"
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="oklch(0.57 0.18 258)"
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor="oklch(0.57 0.18 258)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#chartGrad)" />
      <polyline
        points={pts}
        fill="none"
        stroke="oklch(0.65 0.18 258)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICP_SPARKLINE = [8, 9, 8.5, 11, 10, 12, 11.5, 12.8];
const SHBY_SPARKLINE = [
  0.0006, 0.0007, 0.00065, 0.0008, 0.00075, 0.00082, 0.00084,
];

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const {
    data: transactions,
    isLoading: txLoading,
    refetch,
  } = useTransactionHistory();
  const {
    data: balanceData,
    isLoading: balancesLoading,
    refetch: refetchBalances,
  } = useLedgerBalances();
  const { data: prices } = useTokenPrices();

  const icpBalance = balanceData?.icpBalance ?? 0;
  const shbyBalance = balanceData?.shbyBalance ?? 0;

  const icpUsd = icpBalance * (prices?.icpUsd ?? 12.84);
  const shbyUsd = shbyBalance * (prices?.shbyUsd ?? 0.000824);
  const totalUsd = icpUsd + shbyUsd;

  const recentTxs = (transactions ?? []).slice(0, 5);

  function handleRefetch() {
    refetch();
    refetchBalances();
  }

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="dashboard.page">
      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Total Portfolio Value */}
          <Card className="border-border shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <Skeleton
                  className="h-9 w-36 mb-2"
                  data-ocid="dashboard.portfolio.loading_state"
                />
              ) : (
                <div className="text-3xl font-bold text-foreground">
                  $
                  {totalUsd.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.65 0.19 145)" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.65 0.19 145)" }}
                >
                  +5.24%
                </span>
                <span className="text-xs text-muted-foreground ml-1">24h</span>
              </div>
              <div
                className="mt-4 rounded-lg p-3"
                style={{ background: "oklch(0.14 0.03 240)" }}
              >
                <p className="text-xs text-white/40 mb-2">7-day performance</p>
                <MiniChart />
              </div>
            </CardContent>
          </Card>

          {/* Token Balances */}
          <Card className="border-border shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Token Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ICP Row */}
              <div className="flex items-center gap-3">
                <img
                  src="/assets/generated/icp-token-transparent.dim_48x48.png"
                  alt="ICP"
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">ICP</span>
                    <Sparkline
                      data={ICP_SPARKLINE}
                      color="oklch(0.55 0.22 270)"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {balancesLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {icpBalance.toFixed(4)}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      {balancesLoading ? (
                        <Skeleton className="h-4 w-12" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          ${icpUsd.toFixed(2)}
                        </span>
                      )}
                      <Badge
                        className="text-[10px] px-1 py-0 h-4"
                        style={{
                          background: "oklch(0.95 0.06 145)",
                          color: "oklch(0.4 0.15 145)",
                        }}
                      >
                        +3.2%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* SHBY Row */}
              <div className="flex items-center gap-3">
                <img
                  src="/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png"
                  alt="SHBY"
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">SHBY</span>
                    <Sparkline
                      data={SHBY_SPARKLINE}
                      color="oklch(0.72 0.15 65)"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {balancesLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {shbyBalance.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      {balancesLoading ? (
                        <Skeleton className="h-4 w-12" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          ${shbyUsd.toFixed(2)}
                        </span>
                      )}
                      <Badge
                        className="text-[10px] px-1 py-0 h-4"
                        style={{
                          background: "oklch(0.97 0.08 65)",
                          color: "oklch(0.5 0.15 65)",
                        }}
                      >
                        +8.1%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center column: Send/Receive */}
        <SendReceiveCard />

        {/* Right column: Recent Activity */}
        <Card className="border-border shadow-card">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Recent Activity
            </CardTitle>
            <Button
              data-ocid="dashboard.activity.refresh.button"
              variant="ghost"
              size="sm"
              onClick={handleRefetch}
              className="h-7 w-7 p-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${txLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div
                data-ocid="dashboard.activity.loading_state"
                className="py-8 flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentTxs.length === 0 ? (
              <div
                data-ocid="dashboard.activity.empty_state"
                className="py-8 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  No transactions yet
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate("send")}
                  className="text-xs text-primary mt-1 hover:underline"
                >
                  Make your first transfer
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTxs.map((tx, i) => (
                  <div
                    key={tx.id.toString()}
                    data-ocid={`dashboard.activity.item.${i + 1}`}
                    className="px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">
                          {tx.token}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tx.txType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(
                          Number(tx.timestamp) / 1_000_000,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold">{tx.amount}</p>
                      <span
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background:
                            tx.status === "Confirmed"
                              ? "oklch(0.95 0.06 145)"
                              : "oklch(0.96 0.04 60)",
                          color:
                            tx.status === "Confirmed"
                              ? "oklch(0.4 0.15 145)"
                              : "oklch(0.5 0.12 60)",
                        }}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lower row: Full activity table + Token Management */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <RecentActivityTable limit={10} />

        {/* Token Management mini */}
        <Card className="border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Token Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              data-ocid="dashboard.manage_tokens.button"
              onClick={() => onNavigate("assets")}
              className="w-full text-sm font-medium py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
            >
              Manage Tokens
            </button>
            <div className="space-y-2">
              {[
                {
                  symbol: "ICP",
                  name: "Internet Computer",
                  canister: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                  img: "/assets/generated/icp-token-transparent.dim_48x48.png",
                },
                {
                  symbol: "SHBY",
                  name: "ShotBuggy Token",
                  canister: "r4e4i-jiaaa-aaaaj-qrbwq-cai",
                  img: "/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png",
                },
              ].map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center gap-3 py-2"
                >
                  <img
                    src={token.img}
                    alt={token.symbol}
                    className="w-7 h-7 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {token.name}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "oklch(0.94 0.01 240)",
                      color: "oklch(0.45 0.02 240)",
                    }}
                  >
                    Active
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
