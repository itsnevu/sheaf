"use client";
import { useEffect, useRef, useState } from "react";

interface Block {
  number: number;
  txCount: number;
  gasUsed: string;
  time: string;
}

function randomBlock(n: number): Block {
  return {
    number: n,
    txCount: (n * 17) % 40 + 1,
    gasUsed: (((n * 29) % 28) / 10 + 0.2).toFixed(2),
    time: "100 ms",
  };
}

export default function BlockFeed() {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const start = 25_946_600;
    return Array.from({ length: 6 }, (_, i) => randomBlock(start + i)).reverse();
  });
  const interval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    interval.current = setInterval(() => {
      setBlocks((prev) => {
        const next = randomBlock((prev[0]?.number ?? 25_946_600) + 1);
        return [next, ...prev.slice(0, 5)];
      });
    }, 3000);
    return () => clearInterval(interval.current);
  }, []);

  return (
    <div className="block-feed">
      <div className="block-feed-header">
        <span className="micro">LATEST BLOCKS</span>
        <span className="micro" style={{ color: "var(--success)" }}>
          <svg width="6" height="6" viewBox="0 0 6 6" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
          DEMO / SIMULATED
        </span>
      </div>
      <div className="block-feed-list">
        {blocks.map((b) => (
          <div key={b.number} className="block-feed-row">
            <span className="mono-data">#{b.number.toLocaleString("en-US")}</span>
            <span className="micro">{b.txCount} txns</span>
            <span className="micro">{b.gasUsed} Mgas</span>
            <span className="micro">{b.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
