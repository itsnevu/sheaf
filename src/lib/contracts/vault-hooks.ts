"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { RAQIO_VAULT_ABI } from "./vault-abi";
import { ERC20_ABI } from "./abi";
import { CONTRACTS, elysiumMainnet, isContractConfigured } from "./config";
import type { Address } from "viem";

export function useVaultNextLockId() {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: CONTRACTS.raqioVault,
    abi: RAQIO_VAULT_ABI,
    functionName: "nextLockId",
    query: { enabled: isContractConfigured(CONTRACTS.raqioVault), refetchInterval: 10000 },
  });
}

export function useVaultGetLock(lockId: bigint | undefined) {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: CONTRACTS.raqioVault,
    abi: RAQIO_VAULT_ABI,
    functionName: "getLock",
    args: lockId !== undefined ? [lockId] : undefined,
    query: { enabled: isContractConfigured(CONTRACTS.raqioVault) && lockId !== undefined, refetchInterval: 5000 },
  });
}

export function useVaultClaimable(lockId: bigint | undefined) {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: CONTRACTS.raqioVault,
    abi: RAQIO_VAULT_ABI,
    functionName: "claimable",
    args: lockId !== undefined ? [lockId] : undefined,
    query: { enabled: isContractConfigured(CONTRACTS.raqioVault) && lockId !== undefined, refetchInterval: 5000 },
  });
}

export function useTokenAllowance(token: Address | undefined, owner: Address | undefined) {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: owner && token ? [owner, CONTRACTS.raqioVault] : undefined,
    query: { enabled: !!token && !!owner },
  });
}

export function useTokenBalance(token: Address | undefined, owner: Address | undefined) {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    query: { enabled: !!token && !!owner },
  });
}

export function useTokenDecimals(token: Address | undefined) {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: token,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!token },
  });
}

export function useTokenSymbol(token: Address | undefined) {
  return useReadContract({
    chainId: elysiumMainnet.id,
    address: token,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!token },
  });
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash, chainId: elysiumMainnet.id });
  return {
    approve: (token: Address, amount: bigint) =>
      writeContract({ chainId: elysiumMainnet.id, address: token, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.raqioVault, amount] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export function useLockTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  return {
    lockTokens: (token: Address, amount: bigint, unlockTime: bigint, beneficiary: Address) =>
      writeContract({ chainId: elysiumMainnet.id, address: CONTRACTS.raqioVault, abi: RAQIO_VAULT_ABI, functionName: "lockTokens", args: [token, amount, unlockTime, beneficiary] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export function useLockLP() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  return {
    lockLP: (lpToken: Address, amount: bigint, unlockTime: bigint, beneficiary: Address) =>
      writeContract({ chainId: elysiumMainnet.id, address: CONTRACTS.raqioVault, abi: RAQIO_VAULT_ABI, functionName: "lockLP", args: [lpToken, amount, unlockTime, beneficiary] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export function useClaimLock() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  return {
    claim: (lockId: bigint) =>
      writeContract({ chainId: elysiumMainnet.id, address: CONTRACTS.raqioVault, abi: RAQIO_VAULT_ABI, functionName: "claim", args: [lockId] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export function useCancelLock() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  return {
    cancel: (lockId: bigint) =>
      writeContract({ chainId: elysiumMainnet.id, address: CONTRACTS.raqioVault, abi: RAQIO_VAULT_ABI, functionName: "cancel", args: [lockId] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export function useExtendLock() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  return {
    extendLock: (lockId: bigint, newUnlockTime: bigint) =>
      writeContract({ chainId: elysiumMainnet.id, address: CONTRACTS.raqioVault, abi: RAQIO_VAULT_ABI, functionName: "extendLock", args: [lockId, newUnlockTime] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export function useCreateVaultStream() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash, chainId: elysiumMainnet.id });
  return {
    createStream: (beneficiary: Address, token: Address, amount: bigint, startTime: bigint, cliffDuration: bigint, totalDuration: bigint, cancelable: boolean) =>
      writeContract({ chainId: elysiumMainnet.id, address: CONTRACTS.raqioVault, abi: RAQIO_VAULT_ABI, functionName: "createStream", args: [beneficiary, token, amount, startTime, cliffDuration, totalDuration, cancelable] }),
    hash, isPending, isConfirming, receipt, error,
  };
}

export const useLock = useVaultGetLock;
export const useClaimable = useVaultClaimable;
export const useNextLockId = useVaultNextLockId;
