import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PAPER_PERPS_ABI } from "../abi/PaperPerps";
import { PAPER_PERPS_ADDRESS } from "../config/contract";

const contract = { address: PAPER_PERPS_ADDRESS, abi: PAPER_PERPS_ABI } as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CONTRACT_DEPLOYED = PAPER_PERPS_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

/// Reads the caller's open position on `perpIndex` straight from the contract mapping —
/// no backend, no account system, just `positions(address,uint16)` keyed by the
/// connected wallet.
export function usePosition(perpIndex: number) {
  const { address } = useAccount();
  return useReadContract({
    ...contract,
    functionName: "positions",
    args: address ? [address, perpIndex] : undefined,
    query: { enabled: !!address && CONTRACT_DEPLOYED, refetchInterval: 4000 },
  });
}

/// Live equity/PnL preview (view call, no gas, no tx) driven by the contract's own
/// `previewEquity`, which internally re-reads the live `markPx` precompile every call.
export function usePreviewEquity(user: `0x${string}` | undefined, perpIndex: number) {
  return useReadContract({
    ...contract,
    functionName: "previewEquity",
    args: user ? [user, perpIndex] : undefined,
    query: { enabled: !!user && CONTRACT_DEPLOYED, refetchInterval: 4000 },
  });
}

export function useHistory(user: `0x${string}` | undefined) {
  return useReadContract({
    ...contract,
    functionName: "getHistory",
    args: user ? [user] : undefined,
    query: { enabled: !!user && CONTRACT_DEPLOYED, refetchInterval: 6000 },
  });
}

export function useLeaderboard(offset = 0, limit = 25) {
  return useReadContract({
    ...contract,
    functionName: "leaderboard",
    args: [BigInt(offset), BigInt(limit)],
    query: { enabled: CONTRACT_DEPLOYED, refetchInterval: 8000 },
  });
}

export function useOpenPosition() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function open(perpIndex: number, isLong: boolean, marginUsd6: bigint, leverage: number) {
    writeContract({
      ...contract,
      functionName: "openPosition",
      args: [perpIndex, isLong, marginUsd6, leverage],
    });
  }

  return { open, hash, isPending, isConfirming, isSuccess, error };
}

export function useClosePosition() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function close(perpIndex: number) {
    writeContract({
      ...contract,
      functionName: "closePosition",
      args: [perpIndex],
    });
  }

  return { close, hash, isPending, isConfirming, isSuccess, error };
}
