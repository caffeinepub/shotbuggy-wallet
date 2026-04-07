import { Actor, HttpAgent } from "@dfinity/agent";
import type { Identity } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

// ─── Canister IDs ────────────────────────────────────────────────────────────
// Your specific ICP/SHBY pool on ICPSwap
const POOL_CANISTER_ID = "dj7c2-nqaaa-aaaar-qb42a-cai";
const ICP_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const SHBY_CANISTER_ID = "r4e4i-jiaaa-aaaaj-qrbwq-cai";

const ICP_FEE = BigInt(10_000);
const SHBY_FEE = BigInt(10_000);

// ─── IDL Factories ───────────────────────────────────────────────────────────
const swapPoolIDL: IDL.InterfaceFactory = ({ IDL: I }) => {
  const SwapPoolError = I.Variant({
    CommonError: I.Null,
    InsufficientFunds: I.Null,
    InternalError: I.Text,
    UnsupportedToken: I.Text,
  });
  const ResultNat = I.Variant({ ok: I.Nat, err: SwapPoolError });
  const ResultBalance = I.Variant({
    ok: I.Record({ balance0: I.Nat, balance1: I.Nat }),
    err: SwapPoolError,
  });
  const DepositArgs = I.Record({ fee: I.Nat, token: I.Text, amount: I.Nat });
  const SwapArgs = I.Record({
    amountIn: I.Text,
    zeroForOne: I.Bool,
    amountOutMinimum: I.Text,
  });
  const WithdrawArgs = I.Record({ fee: I.Nat, token: I.Text, amount: I.Nat });
  const TokenInfo = I.Record({ address: I.Text, standard: I.Text });
  const PoolMetadata = I.Record({
    fee: I.Nat,
    key: I.Text,
    token0: TokenInfo,
    token1: TokenInfo,
    sqrtPriceX96: I.Nat,
    tick: I.Int,
    liquidity: I.Nat,
    maxLiquidityPerTick: I.Nat,
    nextPositionId: I.Nat,
  });
  const ResultMetadata = I.Variant({ ok: PoolMetadata, err: SwapPoolError });
  return I.Service({
    deposit: I.Func([DepositArgs], [ResultNat], []),
    depositFrom: I.Func([DepositArgs], [ResultNat], []),
    getUserUnusedBalance: I.Func([I.Principal], [ResultBalance], ["query"]),
    quote: I.Func([SwapArgs], [ResultNat], ["query"]),
    swap: I.Func([SwapArgs], [ResultNat], []),
    withdraw: I.Func([WithdrawArgs], [ResultNat], []),
    metadata: I.Func([], [ResultMetadata], ["query"]),
  });
};

const icrc1IDL: IDL.InterfaceFactory = ({ IDL: I }) => {
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
    GenericError: I.Record({ error_code: I.Nat, message: I.Text }),
  });
  const TransferResult = I.Variant({ Ok: I.Nat, Err: TransferError });
  return I.Service({
    icrc1_transfer: I.Func([TransferArg], [TransferResult], []),
  });
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PoolInfo {
  canisterId: string;
  // true = ICP is token0 (ICP→SHBY is zeroForOne=true)
  // false = SHBY is token0 (ICP→SHBY is zeroForOne=false)
  zeroForOne: boolean;
}

type SwapStep =
  | "transferring"
  | "depositing"
  | "swapping"
  | "withdrawing"
  | null;

