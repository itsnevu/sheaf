import type { Metadata } from "next";
import HomeClient from "@/components/marketing/HomeClient";

export const metadata: Metadata = {
  title: "Raqio · Token vesting and streaming on Elysium",
  description: "Token locks, LP and NFT custody, vesting streams and Merkle airdrops on Elysium Mainnet 99901. View deployed addresses and public proof.",
};

export default function HomePage() {
  return (
    <>
      <HomeClient />
    </>
  );
}
