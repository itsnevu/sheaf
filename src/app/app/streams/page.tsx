import type { Metadata } from "next";
import StreamsList from "./StreamsList";

export const metadata: Metadata = { title: "Streams" };

export default function StreamsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="title-2">Streams</h1>
        <a href="/app/streams/new" className="btn btn-primary">Create stream</a>
      </div>
      <StreamsList />
    </div>
  );
}
