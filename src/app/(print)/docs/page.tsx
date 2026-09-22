import type { Metadata } from "next";
import Reader from "@/components/reader/Reader";
import { label, typewriter } from "@/components/print/fonts";
import "@/styles/reader.css";

export const metadata: Metadata = {
  title: "Docs · Sheaf",
  description: "Sheaf documentation: getting started, CSV format, batch workflow, roles, demo vs real mode, execution, reconciliation and known limitations.",
};

export default function DocsPage() {
  return (
    <>
      <h1 className="sr-only">Sheaf documentation</h1>
      <Reader typeFont={typewriter.style.fontFamily} labelFont={label.style.fontFamily} />
    </>
  );
}
