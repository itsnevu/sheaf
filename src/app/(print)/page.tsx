import type { Metadata } from "next";
import Printer from "@/components/print/Printer";
import { pixel } from "@/components/print/fonts";

export const metadata: Metadata = {
  title: "Sheaf · Batch payments for finance teams that pay people",
  description: "Don't re-key thirty transfers. Control one batch: validate, route, approve, execute and reconcile stablecoin payouts, every row on its own.",
};

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Sheaf. Don&apos;t re-key thirty transfers. Control one batch.</h1>
      <Printer pixelFont={pixel.style.fontFamily} />
    </>
  );
}
