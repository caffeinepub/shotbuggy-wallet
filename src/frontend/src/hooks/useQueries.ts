import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Transaction } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useCallerPrincipal() {
  const { identity } = useInternetIdentity();
  return useQuery<string | null>({
    queryKey: ["callerPrincipal", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!identity) return null;
      const principal = identity.getPrincipal();
      if (principal.isAnonymous()) return null;
      return principal.toText();
    },
    enabled: !!identity,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useTransactionHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ["transactionHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactionHistory();
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
  });
}

export function useRecordTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      txType: string;
      token: string;
      amount: string;
      counterparty: string;
      status: string;
      memo: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordTransaction(
        params.txType,
        params.token,
        params.amount,
        params.counterparty,
        params.status,
        params.memo,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactionHistory"] });
    },
  });
}
