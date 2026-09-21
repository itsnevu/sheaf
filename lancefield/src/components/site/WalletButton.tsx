"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { shortWallet } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";

/**
 * Sponsor sign-in with an injected wallet (MetaMask, Rabby, Coinbase Wallet…).
 * Flow: request accounts → fetch nonce → personal_sign the plain-text message → server verifies.
 * Nothing is sent on-chain and no funds move. Without an injected wallet the button explains why.
 */
declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

export default function WalletButton({ wallet, compact = false }: { wallet: string | null; compact?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (!window.ethereum) {
      toast("No wallet found in this browser. Install MetaMask or another injected wallet to sign in.", "danger");
      return;
    }
    setBusy(true);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No account selected");
      const { nonce, issuedAt, message } = await api<{ nonce: string; issuedAt: string; message: string }>("/api/auth/nonce", { json: { wallet: address } });
      const signature = (await window.ethereum.request({ method: "personal_sign", params: [message, address] })) as `0x${string}`;
      await api("/api/auth/verify", { json: { wallet: address, nonce, issuedAt, signature } });
      toast("Signed in. Prizes you post are tied to this wallet.", "success");
      router.refresh();
    } catch (e) {
      const msg = (e as Error).message || "Sign-in was cancelled";
      toast(/rejected|denied|cancel/i.test(msg) ? "Signature request was cancelled." : msg, "danger");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await api("/api/auth/signout", { method: "POST", json: {} });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-pill border border-line bg-paper-2 px-3 py-1.5 font-mono text-xs text-ink-soft sm:inline-flex" title={wallet}>
          <span className="h-1.5 w-1.5 rounded-full bg-moss" aria-hidden="true" />
          {shortWallet(wallet)}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    );
  }
  return (
    <button type="button" className={`btn btn-secondary ${compact ? "btn-sm" : ""}`} onClick={signIn} disabled={busy} aria-busy={busy || undefined}>
      {busy ? "Check your wallet…" : "Sign in with wallet"}
    </button>
  );
}
