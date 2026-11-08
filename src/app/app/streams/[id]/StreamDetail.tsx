"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useStream, useClaimable, useClaim, useCancel, useTokenMeta } from "@/lib/contracts/hooks";
import { formatUnits } from "viem";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 bg-signal/10 rounded-full overflow-hidden">
      <div className="h-full bg-signal rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function StreamDetail({ id }: { id: string }) {
  const streamId = BigInt(id);
  const { address } = useAccount();
  const { data: stream, isLoading, error } = useStream(streamId);
  const { data: claimableRaw } = useClaimable(streamId);
  const { claim, isPending: claiming, hash: claimHash, receipt: claimReceipt } = useClaim();
  const { cancel, isPending: canceling, hash: cancelHash, receipt: cancelReceipt } = useCancel();
  const tokenMeta = useTokenMeta(stream?.token);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-16 rounded" />)}</div>;
  }

  if (error || !stream) {
    return <div className="card p-8 text-center"><p className="error-text">Stream #{id} not found.</p><Link href="/app/streams" className="link mt-4 inline-block">Back to streams</Link></div>;
  }

  const s = stream;
  const decimals = tokenMeta.decimals ?? 18;
  const symbol = tokenMeta.symbol ?? "TOKEN";
  const now = BigInt(Math.floor(Date.now() / 1000));
  const status = s.canceled ? "Canceled" : now < s.cliffTime ? "Cliff" : now >= s.endTime ? "Completed" : "Streaming";
  const pct = s.canceled ? 0 : now >= s.endTime ? 100 : now < s.startTime ? 0 : Number((now - s.startTime) * 100n / (s.endTime - s.startTime));
  const claimable = claimableRaw ? formatUnits(claimableRaw, decimals) : "0";
  const isRecipient = address?.toLowerCase() === s.recipient.toLowerCase();
  const isSender = address?.toLowerCase() === s.sender.toLowerCase();
  const explorerBase = "https://elysium.kinetiq.xyz/testnet-explorer";

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/app/streams" className="link text-sm">← Streams</Link>
        <h1 className="title-2">Stream #{id}</h1>
        <span className={`badge ml-auto ${status === "Streaming" ? "badge-success" : status === "Canceled" ? "badge-danger" : status === "Completed" ? "badge-info" : "badge-warning"}`}>
          <span className="badge-dot" />{status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <p className="label">Deposit</p>
          <p className="text-2xl tnum">{formatUnits(s.deposit, decimals)} <span className="text-sm text-muted">{symbol}</span></p>
        </div>
        <div className="card p-6">
          <p className="label">Claimed</p>
          <p className="text-2xl tnum">{formatUnits(s.claimed, decimals)} <span className="text-sm text-muted">{symbol}</span></p>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <p className="label mb-0">Vesting progress</p>
          <span className="micro tnum">{pct}%</span>
        </div>
        <ProgressBar pct={pct} />
        <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
          <div><p className="micro mb-1">START</p><p className="tnum">{new Date(Number(s.startTime) * 1000).toLocaleString()}</p></div>
          <div><p className="micro mb-1">CLIFF</p><p className="tnum">{new Date(Number(s.cliffTime) * 1000).toLocaleString()}</p></div>
          <div><p className="micro mb-1">END</p><p className="tnum">{new Date(Number(s.endTime) * 1000).toLocaleString()}</p></div>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="label">Sender</p><p className="mono-data text-xs break-all">{s.sender}</p></div>
          <div><p className="label">Recipient</p><p className="mono-data text-xs break-all">{s.recipient}</p></div>
          <div><p className="label">Token</p><p className="mono-data text-xs break-all">{s.token}</p></div>
          <div><p className="label">Cancelable</p><p>{s.cancelable ? "Yes" : "No"}</p></div>
        </div>
      </div>

      {isRecipient && !s.canceled && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Claimable now</p>
              <p className="text-xl tnum text-signal">{claimable} <span className="text-sm text-muted">{symbol}</span></p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={claiming || claimableRaw === 0n}
              onClick={() => claim(streamId)}
            >
              {claiming ? "Claiming..." : "Claim"}
            </button>
          </div>
          {claimHash && (
            <p className="micro mt-3">
              Tx: <a href={`${explorerBase}/tx/${claimHash}`} target="_blank" rel="noopener noreferrer" className="link">{claimHash.slice(0, 10)}...</a>
              {claimReceipt.isSuccess && " Confirmed"}
            </p>
          )}
        </div>
      )}

      {isSender && s.cancelable && !s.canceled && status !== "Completed" && (
        <div className="card p-6 mb-6 border-danger/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Cancel stream</p>
              <p className="text-sm text-muted">Unvested tokens return to sender. Vested tokens go to recipient.</p>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              disabled={canceling}
              onClick={() => cancel(streamId)}
            >
              {canceling ? "Canceling..." : "Cancel stream"}
            </button>
          </div>
          {cancelHash && (
            <p className="micro mt-3">
              Tx: <a href={`${explorerBase}/tx/${cancelHash}`} target="_blank" rel="noopener noreferrer" className="link">{cancelHash.slice(0, 10)}...</a>
              {cancelReceipt.isSuccess && " Confirmed"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
