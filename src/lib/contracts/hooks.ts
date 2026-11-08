"use client";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RAQIO_STREAM_ABI, ERC20_ABI } from "./abi";
import { CONTRACTS } from "./config";
import type { Address } from "viem";

export function useStream(streamId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.raqioStream,
    abi: RAQIO_STREAM_ABI,
    functionName: "getStream",
    args: streamId !== undefined ? [streamId] : undefined,
    query: { enabled: streamId !== undefined },
  });
}

export function useClaimable(streamId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.raqioStream,
    abi: RAQIO_STREAM_ABI,
    functionName: "claimable",
    args: streamId !== undefined ? [streamId] : undefined,
    query: { enabled: streamId !== undefined, refetchInterval: 5_000 },
  });
}

export function useNextStreamId() {
  return useReadContract({
    address: CONTRACTS.raqioStream,
    abi: RAQIO_STREAM_ABI,
    functionName: "nextStreamId",
    query: { refetchInterval: 10_000 },
  });
}

export function useTokenBalance(token: Address | undefined, account: Address | undefined) {
  return useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!token && !!account, refetchInterval: 10_000 },
  });
}

export function useTokenAllowance(token: Address | undefined, owner: Address | undefined, spender: Address | undefined) {
  return useReadContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!token && !!owner && !!spender },
  });
}

export function useTokenMeta(token: Address | undefined) {
  const symbol = useReadContract({ address: token, abi: ERC20_ABI, functionName: "symbol", query: { enabled: !!token } });
  const decimals = useReadContract({ address: token, abi: ERC20_ABI, functionName: "decimals", query: { enabled: !!token } });
  const name = useReadContract({ address: token, abi: ERC20_ABI, functionName: "name", query: { enabled: !!token } });
  return { symbol: symbol.data, decimals: decimals.data, name: name.data, isLoading: symbol.isLoading || decimals.isLoading };
}

export function useCreateStream() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  return {
    createStream: (args: { recipient: Address; token: Address; deposit: bigint; startTime: bigint; cliffDuration: bigint; totalDuration: bigint; cancelable: boolean }) => {
      writeContract({
        address: CONTRACTS.raqioStream,
        abi: RAQIO_STREAM_ABI,
        functionName: "createStream",
        args: [args.recipient, args.token, args.deposit, args.startTime, args.cliffDuration, args.totalDuration, args.cancelable],
      });
    },
    hash, isPending, error, receipt,
  };
}

export function useClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  return {
    claim: (streamId: bigint) => {
      writeContract({
        address: CONTRACTS.raqioStream,
        abi: RAQIO_STREAM_ABI,
        functionName: "claim",
        args: [streamId],
      });
    },
    hash, isPending, error, receipt,
  };
}

export function useCancel() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  return {
    cancel: (streamId: bigint) => {
      writeContract({
        address: CONTRACTS.raqioStream,
        abi: RAQIO_STREAM_ABI,
        functionName: "cancel",
        args: [streamId],
      });
    },
    hash, isPending, error, receipt,
  };
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  return {
    approve: (token: Address, amount: bigint) => {
      writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.raqioStream, amount],
      });
    },
    hash, isPending, error, receipt,
  };
}
