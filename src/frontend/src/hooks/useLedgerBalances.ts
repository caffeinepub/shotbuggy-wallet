import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { useQuery } from "@tanstack/react-query";
import { useInternetIdentity } from "./useInternetIdentity";

const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const SHBY_CANISTER_ID = "r4e4i-jiaaa-aaaaj-qrbwq-cai";

const icrc1BalanceIDL: IDL.InterfaceFactory = ({ IDL: I }) => {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  return I.Service({
    icrc1_balance_of: I.Func([Account], [I.Nat], ["query"]),
  });
};

async function fetchBalance(
  canisterId: string,
  principal: import("@dfinity/principal").Principal,
  identity?: import("@dfinity/agent").Identity,
): Promise<bigint> {
  const agentOptions: {
    host: string;
    identity?: import("@dfinity/agent").Identity;
  } = { host: "https://ic0.app" };
  if (identity) {
    agentOptions.identity = identity;
  }
  const agent = new HttpAgent(agentOptions);
  // Do NOT call fetchRootKey on mainnet
  const actor = Actor.createActor<{
    icrc1_balance_of: (arg: {
      owner: import("@dfinity/principal").Principal;
      subaccount: [];
    }) => Promise<bigint>;
  }>(icrc1BalanceIDL, { agent, canisterId });
  const result = await actor.icrc1_balance_of({
    owner: principal,
    subaccount: [],
  });
  return result;
}

export function useLedgerBalances() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal();

  return useQuery({
    queryKey: ["ledgerBalances", principal?.toString()],
    queryFn: async (): Promise<{ icpBalance: number; shbyBalance: number }> => {
      if (!principal || principal.isAnonymous()) {
        return { icpBalance: 0, shbyBalance: 0 };
      }

      const [icpRaw, shbyRaw] = await Promise.all([
        fetchBalance(ICP_LEDGER_CANISTER_ID, principal, identity),
        fetchBalance(SHBY_CANISTER_ID, principal, identity),
      ]);

      return {
        icpBalance: Number(icpRaw) / 1e8,
        shbyBalance: Number(shbyRaw) / 1e8,
      };
    },
    enabled: !!principal && !principal.isAnonymous(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
