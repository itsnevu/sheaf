"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { isAddress, parseUnits, formatUnits } from "viem";
import type { Address } from "viem";
import {
  useCreateStream,
  useApproveToken,
  useTokenAllowance,
  useTokenBalance,
  useTokenMeta,
} from "@/lib/contracts/hooks";
import { CONTRACTS } from "@/lib/contracts/config";

const EXPLORER = "https://elysium.kinetiq.xyz/testnet-explorer";

function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateStreamForm() {
  const { address, isConnected } = useAccount();

  const [recipient, setRecipient] = useState("");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    return toLocalDatetimeString(d);
  });
  const [cliffDays, setCliffDays] = useState("0");
  const [durationDays, setDurationDays] = useState("30");
  const [cancelable, setCancelable] = useState(true);

  const tokenAddr = isAddress(token) ? (token as Address) : undefined;
  const recipientAddr = isAddress(recipient) ? (recipient as Address) : undefined;

  const tokenMeta = useTokenMeta(tokenAddr);
  const balance = useTokenBalance(tokenAddr, address);
  const allowance = useTokenAllowance(tokenAddr, address, CONTRACTS.raqioStream);

  const depositBn = useMemo(() => {
    if (!amount || !tokenMeta.decimals) return undefined;
    try {
      return parseUnits(amount, tokenMeta.decimals);
    } catch {
      return undefined;
    }
  }, [amount, tokenMeta.decimals]);

  const needsApproval = useMemo(() => {
    if (!depositBn || !allowance.data) return true;
    return allowance.data < depositBn;
  }, [depositBn, allowance.data]);

  const { approve, isPending: approvePending, hash: approveHash, receipt: approveReceipt, error: approveError } = useApproveToken();
  const { createStream, isPending: createPending, hash: createHash, receipt: createReceipt, error: createError } = useCreateStream();

  const errors = useMemo(() => {
    const e: string[] = [];
    if (recipient && !recipientAddr) e.push("Invalid recipient address");
    if (token && !tokenAddr) e.push("Invalid token address");
    if (amount && !depositBn) e.push("Invalid deposit amount");
    if (depositBn && balance.data !== undefined && depositBn > balance.data) e.push("Insufficient token balance");
    const cliff = Number(cliffDays);
    const dur = Number(durationDays);
    if (dur <= 0) e.push("Duration must be greater than 0");
    if (cliff >= dur) e.push("Cliff must be shorter than total duration");
    const start = new Date(startTime);
    if (start.getTime() <= Date.now()) e.push("Start time must be in the future");
    return e;
  }, [recipient, recipientAddr, token, tokenAddr, amount, depositBn, balance.data, cliffDays, durationDays, startTime]);

  const canSubmit = isConnected && recipientAddr && tokenAddr && depositBn && errors.length === 0;

  function handleApprove() {
    if (!tokenAddr || !depositBn) return;
    approve(tokenAddr, depositBn);
  }

  function handleCreate() {
    if (!recipientAddr || !tokenAddr || !depositBn) return;
    const start = BigInt(Math.floor(new Date(startTime).getTime() / 1000));
    const cliffSec = BigInt(Number(cliffDays) * 86400);
    const durSec = BigInt(Number(durationDays) * 86400);
    createStream({
      recipient: recipientAddr,
      token: tokenAddr,
      deposit: depositBn,
      startTime: start,
      cliffDuration: cliffSec,
      totalDuration: durSec,
      cancelable,
    });
  }

  if (!isConnected) {
    return (
      <div className="card p-8">
        <p className="body-l text-muted">Connect your wallet to create a stream.</p>
      </div>
    );
  }

  if (createReceipt.isSuccess && createHash) {
    return (
      <div className="card p-8">
        <h2 className="title-2 mb-4">STREAM CREATED</h2>
        <p className="body-l text-muted mb-4">Your stream has been created on-chain.</p>
        <a href={`${EXPLORER}/tx/${createHash}`} target="_blank" rel="noopener noreferrer" className="link micro">
          View transaction: {createHash.slice(0, 10)}...{createHash.slice(-8)}
        </a>
      </div>
    );
  }

  return (
    <div className="card p-8" style={{ maxWidth: 640 }}>
      <div className="space-y-6">
        {/* Recipient */}
        <div>
          <label className="label" htmlFor="recipient">RECIPIENT ADDRESS</label>
          <input
            id="recipient"
            className="input"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Token */}
        <div>
          <label className="label" htmlFor="token">TOKEN ADDRESS</label>
          <input
            id="token"
            className="input"
            placeholder="0x..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {tokenMeta.symbol && (
            <p className="micro mt-2">
              {tokenMeta.name} ({tokenMeta.symbol}) / {tokenMeta.decimals} decimals
            </p>
          )}
          {tokenMeta.isLoading && tokenAddr && <div className="skeleton mt-2" style={{ width: 120, height: 14 }} />}
        </div>

        {/* Amount */}
        <div>
          <label className="label" htmlFor="amount">DEPOSIT AMOUNT</label>
          <input
            id="amount"
            className="input"
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {balance.data !== undefined && tokenMeta.decimals !== undefined && (
            <p className="micro mt-2">
              Balance: {formatUnits(balance.data, tokenMeta.decimals)} {tokenMeta.symbol}
            </p>
          )}
          {allowance.data !== undefined && tokenMeta.decimals !== undefined && (
            <p className="micro mt-1">
              Allowance: {formatUnits(allowance.data, tokenMeta.decimals)} {tokenMeta.symbol}
            </p>
          )}
        </div>

        {/* Start time */}
        <div>
          <label className="label" htmlFor="start">START TIME</label>
          <input
            id="start"
            className="input"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        {/* Cliff + Duration */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="label" htmlFor="cliff">CLIFF (DAYS)</label>
            <input
              id="cliff"
              className="input"
              type="number"
              min="0"
              value={cliffDays}
              onChange={(e) => setCliffDays(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="duration">TOTAL DURATION (DAYS)</label>
            <input
              id="duration"
              className="input"
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>
        </div>

        {/* Cancelable toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            role="switch"
            aria-checked={cancelable}
            onClick={() => setCancelable((c) => !c)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: cancelable ? "var(--signal)" : "var(--line-strong)",
              position: "relative",
              border: "none",
              cursor: "pointer",
              transition: "background 200ms",
            }}
          >
            <span style={{
              position: "absolute",
              top: 2,
              left: cancelable ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "var(--fg)",
              transition: "left 200ms",
            }} />
          </button>
          <span className="label" style={{ marginBottom: 0 }}>CANCELABLE</span>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div>
            {errors.map((e) => (
              <p key={e} className="error-text">{e}</p>
            ))}
          </div>
        )}

        {/* Approve/Create error */}
        {approveError && <p className="error-text">{approveError.message}</p>}
        {createError && <p className="error-text">{createError.message}</p>}

        {/* Approve tx pending */}
        {approveHash && approveReceipt.isPending && (
          <p className="micro">Approval pending... <a href={`${EXPLORER}/tx/${approveHash}`} target="_blank" rel="noopener noreferrer" className="link">View tx</a></p>
        )}

        {/* Actions */}
        <div className="button-row">
          {needsApproval ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit || approvePending || approveReceipt.isPending}
              onClick={handleApprove}
            >
              {approvePending ? "Confirm in wallet..." : approveReceipt.isPending ? "Approving..." : "Approve token"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit || createPending || createReceipt.isPending}
              onClick={handleCreate}
            >
              {createPending ? "Confirm in wallet..." : createReceipt.isPending ? "Creating..." : "Create stream"}
            </button>
          )}
        </div>

        {/* Summary */}
        {canSubmit && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <p className="micro" style={{ marginBottom: 8 }}>STREAM SUMMARY</p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 13 }}>
              <span className="micro">TO</span><span className="mono-data">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
              <span className="micro">TOKEN</span><span>{tokenMeta.symbol ?? token.slice(0, 10)}</span>
              <span className="micro">AMOUNT</span><span>{amount} {tokenMeta.symbol ?? ""}</span>
              <span className="micro">CLIFF</span><span>{cliffDays} days</span>
              <span className="micro">DURATION</span><span>{durationDays} days</span>
              <span className="micro">CANCELABLE</span><span>{cancelable ? "Yes" : "No"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
