import type { Metadata } from "next";
import CreateStreamForm from "./CreateStreamForm";

export const metadata: Metadata = { title: "Create Stream" };

export default function CreateStreamPage() {
  return (
    <div>
      <h1 className="display-2 mb-8">CREATE STREAM</h1>
      <CreateStreamForm />
    </div>
  );
}
