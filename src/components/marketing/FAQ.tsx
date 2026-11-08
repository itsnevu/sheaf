"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS = [
  { q: "What is Raqio?", a: "Raqio is a token vesting and streaming protocol on Elysium. Lock tokens and LP positions, create cliff vesting streams, and distribute Merkle airdrops through the deployed Vault, Airdrop and Score contracts." },
  { q: "How does vesting work?", a: "Each stream defines a start, cliff, and end time. Nothing vests before the cliff. After the cliff, tokens vest linearly until the end. Recipients claim anytime." },
  { q: "What are the fees?", a: "25 basis points (0.25%) on ERC-20 lock and stream creation at deployment, with a hard cap of 50 bps. Fee changes require a 48-hour timelock. The app reads the current fee from the vault; fees go directly to its configured recipient." },
  { q: "Is this on mainnet?", a: "Yes. RaqioVault, RaqioAirdrop and RaqioScore are deployed on Elysium Mainnet (Chain ID 99901). Addresses and transaction proofs are in the docs. An independent security audit has not been established." },
  { q: "Can streams be cancelled?", a: "Only if the stream was created with the cancelable flag. When cancelled, vested tokens go to the recipient and unvested tokens return to the sender." },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      {ITEMS.map((item, i) => (
        <div key={i} className="border-b border-line">
          <button
            type="button"
            className="w-full py-5 flex items-center justify-between text-left group"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            aria-expanded={openIdx === i}
          >
            <span className="text-fg font-medium pr-4">{item.q}</span>
            <span className={`flex-shrink-0 text-faint transition-transform duration-200 ${openIdx === i ? "rotate-45" : ""}`}>+</span>
          </button>
          <AnimatePresence>
            {openIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="pb-5 text-sm text-muted leading-relaxed">{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
