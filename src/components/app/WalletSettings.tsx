"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import WalletSignIn from "@/components/auth/WalletSignIn";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";

/** Settings block: the wallet that can sign in as this account. */
export default function WalletSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wallet-link"], queryFn: () => api<{ walletAddress: string | null }>("/api/auth/wallet/link") });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["wallet-link"] });
  const unlink = async () => {
    setBusy(true);
    try {
      await api("/api/auth/wallet/link", { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const address = q.data?.walletAddress ?? null;
  return (
    <section className="card p-6 space-y-4 mt-8">
      <h2 className="title-2">Wallet sign-in</h2>
      {address ? (
        <>
          <p className="text-[0.8125rem] text-ink-soft">
            This account signs in with <span className="font-mono text-ink">{address}</span>. The wallet signs a message; it never sends a transaction.
          </p>
          <Button variant="secondary" size="sm" loading={busy} onClick={unlink}>
            Unlink wallet
          </Button>
        </>
      ) : (
        <>
          <p className="text-[0.8125rem] text-ink-soft">Link an Ethereum wallet to sign in without a password. One wallet, one account.</p>
          <div className="max-w-sm">
            <WalletSignIn mode="link" onLinked={() => void refresh()} />
          </div>
        </>
      )}
    </section>
  );
}
