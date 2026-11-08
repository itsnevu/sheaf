import Link from "next/link";
import VaultForm from "@/components/app/VaultForm";
export const metadata={title:'Lock liquidity'};
export default function LPPage(){return <><div className="button-row mb-8"><Link className="btn btn-secondary" href="/app/lock/nft">Lock an ERC-721 position instead ↗</Link></div><VaultForm kind="lp"/></>;}
