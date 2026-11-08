import type { Metadata } from "next";
import StreamDetail from "./StreamDetail";

export const metadata: Metadata = { title: "Stream Detail" };

export default function StreamPage({ params }: { params: { id: string } }) {
  return <StreamDetail id={params.id} />;
}
