import type { Metadata } from "next";
import HomeClient from "@/components/marketing/HomeClient";

export const metadata: Metadata = {
  title: "Raqio · Token vesting and streaming on Elysium",
  description: "Linear vesting streams with cliff periods on Elysium L2. 25 bps fee, batch up to 200 streams, fully on-chain. Recipients claim as tokens vest.",
};

export default function HomePage() {
  return (
    <>
      <HomeClient />
    </>
  );
}
