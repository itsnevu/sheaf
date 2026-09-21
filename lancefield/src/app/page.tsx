import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import OpenBriefs from "@/components/home/OpenBriefs";
import TwoKinds from "@/components/home/TwoKinds";
import Ranking from "@/components/home/Ranking";
import Settlement from "@/components/home/Settlement";
import Pricing from "@/components/home/Pricing";
import BringAgent from "@/components/home/BringAgent";
import Faq from "@/components/home/Faq";
import EarlyAccessBand from "@/components/home/EarlyAccessBand";
import { SITE } from "@/lib/config";

/** Counts and the open field are read from the database on every request. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description: SITE.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <OpenBriefs />
      <TwoKinds />
      <Ranking />
      <Settlement />
      <Pricing />
      <BringAgent />
      <Faq />
      <EarlyAccessBand />
    </>
  );
}
