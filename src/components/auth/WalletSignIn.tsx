"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { createSiweMessage } from "viem/siwe";
import { api } from "@/lib/client";

/**
 * Sign-In with Ethereum through whatever wallet the browser injects (MetaMask, Rabby, Coinbase
 * Wallet, Brave). No wallet SDK, no third-party session: the wallet signs a SIWE message and
 * the server checks it. In "link" mode the same signature attaches the wallet to the account.
 */
type Eth = EIP1193Provider & { isMetaMask?: boolean; isRabby?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean };

function walletName(eth: Eth | undefined): string {
  if (!eth) return "wallet";
  if (eth.isRabby) return "Rabby";
  if (eth.isCoinbaseWallet) return "Coinbase Wallet";
  if (eth.isBraveWallet) return "Brave Wallet";
  if (eth.isMetaMask) return "MetaMask";
  return "wallet";
}

export default function WalletSignIn({ mode = "signin", next = "/app", onLinked }: { mode?: "signin" | "link"; next?: string; onLinked?: (address: string) => void }) {
  const router = useRouter();
  const [eth, setEth] = useState<Eth | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEth((window as unknown as { ethereum?: Eth }).ethereum);
  }, []);

  const run = async () => {
    if (!eth) return;
    setError(null);
    try {
      setBusy("Connecting…");
      const client = createWalletClient({ transport: custom(eth) });
      const [address] = await client.requestAddresses();
      if (!address) throw new Error("No account was shared by the wallet");
      const chainId = await client.getChainId();
      setBusy("Preparing message…");
      const { nonce } = await api<{ nonce: string }>("/api/auth/wallet/nonce");
      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        uri: window.location.origin,
        nonce,
        version: "1",
        statement: mode === "link" ? "Link this wallet to your Sheaf account." : "Sign in to Sheaf. No transaction, no fees.",
        expirationTime: new Date(Date.now() + 5 * 60_000),
      });
      setBusy("Confirm in your wallet…");
      const signature = await client.signMessage({ account: address, message });
      setBusy("Verifying…");
      if (mode === "link") {
        const res = await api<{ walletAddress: string }>("/api/auth/wallet/link", { method: "POST", json: { message, signature } });
        onLinked?.(res.walletAddress);
      } else {
        await api("/api/auth/wallet", { method: "POST", json: { message, signature } });
        router.push(next);
        router.refresh();
      }
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "Wallet sign-in failed";
      setError(/rejected|denied/i.test(msg) ? "Signature rejected in the wallet." : msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full">
      {eth ? (
        <button type="button" className="btn btn-primary w-full" onClick={run} disabled={!!busy} data-testid="wallet-signin">
          {busy ?? (mode === "link" ? `Link ${walletName(eth)}` : `Sign in with ${walletName(eth)}`)}
        </button>
      ) : (
        <div className="border border-ink px-4 py-3 text-[0.8125rem] text-ink-soft">
          No wallet found in this browser.{" "}
          <a href="https://metamask.io/download/" target="_blank" rel="noreferrer noopener" className="underline">
            Install MetaMask
          </a>{" "}
          or use the email form below.
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {mode === "signin" && eth && <p className="help">You sign a message, not a transaction. First sign-in creates a desk owned by the wallet.</p>}
    </div>
  );
}
