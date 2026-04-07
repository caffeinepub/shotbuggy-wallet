import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useTransactionHistory } from "../hooks/useQueries";

interface RecentActivityTableProps {
  limit?: number;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  if (ms <= 0) return "—";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export default function RecentActivityTable({
  limit,
}: RecentActivityTableProps) {
  const { data: transactions, isLoading, refetch } = useTransactionHistory();
  const txs = limit
    ? (transactions ?? []).slice(0, limit)
    : (transactions ?? []);

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          {limit ? "Recent Activity" : "Transaction History"}
        </CardTitle>
        <Button
          data-ocid="activity.refresh.button"
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-7 w-7 p-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div
            data-ocid="activity.loading_state"
            className="py-12 flex flex-col items-center justify-center gap-3"
          >
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading transactions...
            </p>
          </div>
        ) : txs.length === 0 ? (
          <div data-ocid="activity.empty_state" className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No transactions found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Send or receive tokens to see activity here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="activity.table">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Token</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Counterparty
                  </TableHead>
                  <TableHead className="text-xs font-semibold w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((tx, i) => (
                  <TableRow
                    key={tx.id.toString()}
                    data-ocid={`activity.row.${i + 1}`}
                    className="border-border text-sm hover:bg-muted/30"
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(tx.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <img
                          src={
                            tx.token === "SHBY"
                              ? "/assets/shby-019d6551-e049-714f-b3bf-3ef058287ba8.png"
                              : "/assets/generated/icp-token-transparent.dim_48x48.png"
                          }
                          alt={tx.token}
                          className="w-4 h-4 rounded-full"
                        />
                        <span className="text-xs font-semibold">
                          {tx.token}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color:
                            tx.txType === "Send"
                              ? "oklch(0.5 0.15 25)"
                              : "oklch(0.4 0.15 145)",
                        }}
                      >
                        {tx.txType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium">
                      {tx.txType === "Send" ? "-" : "+"}
                      {tx.amount} {tx.token}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="text-[10px] px-2 py-0.5 font-medium"
                        style={{
                          background:
                            tx.status === "Confirmed"
                              ? "oklch(0.95 0.06 145)"
                              : "oklch(0.96 0.04 60)",
                          color:
                            tx.status === "Confirmed"
                              ? "oklch(0.4 0.15 145)"
                              : "oklch(0.5 0.12 60)",
                          border: "none",
                        }}
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {truncateHash(tx.counterparty)}
                    </TableCell>
                    <TableCell>
                      <a
                        href="https://dashboard.internetcomputer.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        aria-label="View on explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
