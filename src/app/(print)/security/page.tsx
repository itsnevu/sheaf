import type { Metadata } from "next";
import Fiche from "@/components/fiche/Fiche";
import { label, typewriter } from "@/components/print/fonts";
import "@/styles/fiche.css";

export const metadata: Metadata = {
  title: "Security · Sheaf",
  description: "Honest scope: what Sheaf protects and what it cannot. Who can see what, what is implemented and tested, what is not, and the on-chain reality.",
};

export default function SecurityPage() {
  return (
    <>
      <h1 className="sr-only">Security and privacy: what Sheaf protects, and what it cannot</h1>
      <Fiche labelFont={label.style.fontFamily} textFont={typewriter.style.fontFamily} />
    </>
  );
}
