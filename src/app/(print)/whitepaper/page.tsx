import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/marketing/PageHero";
import DeploymentReference from "@/components/marketing/DeploymentReference";
import { Section } from "@/components/marketing/Section";

export const metadata: Metadata = {
  title: "Whitepaper",
  description: "Raqio technical whitepaper: the deployed Vault, Airdrop and Score contracts on Elysium Mainnet 99901, custody, vesting, fees and limitations.",
};

export default function WhitepaperPage() {
  return <>
    <PageHero label="RAQIO / WHITEPAPER / 8 NOVEMBER 2026" title="VALUE, RELEASED." second="RULES, DISCLOSED."
      description="The technical scope of the three deployed mainnet contracts. Custody, distribution, commitment scoring and the limits of each." />
    <Section tone="paper"><div className="container-site max-w-4xl">
      <article className="editorial-article"><h2>1. Abstract</h2>
        <p className="doc-body">Raqio records time-based token commitments on Elysium Mainnet, chain 99901.
          RaqioVault holds standard ERC-20 tokens, ERC-20 LP tokens and ERC-721 assets under explicit release terms.
          RaqioAirdrop distributes funded Merkle allocations, with optional vault vesting. RaqioScore calculates a bounded
          commitment indicator from vault records. Users sign deposits and claims from their wallets; the application server holds no signing key.</p>
      </article>
      <article className="editorial-article"><h2>2. Deployed contracts</h2><DeploymentReference /></article>
      <article className="editorial-article"><h2>3. Custody and release rights</h2>
        <p className="doc-body">A lock separates its owner from its beneficiary. The owner can perform only the management
          actions allowed for that lock type. The beneficiary receives principal through claims. Transferring lock ownership
          preserves the beneficiary. Fixed time locks can be extended but never shortened; eligible ERC-20 time locks support additions.
          Stream schedules cannot be extended or topped up.</p>
        <p className="doc-body">The vault has no administrative withdrawal function for locked principal. Its administrator
          controls the fee recipient and delayed fee changes. Generic NFT custody establishes custody and release timing;
          it does not authenticate an LP position, collect DEX fees or provide Uniswap V4 hook integration.</p>
      </article>
      <article className="editorial-article"><h2>4. Vesting model</h2>
        <p className="doc-body">Let A be the net stream amount after the creation fee, S the start time, C the cliff time,
          E the end time and Q the amount already claimed. Before C, vested(t) = 0. At or after E, vested(t) = A.
          Otherwise vested(t) = floor(A × (t − S) / (E − S)). The claimable amount is vested(t) − Q.</p>
        <p className="doc-body">The cliff delays claims; reaching it makes the accrual since S available. A cancelable
          stream lets its current owner end the schedule: vested but unclaimed tokens go to the beneficiary, and unvested
          tokens return to the owner. Non-cancelable streams cannot be cancelled. Release decisions use chain timestamps.</p>
      </article>
      <article className="editorial-article"><h2>5. Fees and supported assets</h2>
        <p className="doc-body">At deployment, ERC-20 lock and stream creation deducts floor(gross × 25 / 10,000),
          sending that fee directly to the configured fee recipient. The maximum is 50 bps. Fee proposals wait 48 hours
          before execution. NFT custody and additions to existing time locks do not charge the creation fee.</p>
        <p className="doc-body">Deposits must arrive in the exact gross amount; transfer-tax deposits are rejected.
          Rebasing and other non-standard accounting are unsupported. Token transfer restrictions can prevent payouts.
          Native HYPE pays gas; vault deposits use ERC-20 tokens or ERC-721 custody.</p>
      </article>
      <article className="editorial-article"><h2>6. Merkle distribution</h2>
        <p className="doc-body">A creator funds a campaign and commits an allocation root. Each leaf is
          keccak256(keccak256(abi.encode(address, uint256))). Sibling hashes are sorted; odd nodes are promoted.
          Allocation amounts are integer base units. The browser generates a downloadable proof manifest;
          the creator must retain and distribute proofs because only the root is stored on-chain.</p>
        <p className="doc-body">Each wallet claims once per campaign. Immediate claims transfer to the claimant;
          vested claims create a vault stream with the claimant as beneficiary and the campaign creator as owner.
          The vault creation fee reduces that stream&apos;s gross allocation. After expiry, the creator can recover
          that campaign&apos;s unclaimed remainder. Accounting separates claimed and recovered amounts.</p>
      </article>
      <article className="editorial-article"><h2>7. Commitment score</h2>
        <p className="doc-body">The score combines locked supply (up to 40 points), amount-weighted remaining duration
          (up to 20), registered LP locks (up to 20), active vesting (up to 10) and history (up to 10).
          LP relationships require owner registration; arbitrary NFTs are excluded. The scorer refuses tokens with more
          than 256 indexed vault records rather than returning a partial result.</p>
        <p className="doc-body">The indicator does not establish token safety, valuation, owner identity or fraud protection.
          Permissionless history can be influenced by third parties. Score administration can change the configured vault
          and LP associations; these powers must be considered when interpreting results.</p>
      </article>
      <article className="editorial-article"><h2>8. Security and operational scope</h2>
        <p className="doc-body">Addresses, amounts, timing, calldata and events are public. There is no shielded pool,
          zero-knowledge transfer or anonymity guarantee. Deployment receipts and local tests do not establish an independent
          audit or explorer source verification. Ownership uses two-step nomination and acceptance.</p>
        <p className="doc-body">Legacy desk operations have a separate demo/real mode and Relay integration. Their
          PrivateClaim, StealthDesk, OtcEscrow and DelegatedTreasury sources are outside this three-contract deployment.
          Legacy demo mode does not simulate vault or airdrop wallet actions. Cross-chain routing requires actual provider
          support and separately configured token addresses.</p>
      </article>
      <article className="editorial-article"><h2>9. Future work and tokenomics</h2>
        <p className="doc-body">This deployment includes no RAQIO token, staking contract, governance contract, buyback,
          burn distribution or fee-discount implementation. Tokenomics remains a draft proposal. Independent audit,
          scalable indexing, DEX-specific validation and cross-chain support are separate milestones.</p>
        <div className="button-row"><Link className="btn btn-primary" href="/docs">Protocol documentation</Link>
          <Link className="btn btn-secondary" href="/security">Security scope</Link>
          <a className="link" href="/whitepaper.md" download>Download Markdown ↗</a></div>
      </article>
    </div></Section>
  </>;
}
