"use client";
import Link from "next/link";
import EngravingArt,{ArtCredit} from "./EngravingArt";
import GrainVideoPanel from "./GrainVideoPanel";
import CodeBlock from "./CodeBlock";
import FAQ from "./FAQ";
import Roadmap from "./Roadmap";
import EngravedMachine from "./EngravedMachine";
import EcosystemGrid from "./EcosystemGrid";
import Tokenomics from "./Tokenomics";
import BlockFeed from "./BlockFeed";
import SankeyFlow from "./SankeyFlow";
import MobileBottomNav from "./MobileBottomNav";
import ProductCards from "./ProductCards";
import TrustScore from "./TrustScore";
import {Section,Eyebrow,RevealGroup} from "./Section";

const FEATURES=[
 ['Linear vesting','Tokens vest linearly from start to end. Nothing before the cliff, everything after the end.','RaqioStream.sol'],
 ['Batch create','Create up to 200 streams in one transaction. One approval, one receipt.','RaqioStream.sol'],
 ['Cancel & refund','Cancelable streams split: vested to recipient, unvested back to sender.','RaqioStream.sol'],
 ['Fee routing','25 bps fee on deposits. 48-hour timelock on changes. Hard cap at 50 bps.','FeeRouter.sol'],
 ['Cliff periods','Define recipient, amount, cliff, and duration. The contract holds the tokens.','TIME-BASED RELEASE'],
 ['Claim anytime','Recipients claim vested tokens anytime. Fully on-chain, fully transparent.','RECIPIENT-CONTROLLED'],
];
const STEPS=[['Get tokens','Claim testnet tokens from the Elysium faucet to fund your desk.'],['Fund the desk','Deposit into the desk contract. The desk holds the balance, not your wallet.'],['Create a stream','Define recipient, amount, cliff, and duration. The contract holds the tokens.'],['Claim as tokens vest','Recipients claim vested tokens anytime. Fully on-chain, fully transparent.']];
export default function HomeClient(){return <>
 <section className="electric-hero" data-tone="electric" id="hero">
  <div className="container-site hero-grid">
   <div className="hero-illustration"><EngravingArt interactive/></div>
   <div className="hero-copy"><Eyebrow><span className="status-dot"/> ELYSIUM TESTNET / CHAIN 99801</Eyebrow><h1 className="display-xl">TOKEN VESTING.<br/><span>FOR ELYSIUM.</span></h1><p className="lede">Linear streams with cliff periods, 25 bps fee, batch up to 200. Recipients claim as tokens vest. Fully on-chain on <Link href="/docs" className="link">Elysium L2</Link>.</p><div className="button-row"><Link href="/sign-in" className="btn btn-primary">↗ Start building</Link><Link href="/docs" className="btn btn-secondary">Read the docs</Link></div><p className="hero-meta micro">ON-CHAIN / LINEAR RELEASE / BUILT FOR TEAMS</p></div>
  </div>
  <div className="container-site hero-baseline"><p className="micro">VALUE, RELEASED IN TIME.</p><p className="micro">TESTNET TOKENS HAVE NO REAL VALUE</p><a href="#showcase" className="micro">SCROLL TO EXPLORE ↓</a></div>
 </section>
 <Section id="showcase" tone="navy" className="dither-transition"><div className="container-site">
  <RevealGroup className="section-intro"><h2 className="display-2 reveal">YOUR TOKEN.<br/><span className="second-line">ONE STREAM.</span></h2><p className="lede reveal">Sender deposits. Contract holds. Recipient claims as tokens vest. The sender is never the custodian after deposit.</p></RevealGroup>
  <GrainVideoPanel/>
  <div className="numbered-row">{STEPS.map(([title,desc],i)=><div key={title}><span className="step-number">0{i+1}</span><h3 className="micro">{title}</h3><p>{desc}</p></div>)}</div>
  <div className="spec-line micro"><span>100 MS BLOCK TIME</span><span>300 MGAS/S THROUGHPUT</span><span>600× VS L1 COST*</span><span>FULLY ON-CHAIN</span></div><p className="micro benchmark-note">*Network figures from the existing product specification; not a live benchmark.</p><ArtCredit/>
 </div></Section>
 <Section tone="paper" id="products"><div className="container-site"><div className="section-intro"><h2 className="display-2">LOCK. VEST.<br/><span className="second-line">DISTRIBUTE.</span></h2><p className="lede mt-6">Time locks, LP positions, vesting streams and Merkle distributions. Public records on Elysium.</p></div><ProductCards/></div></Section>
 <Section tone="navy" id="trust"><div className="container-site product-grid"><div><h2 className="display-2">VISIBLE TERMS.<br/><span className="second-line">VERIFIABLE RECORDS.</span></h2><p className="lede mt-6">Read supply commitments and vesting from the vault. No score is shown without contract data.</p><Link href="/explore" className="btn btn-primary mt-8">Explore public locks ↗</Link></div><TrustScore/></div></Section>
 <Section tone="paper" id="capabilities"><div className="container-site">
  <RevealGroup className="section-intro"><h2 className="display-2 reveal">SET THE TERMS.<br/><span className="second-line">LET VALUE FLOW.</span></h2><p className="lede reveal">Four operations, two contracts. One clear schedule from deposit to the final claim.</p></RevealGroup>
  <RevealGroup className="feature-grid">{FEATURES.map(([title,desc,contract],i)=><article className="feature-card reveal" key={title}><div className="feature-image"><EngravedMachine variant={i}/><span className="micro feature-figure">PLATE / 0{i+1}</span></div><span className="tag-chip">#0{i+1} {contract}</span><h3>{title}</h3><p>{desc}</p></article>)}</RevealGroup>
 </div></Section>
 <Section tone="navy" id="product"><div className="container-site product-grid">
  <div><h2 className="display-2">A SCHEDULE.<br/><span className="second-line">NOT A PROMISE.</span></h2><div className="product-rules">{[['TIMING','Nothing before the cliff','Linear release until end time. Nothing vests before the cliff.'],['CUSTODY','The contract holds','Stream amounts and timing, the contract address, and every emitted event stay public.'],['CONTROL','Cancel, when permitted','Cancel returns unvested tokens to the sender. Vested tokens belong to the recipient.']].map(([tag,title,desc])=><div key={tag}><p className="micro">{tag}</p><h3>{title}</h3><p>{desc}</p></div>)}</div></div>
  <div className="transcript"><div className="transcript-top micro"><span>STREAM / AN ILLUSTRATED EXAMPLE</span><span>↗</span></div><div className="transcript-message"><span className="micro">SENDER</span><p>One recipient.<br/>A defined cliff.<br/>A linear vesting schedule.</p></div><div className="stream-diagram" aria-label="Deposit, cliff, linear vesting, then full release"><span>DEPOSIT</span><svg viewBox="0 0 400 160" fill="none" aria-hidden="true"><path d="M0 140H100L360 20H400"/><path d="M100 0V160M360 0V160" strokeDasharray="2 6"/></svg><div><span>CLIFF</span><span>END TIME</span></div></div><div className="transcript-message"><span className="micro">RAQIO</span><p>Tokens vest to the schedule.<br/>The recipient claims as they vest.</p></div><p className="transcript-status micro"><span className="status-dot"/> CONTRACT-HELD / CLAIMABLE OVER TIME</p></div>
 </div></Section>
 <Section tone="paper" id="connect"><div className="container-site"><div className="section-intro"><h2 className="display-2">FROM FAUCET.<br/><span className="second-line">TO FIRST STREAM.</span></h2><p className="lede">The network details, ready for your desk.</p></div><div className="platform-grid">
  <CodeBlock title="01 / Network" code={'Network: Elysium Testnet\nChain ID: 99801\nCurrency: HYPE'}/><CodeBlock title="02 / RPC endpoint" code="https://testnet-rpc.elysium.kinetiq.xyz"/><CodeBlock title="03 / Explorer" code="https://elysium.kinetiq.xyz/testnet-explorer"/>
 </div><div className="button-row"><Link href="/sign-in" className="btn btn-primary">↗ Open the desk</Link><Link href="/docs" className="btn btn-secondary">Setup documentation</Link></div></div></Section>
 <Section tone="navy" id="requirements"><div className="container-site requirements-grid"><div><h2 className="display-2">KNOW<br/><span className="second-line">THE SCOPE.</span></h2></div><div><div className="requirement"><span className="micro">01 / NETWORK</span><p>Elysium Testnet, Chain ID 99801. Testnet tokens have no real value.</p></div><div className="requirement"><span className="micro">02 / VISIBILITY</span><p>Stream amounts, timing, contract addresses, and events remain public on-chain.</p></div><div className="requirement"><span className="micro">03 / CANCELLATION</span><p>Only streams created with the cancelable flag can be cancelled.</p></div><Link href="/security" className="link micro">Read the honest scope ↗</Link></div></div></Section>
 <Section tone="navy" id="fees" className="fee-section"><div className="container-site"><div className="section-intro"><h2 className="display-2">CLEAR TERMS.<br/><span className="second-line">ON-CHAIN RULES.</span></h2><p className="lede">The deposit fee routes to the protocol treasury.</p></div><div className="fee-grid">{[['25','BPS / DEPOSIT','0.25% on each deposit.','The current protocol fee.'],['48','HOURS / TIMELOCK','Fee changes require a 48-hour timelock.','Changes cannot take effect immediately.'],['50','BPS / HARD CAP','The fee cannot exceed 50 basis points.','An upper limit enforced in code.']].map(([value,label,desc,note])=><article key={label}><p className="micro">{label}</p><p className="fee-value">{value}<span>{value==='48'?'h':'bps'}</span></p><p>{desc}</p><p className="micro">{note}</p><Link href="/docs" className="btn btn-secondary">Read the mechanics ↗</Link></article>)}</div></div></Section>
 <Section tone="electric" id="roadmap"><div className="container-site roadmap-grid"><div><h2 className="display-2">LIVE NOW.<br/><span className="second-line">BUILT FOR NEXT.</span></h2><EngravingArt variant={4} className="roadmap-art"/><ArtCredit/></div><div><Roadmap/><p className="micro">Testnet first. Security audit before mainnet.</p></div></div></Section>
 <Section tone="paper" id="faq"><div className="container-site faq-grid"><div><h2 className="display-2">THE FINER<br/><span className="second-line">DETAILS.</span></h2></div><FAQ/></div></Section>
 <Section tone="navy" id="flow"><div className="container-site">
  <RevealGroup className="section-intro"><h2 className="display-2 reveal">WHERE YOUR<br/><span className="second-line">TOKENS GO.</span></h2><p className="lede reveal">Sender deposits. 99.75% vests to recipient. 0.25% routes to the protocol treasury.</p></RevealGroup>
  <RevealGroup><div className="reveal"><SankeyFlow/></div></RevealGroup>
 </div></Section>
 <Section tone="paper" id="ecosystem"><div className="container-site">
  <RevealGroup className="section-intro"><h2 className="display-2 reveal">THE STACK<br/><span className="second-line">BEHIND RAQIO.</span></h2><p className="lede reveal">Six components. One vesting pipeline.</p></RevealGroup>
  <RevealGroup><div className="reveal"><EcosystemGrid/></div></RevealGroup>
 </div></Section>
 <Section tone="navy" id="tokenomics"><div className="container-site">
  <RevealGroup className="section-intro"><h2 className="display-2 reveal">ALIGNED.<br/><span className="second-line">BY DESIGN.</span></h2><p className="lede reveal">Token parameters will be published when a token deployment is configured.</p></RevealGroup>
  <RevealGroup><div className="reveal"><Tokenomics/></div></RevealGroup>
 </div></Section>
 <Section tone="navy" id="blocks"><div className="container-site">
  <div className="product-grid"><div><h2 className="display-2">BLOCKS.<br/><span className="second-line">IN REAL TIME.</span></h2><p className="lede">Elysium produces blocks every 100 ms. Watch the chain move.</p></div><div><BlockFeed/></div></div>
 </div></Section>
 <Section tone="electric" id="final-cta" className="final-cta"><div className="container-site"><h2 className="display-2">VALUE HAS A TIMELINE.<br/><span className="second-line">GIVE IT A STREAM.</span></h2><div className="button-row"><Link href="/sign-in" className="btn btn-primary">↗ Open the desk</Link><Link href="/security" className="btn btn-secondary">Honest scope</Link></div><p className="micro">RAQIO / TOKEN VESTING & STREAMING / ELYSIUM</p></div></Section>
 <MobileBottomNav/>
 </>;}
