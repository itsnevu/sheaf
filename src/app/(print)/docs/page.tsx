import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/marketing/PageHero";
import DeploymentReference from "@/components/marketing/DeploymentReference";
import { Section } from "@/components/marketing/Section";
import { elysiumMainnet } from "@/lib/contracts/config";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Raqio on Elysium Mainnet 99901: deployed contracts, token and LP locks, vesting, Merkle airdrops, fees and public proof.",
};
const SECTIONS = [
  ["getting-started", "Getting Started"], ["core-concepts", "Locks and Vesting"],
  ["creating-streams", "Creating Streams"], ["claiming", "Claiming Tokens"],
  ["canceling", "Managing Locks"], ["contract-ref", "Contract Reference"],
  ["security", "Security"], ["faq", "FAQ"],
];

export default function DocsPage() {
  return <>
    <PageHero label="RAQIO / DOCUMENTATION" title="THE DETAILS." second="IN PLAIN SIGHT."
      description="The deployed mainnet contracts, their rules, and the wallet workflow for locks, streams and airdrops." />
    <Section tone="paper"><div className="container-site editorial-layout">
      <aside className="editorial-index">
        <Link href="/docs/vault">Vault, locks & airdrops ↗</Link><Link href="/whitepaper">Whitepaper ↗</Link>
        <p className="micro mb-4">IN THIS MANUAL</p>
        {SECTIONS.map(([id, title], i) => <a key={id} href={`#${id}`}>{String(i + 1).padStart(2, "0")} / {title}</a>)}
      </aside>
      <div>
        <article className="editorial-article" id="getting-started">
          <p className="micro mb-3">DOCUMENT / 01</p><h2>Getting Started</h2>
          <p className="doc-body">Raqio is a token locking, vesting and distribution platform on Elysium Mainnet.
            RaqioVault holds token, LP and NFT locks and linear vesting streams. RaqioAirdrop distributes funded Merkle allocations.
            RaqioScore reads vault records to calculate a bounded commitment indicator.</p>
          <h3 className="doc-heading">Network Setup</h3>
          <div className="doc-table-wrap"><table className="doc-table"><tbody>
            <tr><td className="doc-td-label">Network</td><td>{elysiumMainnet.name}</td></tr>
            <tr><td className="doc-td-label">Chain ID</td><td>{elysiumMainnet.id}</td></tr>
            <tr><td className="doc-td-label">RPC URL</td><td><code className="break-all">{elysiumMainnet.rpcUrls.default.http[0]}</code></td></tr>
            <tr><td className="doc-td-label">Gas currency</td><td>{elysiumMainnet.nativeCurrency.symbol} ({elysiumMainnet.nativeCurrency.decimals} decimals)</td></tr>
            <tr><td className="doc-td-label">Explorer</td><td><a className="link break-all" href={elysiumMainnet.blockExplorers.default.url}>{elysiumMainnet.blockExplorers.default.url}</a></td></tr>
          </tbody></table></div>
          <h3 className="doc-heading">Connect and fund your wallet</h3>
          <p className="doc-body">Connect an injected EVM wallet such as MetaMask or Rabby. The app requests chain 99901 before
            contract writes. Keep native HYPE for gas and the actual ERC-20 token or NFT you intend to deposit.
            Mainnet transactions use real assets. Testnet faucets do not fund this network.</p>
          <div className="button-row"><Link href="/app/lock" className="btn btn-primary">Create a lock</Link><Link href="/explore" className="btn btn-secondary">Explore public records</Link></div>
        </article>
        <article className="editorial-article" id="core-concepts">
          <p className="micro mb-3">DOCUMENT / 02</p><h2>Locks and Vesting</h2>
          <p className="doc-body">ERC-20 token and LP locks release to their beneficiary after a fixed unlock time.
            Generic ERC-721 custody supports token ID zero, but does not verify a position&apos;s pool identity or collect trading fees.</p>
          <p className="doc-body">For streams, the net deposit vests linearly from start to end. Before the cliff, nothing is claimable.
            At the cliff, the amount accrued since the start becomes claimable. With net amount A, start S, cliff C and end E,
            vested(t) is zero before C, A at or after E, and floor(A × (t − S) / (E − S)) between them.
            The claimable amount subtracts tokens already claimed.</p>
          <p className="doc-body">The owner manages permitted lock settings; the beneficiary receives payouts. Transferring
            lock ownership preserves the beneficiary. The deployed vault has no method to change a stream beneficiary.</p>
        </article>
        <article className="editorial-article" id="creating-streams">
          <p className="micro mb-3">DOCUMENT / 03</p><h2>Creating Streams</h2>
          <p className="doc-body">Open <Link className="link" href="/app/lock/stream">Create a vault stream</Link>.
            Choose a beneficiary, token, amount, cliff duration, total duration and cancellation setting. The form starts vesting when the transaction executes;
            integrations calling the contract directly can supply a future start timestamp.
            Amounts use the token&apos;s on-chain decimals. Approve the vault for the gross deposit, then confirm the simulated contract call in your wallet.</p>
          <div className="doc-table-wrap"><table className="doc-table"><thead><tr><th>createStream parameter</th><th>Meaning</th></tr></thead><tbody>
            {[["beneficiary", "Wallet entitled to claim"], ["token", "Standard ERC-20 contract"], ["amount", "Gross deposit in integer base units"],
              ["startTime", "Start as a Unix timestamp"], ["cliffDuration", "Seconds from start until the cliff"],
              ["totalDuration", "Positive duration in seconds; at least the cliff duration"], ["cancelable", "Whether the lock owner can cancel"]].map(([key, value]) => <tr key={key}><td><code>{key}</code></td><td>{value}</td></tr>)}
          </tbody></table></div>
          <p className="doc-body">At deployment, the fee is 25 bps (0.25%): a gross 10,000-token deposit creates a
            9,975-token stream and sends 25 tokens to the fee recipient. The fee is capped at 50 bps; changes wait 48 hours.
            Forms read the current fee. NFT custody and additions to an existing time lock do not charge this creation fee.</p>
          <p className="doc-body">The deployed vault exposes single-stream creation. It has no <code>createBatch</code> function.
            For many recipients, use a <Link className="link" href="/app/airdrop">Merkle airdrop campaign</Link> with optional vesting;
            each recipient claims individually. Fee-on-transfer deposits are rejected, and rebasing tokens are unsupported.</p>
        </article>
        <article className="editorial-article" id="claiming">
          <p className="micro mb-3">DOCUMENT / 04</p><h2>Claiming Tokens</h2>
          <p className="doc-body">Open the public lock record at <code>/explore/[lockId]</code>. Anyone can read it.
            Only the beneficiary can call <code>claim(lockId)</code>. Time locks unlock at their end time;
            streams release their currently vested, unclaimed amount. Every claim requires native gas.</p>
          <p className="doc-body">Read <code>claimable(lockId)</code> without a transaction. Unclaimed vested tokens stay
            in the vault until claimed. A paused or restricted token may make transfers revert even when the schedule has vested.</p>
        </article>
        <article className="editorial-article" id="canceling">
          <p className="micro mb-3">DOCUMENT / 05</p><h2>Managing Locks</h2>
          <p className="doc-body">Only the lock owner can cancel a stream created with cancellation enabled.
            Cancellation sends the vested, unclaimed portion to the beneficiary and the unvested remainder to the current owner.
            Non-cancelable streams cannot be stopped.</p>
          <p className="doc-body">Fixed time locks can be extended, never shortened. Eligible ERC-20 time locks support
            additions. Streams cannot be extended or topped up. <code>transferLockOwnership</code> changes management rights,
            leaving the beneficiary unchanged.</p>
        </article>
        <article className="editorial-article" id="contract-ref">
          <p className="micro mb-3">DOCUMENT / 06</p><h2>Contract Reference</h2><DeploymentReference />
          <p className="doc-body">Download the generated ABIs above for exact function signatures, tuple fields and events.
            Stream IDs are vault lock IDs decoded from confirmed <code>StreamCreated</code> events.
            Legacy RaqioStream and FeeRouter interfaces are not part of this deployment.</p>
          <Link className="link" href="/docs/vault">Airdrop proofs, fee details and score limitations ↗</Link>
        </article>
        <article className="editorial-article" id="security">
          <p className="micro mb-3">DOCUMENT / 07</p><h2>Security</h2>
          <p className="doc-body">Deployment and local regression tests do not constitute an independent security audit.
            Contract owners, beneficiaries, amounts, timing and events remain public. No administrator can withdraw locked principal
            through a vault rescue function. The administrator can manage the fee recipient, delayed fee changes and score configuration.</p>
          <p className="doc-body">A commitment score does not validate token code, pool safety, identity or price.
            Check the network, token and recipient before signing. Read the <Link className="link" href="/security">security scope</Link>.</p>
        </article>
        <article className="editorial-article" id="faq">
          <p className="micro mb-3">DOCUMENT / 08</p><h2>FAQ</h2>
          <h3 className="doc-heading">Is Raqio on mainnet?</h3><p className="doc-body">Yes. The three contracts above are deployed on chain 99901.
            Independent audit and explorer source-verification status are separate from deployment.</p>
          <h3 className="doc-heading">Can I stream native HYPE?</h3><p className="doc-body">The vault accepts ERC-20 deposits and ERC-721 custody.
            Native HYPE pays gas. Any wrapped token must be checked independently before use.</p>
          <h3 className="doc-heading">Does this deploy a RAQIO token?</h3><p className="doc-body">No token, staking or governance contract was included.
            The tokenomics document remains a draft proposal.</p>
          <h3 className="doc-heading">Does demo mode protect vault transactions?</h3><p className="doc-body">Demo mode applies to legacy desk operations.
            Vault and airdrop wallet actions use the configured mainnet contracts and real assets, regardless of that desk setting.</p>
        </article>
      </div>
    </div></Section>
  </>;
}
