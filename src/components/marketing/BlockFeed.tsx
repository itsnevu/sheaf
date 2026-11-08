"use client";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { elysiumMainnet } from "@/lib/contracts/config";

export default function BlockFeed() {
  const client = usePublicClient({ chainId: elysiumMainnet.id });
  const blocks = useQuery({
    queryKey: ["mainnet-blocks", elysiumMainnet.id],
    enabled: !!client,
    queryFn: async () => {
      if (!client) throw new Error("RPC unavailable");
      if (await client.getChainId() !== elysiumMainnet.id) throw new Error("RPC network mismatch");
      const latest = await client.getBlock();
      const count = latest.number < 5n ? Number(latest.number) : 5;
      const previous = await Promise.all(Array.from({ length: count }, (_, i) => client.getBlock({ blockNumber: latest.number - BigInt(i + 1) })));
      return [latest, ...previous];
    },
    refetchInterval: 12000,
    retry: 1,
  });
  return <div className="block-feed">
    <div className="block-feed-header"><span className="micro">LATEST MAINNET BLOCKS</span>
      <span className="micro">{blocks.isError ? "RPC UNAVAILABLE" : blocks.data ? "CHAIN 99901 / RPC" : "READING RPC"}</span></div>
    {blocks.isPending && <p className="help p-4" role="status">Reading Elysium Mainnet blocks…</p>}
    {blocks.isError && <p className="help p-4" role="status">Could not refresh blocks. {blocks.data ? "The records below are from the last successful read." : "Try again when the RPC is available."}</p>}
    <div className="block-feed-list">{blocks.data?.map(b => <a className="block-feed-row" key={b.hash} href={`${elysiumMainnet.blockExplorers.default.url}/block/${b.number}`} target="_blank" rel="noreferrer">
      <span className="mono-data">#{b.number.toLocaleString("en-US")}</span>
      <span className="micro">{b.transactions.length} txns</span>
      <span className="micro">{(Number(b.gasUsed) / 1000000).toFixed(2)} Mgas</span>
      <span className="micro">{new Date(Number(b.timestamp) * 1000).toLocaleTimeString("en-GB", { timeZone: "UTC" })} UTC</span>
    </a>)}</div>
  </div>;
}
