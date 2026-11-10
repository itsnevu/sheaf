"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { createSiweMessage } from "viem/siwe";
import { api } from "@/lib/client";
import { solanaSignInMessage } from "@/lib/auth/wallet-message";
type Sol = { connect(): Promise<{ publicKey: { toString(): string } }>; signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array } | Uint8Array> };
type Choice = { id: string; name: string; icon: string; eth?: Eth; sol?: Sol; install?: string };
const choices: Choice[] = [
  { id: "metamask", name: "MetaMask", icon: "/wallets/metamask.svg", install: "https://metamask.io/download/" },
  { id: "rabby", name: "Rabby", icon: "/wallets/rabby.svg", install: "https://rabby.io/" },
  { id: "phantom", name: "Phantom", icon: "/wallets/phantom.svg", install: "https://phantom.com/download" },
  { id: "solflare", name: "Solflare", icon: "/wallets/solflare.svg", install: "https://solflare.com/" },
];

/**
 * Sign-In with Ethereum through whatever wallet the browser injects (MetaMask, Rabby, Coinbase
 * Wallet, Brave). No wallet SDK, no third-party session: the wallet signs a SIWE message and
 * the server checks it. In "link" mode the same signature attaches the wallet to the account.
 */
type Eth = EIP1193Provider & { isMetaMask?: boolean; isRabby?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean };

export default function WalletSignIn({ mode = "signin", next = "/app", onLinked }: { mode?: "signin" | "link"; next?: string; onLinked?: (address: string) => void }) {
  const router = useRouter();
  const [wallets, setWallets] = useState<Choice[]>(choices);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const browser = window as unknown as { ethereum?: Eth & { providers?: Eth[] }; phantom?: { solana?: Sol }; solflare?: Sol };
    const discover = () => {
      setWallets(current => current.map(w => {
        if (w.id === "phantom") return { ...w, sol: browser.phantom?.solana };
        if (w.id === "solflare") return { ...w, sol: browser.solflare };
        const provider = (browser.ethereum?.providers ?? (browser.ethereum ? [browser.ethereum] : [])).find(p => w.id === "rabby" ? p.isRabby : p.isMetaMask && !p.isRabby);
        return provider ? { ...w, eth: provider } : w;
      }));
    };
    const announce = (event: Event) => {
      const detail = (event as CustomEvent<{ info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eth }>).detail;
      if (!detail?.info || !detail.provider) return;
      const { info, provider } = detail;
      const id = info.rdns === "io.metamask" ? "metamask" : info.rdns === "io.rabby" ? "rabby" : info.uuid;
      const knownWallet = choices.find(wallet => wallet.id === id);
      const icon = knownWallet?.icon ?? (info.icon?.startsWith("data:image/") ? info.icon : "");
      setWallets(current => [...current.filter(w => w.id !== id && w.eth !== provider), { ...knownWallet, id, name: info.name, icon, eth: provider }]);
    };
    window.addEventListener("eip6963:announceProvider", announce);
    window.addEventListener("ethereum#initialized", discover);
    discover();
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const timer = window.setTimeout(discover, 1000);
    return () => { clearTimeout(timer); window.removeEventListener("eip6963:announceProvider", announce); window.removeEventListener("ethereum#initialized", discover); };
  }, []);

  const run = async (wallet: Choice) => {
    if (busy || (!wallet.eth && !wallet.sol)) return;
    setError(null);
    try {
      setBusy("Connecting…");
      if (wallet.sol) {
        const { publicKey } = await wallet.sol.connect();
        const address = publicKey.toString();
        const { nonce } = await api<{ nonce: string }>("/api/auth/wallet/nonce");
        const message = solanaSignInMessage({ host: window.location.host, uri: window.location.origin, address, nonce, issuedAt: new Date().toISOString(), expirationTime: new Date(Date.now() + 300_000).toISOString(), link: mode === "link" });
        setBusy(`Confirm in ${wallet.name}`);
        const signed = await wallet.sol.signMessage(new TextEncoder().encode(message), "utf8");
        const bytes = signed instanceof Uint8Array ? signed : signed.signature;
        const signature = `0x${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`;
        const result = await api<{ walletAddress: string }>(mode === "link" ? "/api/auth/wallet/link" : "/api/auth/wallet", { method: "POST", json: { family: "solana", message, signature } });
        if (mode === "link") onLinked?.(result.walletAddress); else { router.push(next); router.refresh(); }
        return;
      }
      const client = createWalletClient({ transport: custom(wallet.eth!) });
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
        statement: mode === "link" ? "Link this wallet to your Raqio account." : "Sign in to Raqio. No transaction, no fees.",
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
      <p className="eyebrow mb-3">Choose your wallet</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {wallets.map(wallet => {
          const installed = !!(wallet.eth || wallet.sol);
          const content = <><span className="flex items-center gap-3">{wallet.icon && <Image src={wallet.icon} alt="" width={28} height={28} unoptimized className="h-7 w-7 object-contain" />}<span>{wallet.name}</span></span><span className="text-[10px] opacity-70">{installed ? wallet.sol ? "SOLANA" : "EVM" : "INSTALL ↗"}</span></>;
          const style = "flex min-h-[64px] items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-left text-[13px] text-fg hover:border-current disabled:opacity-50";
          return installed ? <button key={wallet.id} type="button" className={style} onClick={() => run(wallet)} disabled={!!busy} data-testid="wallet-signin">{content}</button> : <a key={wallet.id} className={style} href={wallet.install} target="_blank" rel="noreferrer noopener">{content}</a>;
        })}
      </div>
      {busy && <p role="status" className="help">{busy}</p>}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <p className="help">Sign a message to {mode === "link" ? "link your wallet" : "sign in"}. No gas fees.</p>
      <p className="help">Solana wallets support sign-in. Elysium transactions require an EVM wallet.</p>
    </div>
  );
}