export interface ExecuteSwapParams {
  identity: Identity;
  fromToken: "ICP" | "SHBY";
  amountIn: number; // human units
  amountOutMinimum: number; // human units, with slippage applied
  poolCanisterId: string;
  zeroForOne: boolean;
  onStep?: (step: SwapStep) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * ICPSwap uses the caller's principal as a subaccount key inside the pool.
 * The subaccount is 32 bytes: [len, ...principalBytes, ...zeros]
 */
function principalToSubaccount(principal: Principal): Uint8Array {
  const bytes = principal.toUint8Array();
  const subaccount = new Uint8Array(32);
  subaccount[0] = bytes.length;
  subaccount.set(bytes, 1);
  return subaccount;
}

function extractPoolError(err: Record<string, unknown>): string {
  if ("InternalError" in err) return String(err.InternalError);
  if ("UnsupportedToken" in err)
    return `Unsupported token: ${String(err.UnsupportedToken)}`;
  if ("NotExistPool" in err) return "Pool does not exist";
  if ("InsufficientFunds" in err) return "Insufficient funds";
  if ("CommonError" in err) return "Pool common error";
  return "Unknown pool error";
}

function makeAgent(identity?: Identity): HttpAgent {
  const agent = new HttpAgent({ host: "https://ic0.app", identity });
  // Do NOT call fetchRootKey on mainnet
  return agent;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Load pool info from the hardcoded pool canister.
 * Reads metadata to determine token ordering (which token is token0).
 */
async function findPool(identity?: Identity): Promise<PoolInfo | null> {
  try {
    const agent = makeAgent(identity);
    const pool = Actor.createActor<{
      metadata: () => Promise<
        | { ok: { token0: { address: string }; token1: { address: string } } }
        | { err: Record<string, unknown> }
      >;
    }>(swapPoolIDL, { agent, canisterId: POOL_CANISTER_ID });

    const result = await pool.metadata();

    if ("err" in result) {
      console.warn("Pool metadata error:", result.err);
      // Still return the pool with a default assumption
      return {
        canisterId: POOL_CANISTER_ID,
        // Default: assume ICP is token0
        zeroForOne: true,
      };
    }

    const { token0, token1 } = result.ok;
    const token0IsICP =
      token0.address.toLowerCase() === ICP_CANISTER_ID.toLowerCase();
    const token1IsICP =
      token1.address.toLowerCase() === ICP_CANISTER_ID.toLowerCase();

    if (!token0IsICP && !token1IsICP) {
      console.warn(
        "Pool does not contain ICP token. token0:",
        token0.address,
        "token1:",
        token1.address,
      );
    }

    // zeroForOne=true means swapping token0→token1
    // We want ICP→SHBY, so zeroForOne = (ICP is token0)
    return {
      canisterId: POOL_CANISTER_ID,
      zeroForOne: token0IsICP, // true if ICP is token0
    };
  } catch (err) {
    console.error("findPool error:", err);
    return null;
  }
}

async function getQuote(
  poolCanisterId: string,
  zeroForOne: boolean,
  amountInE8s: bigint,
  identity?: Identity,
): Promise<bigint> {
  const agent = makeAgent(identity);
  const pool = Actor.createActor<{
    quote: (args: {
      amountIn: string;
      zeroForOne: boolean;
      amountOutMinimum: string;
    }) => Promise<{ ok: bigint } | { err: Record<string, unknown> }>;
  }>(swapPoolIDL, { agent, canisterId: poolCanisterId });

  const result = await pool.quote({
    amountIn: amountInE8s.toString(),
    zeroForOne,
    amountOutMinimum: "0",
  });

  if ("ok" in result) {
    return result.ok;
  }

  throw new Error(`Quote failed: ${extractPoolError(result.err)}`);
}

/**
 * Execute a swap on ICPSwap following the ICRC1 workflow:
 *   1. icrc1_transfer → pool subaccount (transfer amountIn, ledger deducts fee)
 *   2. deposit(amountIn - tokenFee)  → credits user inside pool
 *   3. swap
 *   4. withdraw
 */
async function executeSwap(params: ExecuteSwapParams): Promise<bigint> {
  const {
    identity,
    fromToken,
    amountIn,
    amountOutMinimum,
    poolCanisterId,
    zeroForOne,
    onStep,
  } = params;

  const callerPrincipal = identity.getPrincipal();
  const subaccount = principalToSubaccount(callerPrincipal);

  const fromCanisterId =
    fromToken === "ICP" ? ICP_CANISTER_ID : SHBY_CANISTER_ID;
  const toCanisterId = fromToken === "ICP" ? SHBY_CANISTER_ID : ICP_CANISTER_ID;
  const fromFee = fromToken === "ICP" ? ICP_FEE : SHBY_FEE;
  const toFee = fromToken === "ICP" ? SHBY_FEE : ICP_FEE;

  const amountInE8s = BigInt(Math.round(amountIn * 1e8));
  const amountOutMinimumE8s = BigInt(Math.round(amountOutMinimum * 1e8));

  const poolPrincipal = Principal.fromText(poolCanisterId);

  // ── Step 1: ICRC-1 transfer to pool's subaccount for caller ──────────────
  // Transfer exactly amountIn. The ledger deducts the fee on top.
  // The pool subaccount receives: amountIn (the pool keeps amountIn).
  // We pass fee as opt to let the ledger verify the fee amount.
  onStep?.("transferring");
  const transferAgent = makeAgent(identity);
  const ledger = Actor.createActor<{
    icrc1_transfer: (args: {
      to: { owner: Principal; subaccount: [Uint8Array] };
      fee: [bigint];
      memo: [];
      from_subaccount: [];
      created_at_time: [];
      amount: bigint;
    }) => Promise<{ Ok: bigint } | { Err: Record<string, unknown> }>;
  }>(icrc1IDL, { agent: transferAgent, canisterId: fromCanisterId });

  const transferResult = await ledger.icrc1_transfer({
    // Transfer to pool canister, with caller's principal as the subaccount
    to: { owner: poolPrincipal, subaccount: [subaccount] },
    fee: [fromFee],
    memo: [],
    from_subaccount: [],
    created_at_time: [],
    amount: amountInE8s,
  });

  if ("Err" in transferResult) {
    const errVariant = transferResult.Err;
    if ("InsufficientFunds" in errVariant) {
      throw new Error(
        `Insufficient funds. You need ${amountIn} ${fromToken} plus the ${Number(fromFee) / 1e8} ${fromToken} transfer fee.`,
      );
    }
    throw new Error(`Transfer failed: ${JSON.stringify(errVariant)}`);
  }

  // ── Step 2: Deposit into pool ─────────────────────────────────────────────
  // After the ICRC1 transfer, the pool's subaccount received amountInE8s.
  // The pool's deposit call moves it into the user's internal balance.
  // deposit amount = amountIn - tokenFee (ledger already deducted fee from sender)
  // According to ICPSwap docs, pass the same amountIn and let the pool handle fees.
  onStep?.("depositing");
  const poolAgent = makeAgent(identity);
  const pool = Actor.createActor<{
    deposit: (args: {
      fee: bigint;
      token: string;
      amount: bigint;
    }) => Promise<{ ok: bigint } | { err: Record<string, unknown> }>;
    swap: (args: {
      amountIn: string;
      zeroForOne: boolean;
      amountOutMinimum: string;
    }) => Promise<{ ok: bigint } | { err: Record<string, unknown> }>;
    withdraw: (args: {
      fee: bigint;
      token: string;
      amount: bigint;
    }) => Promise<{ ok: bigint } | { err: Record<string, unknown> }>;
  }>(swapPoolIDL, { agent: poolAgent, canisterId: poolCanisterId });

  // Deposit the amount that arrived in the subaccount.
  // The pool internally deducts fromFee, so credit = amountIn - fromFee.
  const depositResult = await pool.deposit({
    token: fromCanisterId,
    amount: amountInE8s,
    fee: fromFee,
  });

  if ("err" in depositResult) {
    throw new Error(`Deposit failed: ${extractPoolError(depositResult.err)}`);
  }

  const depositedAmount = depositResult.ok;

  // ── Step 3: Swap ──────────────────────────────────────────────────────────
  onStep?.("swapping");
  const swapResult = await pool.swap({
    amountIn: depositedAmount.toString(),
    zeroForOne,
    amountOutMinimum: amountOutMinimumE8s.toString(),
  });

  if ("err" in swapResult) {
    const errMsg = extractPoolError(swapResult.err);
    if (
      errMsg.toLowerCase().includes("slippage") ||
      errMsg.toLowerCase().includes("minimum") ||
      errMsg.toLowerCase().includes("insufficient")
    ) {
      throw new Error(
        "Slippage exceeded — price moved too much. Try a smaller amount or try again.",
      );
    }
    throw new Error(`Swap failed: ${errMsg}`);
  }

  const outputAmount = swapResult.ok;

  // ── Step 4: Withdraw output token ─────────────────────────────────────────
  onStep?.("withdrawing");
  const withdrawResult = await pool.withdraw({
    token: toCanisterId,
    amount: outputAmount,
    fee: toFee,
  });

  if ("err" in withdrawResult) {
    throw new Error(`Withdraw failed: ${extractPoolError(withdrawResult.err)}`);
  }

  onStep?.(null);
  return withdrawResult.ok;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useICPSwap() {
  const [swapStep, setSwapStep] = useState<SwapStep>(null);

  const poolQuery = useQuery<PoolInfo | null>({
    queryKey: ["icpswap-pool", POOL_CANISTER_ID],
    queryFn: () => findPool(),
    staleTime: 10 * 60_000, // 10 minutes
    retry: 3,
  });

  const swapMutation = useMutation({
    mutationFn: (params: ExecuteSwapParams) => {
      return executeSwap({
        ...params,
        onStep: (step) => {
          setSwapStep(step);
          params.onStep?.(step);
        },
      });
    },
    onSettled: () => setSwapStep(null),
  });

  return {
    pool: poolQuery.data ?? null,
    isPoolLoading: poolQuery.isLoading,
    poolError: poolQuery.error,
    getQuote,
    findPool,
    executeSwap: swapMutation.mutateAsync,
    isSwapping: swapMutation.isPending,
    swapStep,
    swapError: swapMutation.error,
  };
}
