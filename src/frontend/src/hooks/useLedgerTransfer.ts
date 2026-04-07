import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { useMutation } from "@tanstack/react-query";

const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const SHBY_CANISTER_ID = "r4e4i-jiaaa-aaaaj-qrbwq-cai";

const icrc1TransferIDL: IDL.InterfaceFactory = ({ IDL: I }) => {
  const Account = I.Record({
    owner: I.Principal,
    subaccount: I.Opt(I.Vec(I.Nat8)),
  });
  const TransferArg = I.Record({
    to: Account,
    fee: I.Opt(I.Nat),
    memo: I.Opt(I.Vec(I.Nat8)),
    from_subaccount: I.Opt(I.Vec(I.Nat8)),
    created_at_time: I.Opt(I.Nat64),
    amount: I.Nat,
  });
  const TransferError = I.Variant({
    BadFee: I.Record({ expected_fee: I.Nat }),
    BadBurn: I.Record({ min_burn_amount: I.Nat }),
    InsufficientFunds: I.Record({ balance: I.Nat }),
    TooOld: I.Null,
    CreatedInFuture: I.Record({ ledger_time: I.Nat64 }),
    Duplicate: I.Record({ duplicate_of: I.Nat }),
    TemporarilyUnavailable: I.Null,
    GenericError: I.Record({
      error_code: I.Nat,
      message: I.Text,
    }),
  });
  const TransferResult = I.Variant({
    Ok: I.Nat,
    Err: TransferError,
  });
  return I.Service({
    icrc1_transfer: I.Func([TransferArg], [TransferResult], []),
  });
};

export type LedgerTransferResult =
  | { Ok: bigint }
  | { Err: Record<string, unknown> };

export interface LedgerTransferParams {
  token: "ICP" | "SHBY";
  recipientPrincipal: string;
  amount: number;
  memo?: string;
  identity: import("@dfinity/agent").Identity;
}

function formatTransferError(err: Record<string, unknown>): string {
  if ("InsufficientFunds" in err) return "Insufficient funds";
  if ("BadFee" in err) return "Bad fee \u2014 check the network fee";
  if ("TooOld" in err) return "Transaction too old";
  if ("CreatedInFuture" in err)
    return "Created in future \u2014 check your clock";
  if ("Duplicate" in err) return "Duplicate transaction";
  if ("TemporarilyUnavailable" in err) return "Ledger temporarily unavailable";
  if ("GenericError" in err) {
    const ge = err.GenericError as { message?: string };
    return ge?.message ?? "Generic error";
  }
  return "Transfer failed";
}

async function performTransfer(params: LedgerTransferParams): Promise<bigint> {
  const canisterId =
    params.token === "ICP" ? ICP_LEDGER_CANISTER_ID : SHBY_CANISTER_ID;

  const agent = new HttpAgent({
    host: "https://ic0.app",
    identity: params.identity,
  });
  // Do NOT call fetchRootKey on mainnet

  const actor = Actor.createActor<{
    icrc1_transfer: (arg: {
      to: { owner: Principal; subaccount: [] };
      fee: [];
      memo: [];
      from_subaccount: [];
      created_at_time: [];
      amount: bigint;
    }) => Promise<LedgerTransferResult>;
  }>(icrc1TransferIDL, { agent, canisterId });

  const amountE8s = BigInt(Math.round(params.amount * 1e8));
  const recipient = Principal.fromText(params.recipientPrincipal);

  const result = await actor.icrc1_transfer({
    to: { owner: recipient, subaccount: [] },
    fee: [],
    memo: [],
    from_subaccount: [],
    created_at_time: [],
    amount: amountE8s,
  });

  if ("Ok" in result) {
    return result.Ok;
  }

  const errMsg = formatTransferError(result.Err);
  throw new Error(errMsg);
}

export function useLedgerTransfer() {
  return useMutation({
    mutationFn: performTransfer,
  });
}
