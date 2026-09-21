"use client";

/**
 * Real-mode wallet console. Loaded only in real mode (dynamic import) so wagmi/viem stay out
 * of the demo bundle. The treasury wallet signs each route step here; the server records the
 * hash and polls the provider. The server never holds a key.
 */
import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, useAccount, useConnect, useDisconnect, useReadContract, useSendTransaction, useSwitchChain } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { base, baseSepolia, arbitrum, mainnet, optimism, polygon, sepolia, type Chain } from "wagmi/chains";
import { erc20Abi, formatUnits as viemFormat } from "viem";
import { Button, Money, StatusBadge } from "@/components/ui";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { chainName } from "@/lib/config";
import type { BatchDetail } from "./useBatch";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const CHAINS: readonly [Chain, ...Chain[]] = [base, baseSepolia, arbitrum, mainnet, optimism, polygon, sepolia];
const config = createConfig({
  chains: CHAINS,
  connectors: [injected(), ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : [])],
  transports: Object.fromEntries(CHAINS.map((c) => [c.id, http(process.env[`NEXT_PUBLIC_RPC_URL_${c.id}`] || undefined)])) as Record<number, ReturnType<typeof http>>,
  ssr: false,
});
const qc = new QueryClient();

interface Props {
  d: BatchDetail;
  stage: "fund" | "sign";
  onFund: (input?: { fromAddress: string; attestedBalance: string }) => Promise<void>;
  onRefresh: () => void;
}

export default function RealExecutionConsole(props: Props) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <Console {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function Console({ d, stage, onFund, onRefresh }: Props) {
  const { batch, summary, recipients } = d;
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const asset = recipients.find((r) => r.route)?.route?.steps.find((s) => s.id === "send" || s.id === "approve")?.to as `0x${string}` | undefined;
  const wrongChain = isConnected && chainId !== batch.originChainId;
  const balance = useReadContract({ address: asset, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: batch.originChainId, query: { enabled: !!address && !!asset, refetchInterval: 10_000 } });

  const queue = useMemo(() => recipients.filter((r) => r.valid && ["SCHEDULED", "ROUTED", "RETRY_ELIGIBLE"].includes(r.status) && r.route?.status === "QUOTED"), [recipients]);
  const next = queue.find((r) => !r.scheduledFor || new Date(r.scheduledFor).getTime() <= Date.now());

  const signNext = async () => {
    if (!next || !next.route) return;
    setBusyId(next.id);
    try {
      for (const step of next.route.steps) {
        if (step.kind !== "transaction" || !step.to) continue;
        const hash = await sendTransactionAsync({ to: step.to as `0x${string}`, data: (step.data ?? "0x") as `0x${string}`, value: BigInt(step.value ?? "0"), chainId: step.chainId });
        await api(`/api/batches/${batch.id}/recipients/${next.id}/attempts`, { method: "POST", json: { txHash: hash, stepId: step.id } });
        toast(`Signed ${step.id} for row ${next.rowNumber}`, { tone: "success", detail: hash });
        // Only the final (deposit/send) step is tracked as the attempt; approvals precede it.
        if (step.id === "send" || step.id === "deposit") break;
      }
      onRefresh();
    } catch (e) {
      toast("Signature failed or rejected", { tone: "danger", detail: (e as Error).message.slice(0, 160) });
    } finally {
      setBusyId(null);
    }
  };

  const required = summary.fundingRequired ? BigInt(summary.fundingRequired) : 0n;
  const bal = typeof balance.data === "bigint" ? balance.data : null;

  return (
    <div className="rounded-card border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[0.875rem]">
          {isConnected ? (
            <>
              <span className="badge badge-success">Wallet connected</span>
              <span className="ml-2 mono-data">{address}</span>
              <span className="ml-2 text-ink-faint">· {chainId ? chainName(chainId) : "?"}</span>
            </>
          ) : (
            <span className="text-ink-soft">Connect the treasury wallet (browser extension) to continue.</span>
          )}
        </div>
        {isConnected ? (
          <Button size="sm" variant="ghost" onClick={() => disconnect()}>
            Disconnect
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {connectors.map((c, i) => (
              <Button key={c.uid} size="sm" variant={i === 0 ? "primary" : "secondary"} loading={connecting} onClick={() => connect({ connector: c })}>
                {c.id === "walletConnect" ? "WalletConnect" : "Connect wallet"}
              </Button>
            ))}
            {!connectors.length && (
              <Button size="sm" variant="primary" disabled>
                No wallet found
              </Button>
            )}
          </div>
        )}
      </div>
      {wrongChain && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning-tint p-3 text-[0.875rem] text-warning">
          <span>Wallet is on {chainName(chainId!)}; this batch funds from {chainName(batch.originChainId)}.</span>
          <Button size="sm" variant="secondary" onClick={() => switchChain({ chainId: batch.originChainId })}>
            Switch network
          </Button>
        </div>
      )}
      {isConnected && !wrongChain && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-[0.875rem]">
          <div className="inset px-3 py-2">
            <dt className="eyebrow">Available balance</dt>
            <dd className="mt-0.5 tnum font-medium">{bal !== null ? `${viemFormat(bal, batch.assetDecimals)} ${batch.assetSymbol}` : balance.isLoading ? "reading…" : "unavailable"}</dd>
          </div>
          <div className="inset px-3 py-2">
            <dt className="eyebrow">Required</dt>
            <dd className="mt-0.5">
              <Money units={summary.fundingRequired} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium" />
            </dd>
          </div>
          <div className="inset px-3 py-2">
            <dt className="eyebrow">Check</dt>
            <dd className="mt-0.5">{bal === null ? <StatusBadge tone="neutral">Unknown</StatusBadge> : bal >= required ? <StatusBadge tone="success">Sufficient</StatusBadge> : <StatusBadge tone="danger">Insufficient</StatusBadge>}</dd>
          </div>
        </dl>
      )}
      {stage === "fund" && isConnected && !wrongChain && (
        <Button variant="primary" className="mt-4" disabled={bal === null || bal < required} onClick={() => onFund({ fromAddress: address!, attestedBalance: bal!.toString() })}>
          Confirm funding from this wallet
        </Button>
      )}
      {stage === "sign" && isConnected && !wrongChain && (
        <div className="mt-4">
          <p className="text-[0.875rem] text-ink-soft">
            {queue.length} payment(s) awaiting signature{next ? `; next is row ${next.rowNumber} (${next.name})` : queue.length ? "; the next one is scheduled for later (spacing)" : "."}
          </p>
          <Button variant="accent" className="mt-3" disabled={!next || sending || !!busyId} loading={sending || !!busyId} onClick={signNext}>
            Sign next payment
          </Button>
        </div>
      )}
    </div>
  );
}
