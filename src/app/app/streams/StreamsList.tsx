"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useNextStreamId, useStream } from "@/lib/contracts/hooks";
import { formatUnits } from "viem";

function StreamRow({ streamId }: { streamId: bigint }) {
  const { data: stream, isLoading } = useStream(streamId);
  if (isLoading) return <tr><td colSpan={6} className="skeleton h-10" /></tr>;
  if (!stream) return null;
  const s = stream;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const status = s.canceled ? "Canceled" : now < s.cliffTime ? "Cliff" : now >= s.endTime ? "Completed" : "Streaming";
  const pct = s.canceled ? 0 : now >= s.endTime ? 100 : now < s.startTime ? 0 : Number((now - s.startTime) * 100n / (s.endTime - s.startTime));
  return (
    <tr>
      <td><Link href={`/app/streams/${streamId.toString()}`} className="link">#{streamId.toString()}</Link></td>
      <td className="mono-data text-xs">{s.recipient.slice(0, 6)}...{s.recipient.slice(-4)}</td>
      <td className="tnum">{formatUnits(s.deposit, 18)}</td>
      <td><span className={`badge ${status === "Streaming" ? "badge-success" : status === "Canceled" ? "badge-danger" : "badge-info"}`}><span className="badge-dot" />{status}</span></td>
      <td className="tnum">{pct}%</td>
      <td className="text-xs text-muted">{new Date(Number(s.startTime) * 1000).toLocaleDateString()}</td>
    </tr>
  );
}

export default function StreamsList() {
  const { address } = useAccount();
  const { data: nextId, isLoading } = useNextStreamId();

  if (!address) {
    return <div className="card p-8 text-center"><p className="text-muted">Connect your wallet to view streams.</p></div>;
  }

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>;
  }

  const count = nextId ? Number(nextId) : 0;
  if (count === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted mb-4">No streams created yet.</p>
        <Link href="/app/streams/new" className="btn btn-primary">Create your first stream</Link>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Recipient</th>
            <th>Deposit</th>
            <th>Status</th>
            <th>Vested</th>
            <th>Start</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.min(count, 50) }, (_, i) => (
            <StreamRow key={i} streamId={BigInt(count - 1 - i)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
