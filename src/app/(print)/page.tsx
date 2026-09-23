import type { Metadata } from "next";
import Printer from "@/components/print/Printer";
import { pixel } from "@/components/print/fonts";

export const metadata: Metadata = {
  title: "Sheaf · The private execution desk for Robinhood Chain",
  description: "One controlled operation made of legs, executed from one desk. Claim, accumulate, OTC and treasury on Robinhood Chain without the owning wallet as the destination. Private externally. Transparent internally.",
};

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Sheaf. The private execution desk for Robinhood Chain.</h1>
      <Printer pixelFont={pixel.style.fontFamily} />
    </>
  );
}
