import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { ArtCredit } from "./EngravingArt";
import XLink from "./XLink";
export default function Footer(){return <footer className="engraving-footer" data-tone="navy"><div className="container-site">
 <div className="footer-grid"><div><Wordmark/><p>Token vesting and streaming<br/>on Elysium. Value, released in time.</p><XLink/></div><div><p className="micro">EXPLORE</p><Link href="/">Home</Link><Link href="/#capabilities">Capabilities</Link><Link href="/#fees">Protocol fees</Link></div><div><p className="micro">RESOURCES</p><Link href="/docs">Documentation</Link><Link href="/whitepaper">Whitepaper</Link><Link href="/docs#contract-ref">Mainnet contracts</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy notice</Link></div><div><p className="micro">YOUR DESK</p><Link href="/app">Open the desk ↗</Link><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create an account</Link></div></div>
 <div className="footer-colophon"><ArtCredit/><p className="micro">© {new Date().getFullYear()} Raqio / Elysium Mainnet / Chain 99901</p></div>
 </div></footer>;}
