import type { Metadata } from "next";
import CreateStreamForm from "./CreateStreamForm";

export const metadata: Metadata = { title: "Create Stream" };

export default function CreateStreamPage() {
  return <CreateStreamForm />;
}
