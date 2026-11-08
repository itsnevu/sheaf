import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/marketing/PageHero";
import DeploymentReference from "@/components/marketing/DeploymentReference";
import { Section } from "@/components/marketing/Section";
import { OBSERVERS, IMPLEMENTED, NOT_IMPLEMENTED } from "@/components/fiche/sheet";

export const metadata: Metadata = { title: "Security", description: "Raqio mainnet custody, administrator powers, public visibility, ownership status and separate legacy desk threat model." };
export default function SecurityPage() {
  return <>
    <PageHero label="RAQIO / SECURITY & PRIVACY MODEL" title="HONEST SCOPE." second="VISIBLE RULES."
      description="The deployed Vault, Airdrop and Score contracts use Elysium Mainnet. Wallet actions use real assets; contract records are public." />
    <Section tone="paper"><div className="container-site max-w-4xl">
      <article className="editorial-article"><h2>Mainnet deployment and ownership</h2><DeploymentReference /></article>
      <div className="security-list">
        <article><h3>Custody and administrator powers</h3><p>The vault has no administrative withdrawal function for locked principal.
          Beneficiaries claim under their schedules. Lock owners can manage only the actions permitted by the lock type,
          including cancellation when enabled. The protocol administrator can change the fee recipient, propose and execute delayed
          fee changes, and configure score vault/LP associations. Two-step ownership nomination is separate from transferring individual lock ownership.</p></article>
        <article><h3>What stays public</h3><p>Owners, beneficiaries, token contracts, amounts, timestamps, calldata and events are public.
          Vault locks and airdrop claims do not hide wallet links. The commitment score is a bounded indicator from vault records;
          it does not certify token code, pool safety, identity or price.</p></article>
        <article><h3>Token and application risks</h3><p>Transfer-tax deposits are rejected; rebasing tokens are unsupported.
          Paused or restricted tokens can make claims revert. NFT custody does not authenticate a DEX position.
          Check contract addresses and chain 99901 before signing. Legacy desk demo mode does not simulate vault or airdrop wallet transactions.</p></article>
        <article><h3>Verification scope</h3><p>Mainnet code, contract links, fee and ownership were checked through RPC on 8 November 2026.
          Deployment receipts and local regression coverage do not establish an independent audit or explorer source verification.
          Read the <Link className="link" href="/whitepaper">whitepaper</Link> and <Link className="link" href="/docs/vault">contract rules</Link>.</p></article>
      </div>
    </div></Section>
    <Section tone="navy"><div className="container-site">
      <div className="section-intro"><h2 className="display-2">THE LEGACY<br/><span className="second-line">DESK MODEL.</span></h2>
        <p className="lede mt-6">The following concerns the separate execution desk. PrivateClaim, StealthDesk, OtcEscrow and
          DelegatedTreasury were not included in the three-contract mainnet deployment. Their on-chain rules describe source implementations;
          the current legacy Relay console does not call them.</p></div>
      <div className="security-observers">{OBSERVERS.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="security-list mt-12"><article><h3>Desk and source implementation</h3><ul>{IMPLEMENTED.map(t => <li key={t}>{t}</li>)}</ul></article>
        <article><h3>Outside the desk scope</h3><ul>{NOT_IMPLEMENTED.map(t => <li key={t}>{t}</li>)}</ul></article></div>
      <p className="micro mt-10">SEC-01 / ELYSIUM MAINNET 99901 / THREE DEPLOYED CONTRACTS / PUBLIC ON-CHAIN RECORDS</p>
    </div></Section>
  </>;
}
