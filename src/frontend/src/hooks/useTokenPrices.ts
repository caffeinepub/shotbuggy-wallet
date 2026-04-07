import { useQuery } from "@tanstack/react-query";

export interface TokenPrices {
  icpUsd: number;
  shbyUsd: number;
}

async function fetchTokenPrices(): Promise<TokenPrices> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error("Price fetch failed");
  const data = await res.json();
  return {
    icpUsd: data["internet-computer"]?.usd ?? 12.84,
    // SHBY is not listed on CoinGecko; keep the static fallback
    shbyUsd: 0.000824,
  };
}

export function useTokenPrices() {
  return useQuery<TokenPrices>({
    queryKey: ["tokenPrices"],
    queryFn: fetchTokenPrices,
    // Refresh every 60 seconds
    refetchInterval: 60_000,
    staleTime: 30_000,
    // Fall back to stale data on error so the UI never shows NaN
    placeholderData: { icpUsd: 12.84, shbyUsd: 0.000824 },
  });
}
