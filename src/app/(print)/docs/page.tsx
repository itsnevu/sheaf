import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Raqio documentation: getting started, core concepts, creating streams, claiming, canceling, contract reference, security and FAQ.",
};

const SECTIONS = [
  { id: "getting-started", code: "01", title: "Getting Started" },
  { id: "core-concepts", code: "02", title: "Core Concepts" },
  { id: "creating-streams", code: "03", title: "Creating Streams" },
  { id: "claiming", code: "04", title: "Claiming Tokens" },
  { id: "canceling", code: "05", title: "Canceling Streams" },
  { id: "contract-ref", code: "06", title: "Contract Reference" },
  { id: "security", code: "07", title: "Security" },
  { id: "faq", code: "08", title: "FAQ" },
];

export default function DocsPage() {
  return (
    <>
      <PageHero
        label="RAQIO / DOCUMENTATION"
        title="THE DETAILS."
        second="IN PLAIN SIGHT."
        description="Getting started, core concepts, contract reference, and security. The complete protocol manual."
      />
      <Section tone="paper">
        <div className="container-site editorial-layout">
          <aside className="editorial-index">
            <Link href="/docs/vault">Vault, locks & airdrops ↗</Link>
            <p className="micro mb-4">IN THIS MANUAL</p>
            {SECTIONS.map((s) => (
              <a href={`#${s.id}`} key={s.id}>
                {s.code} / {s.title}
              </a>
            ))}
          </aside>

          <div>
            {/* 01 GETTING STARTED */}
            <article className="editorial-article" id="getting-started">
              <p className="micro mb-3">DOCUMENT / 01</p>
              <h2>Getting Started</h2>

              <h3 className="doc-heading">What is Raqio</h3>
              <p className="doc-body">
                Raqio is a token vesting and streaming protocol deployed on Elysium L2. It enables senders to create
                linear vesting streams with cliff periods for any ERC-20 token. Recipients claim tokens as they vest,
                fully on-chain.
              </p>
              <p className="doc-body">
                The protocol consists of two contracts: <strong>RaqioStream.sol</strong> handles stream creation,
                vesting math, claims, and cancellations. <strong>FeeRouter.sol</strong> collects a 25 basis point
                fee on deposits and routes it to the protocol treasury.
              </p>

              <h3 className="doc-heading">Network Setup</h3>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <tbody>
                    <tr><td className="doc-td-label">Network</td><td>Elysium Testnet</td></tr>
                    <tr><td className="doc-td-label">Chain ID</td><td>99801</td></tr>
                    <tr><td className="doc-td-label">RPC URL</td><td><code>https://testnet-rpc.elysium.kinetiq.xyz</code></td></tr>
                    <tr><td className="doc-td-label">Currency</td><td>HYPE (18 decimals)</td></tr>
                    <tr><td className="doc-td-label">Block time</td><td>100 ms</td></tr>
                    <tr><td className="doc-td-label">Explorer</td><td><code>https://elysium.kinetiq.xyz/testnet-explorer</code></td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="doc-heading">Connect Your Wallet</h3>
              <p className="doc-body">
                Raqio works with any injected wallet: MetaMask, Rabby, Coinbase Wallet, or any browser extension
                that supports custom networks. Add the Elysium Testnet network using the details above, then
                navigate to <Link href="/sign-in" className="link">/sign-in</Link> and connect.
              </p>

              <h3 className="doc-heading">Get Testnet HYPE</h3>
              <p className="doc-body">
                You need HYPE to pay gas on Elysium. Claim testnet HYPE from the Elysium faucet. Testnet tokens
                have no real value.
              </p>
            </article>

            {/* 02 CORE CONCEPTS */}
            <article className="editorial-article" id="core-concepts">
              <p className="micro mb-3">DOCUMENT / 02</p>
              <h2>Core Concepts</h2>

              <h3 className="doc-heading">Streams</h3>
              <p className="doc-body">
                A stream is a deposit of ERC-20 tokens that vest linearly to a recipient over a defined period.
                The sender deposits tokens into the RaqioStream contract. The contract holds the tokens and
                releases them to the recipient according to the vesting schedule. The sender is never the
                custodian after deposit.
              </p>

              <h3 className="doc-heading">Linear Vesting</h3>
              <p className="doc-body">
                Tokens vest proportionally from the start time to the end time. If a stream runs from
                January 1 to January 31 with a deposit of 310 tokens, approximately 10 tokens vest per day.
                The recipient can claim whatever has vested at any point.
              </p>

              <h3 className="doc-heading">Cliff Period</h3>
              <p className="doc-body">
                A cliff is an initial waiting period during which nothing vests. Once the cliff passes,
                all tokens that would have vested during that period become claimable at once (catch-up).
                After the cliff, vesting continues linearly to the end time.
              </p>
              <p className="doc-body">
                Example: a 12-month stream with a 3-month cliff. Nothing vests for 3 months. On day 91,
                25% of the deposit becomes claimable. From then on, tokens vest daily until the end.
              </p>

              <h3 className="doc-heading">Cancelable Streams</h3>
              <p className="doc-body">
                Streams can be created with a <code>cancelable</code> flag. If cancelable, the sender can
                cancel the stream at any time. On cancellation, the already-vested portion goes to the
                recipient and the unvested remainder returns to the sender.
              </p>

              <h3 className="doc-heading">Non-Cancelable Streams</h3>
              <p className="doc-body">
                A non-cancelable stream is a permanent commitment. Once created, neither the sender nor
                anyone else can stop the vesting. The tokens will vest to the recipient on schedule, guaranteed
                by the contract.
              </p>
            </article>

            {/* 03 CREATING STREAMS */}
            <article className="editorial-article" id="creating-streams">
              <p className="micro mb-3">DOCUMENT / 03</p>
              <h2>Creating Streams</h2>

              <h3 className="doc-heading">Single Stream</h3>
              <p className="doc-body">
                To create a stream, call <code>createStream</code> with the following parameters:
              </p>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>recipient</code></td><td>address</td><td>The address that will receive vested tokens</td></tr>
                    <tr><td><code>token</code></td><td>address</td><td>The ERC-20 token to stream</td></tr>
                    <tr><td><code>deposit</code></td><td>uint256</td><td>Total amount to vest (before fee deduction)</td></tr>
                    <tr><td><code>startTime</code></td><td>uint256</td><td>Unix timestamp when vesting begins</td></tr>
                    <tr><td><code>cliffDuration</code></td><td>uint256</td><td>Seconds before any tokens vest (0 for no cliff)</td></tr>
                    <tr><td><code>totalDuration</code></td><td>uint256</td><td>Total vesting duration in seconds</td></tr>
                    <tr><td><code>cancelable</code></td><td>bool</td><td>Whether the sender can cancel the stream</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="doc-heading">Batch Create</h3>
              <p className="doc-body">
                Create up to 200 streams in one transaction with <code>createBatch</code>. All streams
                share the same token, start time, cliff duration, total duration, and cancelable flag.
                Only the recipients and deposit amounts differ. One token approval covers the entire batch.
              </p>

              <h3 className="doc-heading">Token Approval</h3>
              <p className="doc-body">
                Before creating a stream, you must approve the RaqioStream contract to spend your tokens.
                Call <code>approve(raqioStreamAddress, amount)</code> on the ERC-20 token contract. The
                approval amount must cover the full deposit including the protocol fee.
              </p>

              <h3 className="doc-heading">Protocol Fee</h3>
              <p className="doc-body">
                A fee of 25 basis points (0.25%) is deducted from each deposit and routed to the
                protocol treasury via FeeRouter.sol. For a deposit of 10,000 tokens, 25 tokens go to
                the treasury and 9,975 tokens vest to the recipient.
              </p>
            </article>

            {/* 04 CLAIMING TOKENS */}
            <article className="editorial-article" id="claiming">
              <p className="micro mb-3">DOCUMENT / 04</p>
              <h2>Claiming Tokens</h2>

              <h3 className="doc-heading">When to Claim</h3>
              <p className="doc-body">
                Recipients can claim vested tokens at any time after the cliff period has passed. There
                is no requirement to claim at specific intervals. Unclaimed tokens remain in the contract
                and continue to vest.
              </p>

              <h3 className="doc-heading">Partial Claims</h3>
              <p className="doc-body">
                Each call to <code>claim(streamId)</code> transfers whatever has vested since the last claim.
                The contract tracks total claimed amount. You can claim once a day, once a week, or wait
                until the stream completes. Call <code>claimable(streamId)</code> to check the current
                claimable amount without sending a transaction.
              </p>

              <h3 className="doc-heading">Gas Costs</h3>
              <p className="doc-body">
                Claims require HYPE gas on Elysium. At 100 ms block time and 300 Mgas/s throughput,
                gas costs are significantly lower than L1. Each claim is a single contract call.
              </p>
            </article>

            {/* 05 CANCELING STREAMS */}
            <article className="editorial-article" id="canceling">
              <p className="micro mb-3">DOCUMENT / 05</p>
              <h2>Canceling Streams</h2>

              <h3 className="doc-heading">Who Can Cancel</h3>
              <p className="doc-body">
                Only the original sender can cancel a stream, and only if the stream was created with
                <code> cancelable=true</code>. Non-cancelable streams cannot be stopped by anyone.
              </p>

              <h3 className="doc-heading">What Happens on Cancellation</h3>
              <p className="doc-body">
                The contract calculates the split at the moment of cancellation:
              </p>
              <ul className="doc-list">
                <li>Vested tokens (including any unclaimed from earlier) transfer to the recipient</li>
                <li>Unvested tokens return to the sender</li>
                <li>The stream is marked as canceled and no further vesting occurs</li>
                <li>The protocol fee (already collected at deposit time) is not refunded</li>
              </ul>

              <h3 className="doc-heading">After Cancellation</h3>
              <p className="doc-body">
                A canceled stream remains on-chain as a record. The recipient can still claim any
                vested tokens that were not yet claimed at the time of cancellation. No new tokens vest.
              </p>
            </article>

            {/* 06 CONTRACT REFERENCE */}
            <article className="editorial-article" id="contract-ref">
              <p className="micro mb-3">DOCUMENT / 06</p>
              <h2>Contract Reference</h2>

              <h3 className="doc-heading">RaqioStream.sol</h3>

              <h4 className="doc-subheading">Write Functions</h4>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr><th>Function</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>createStream(recipient, token, deposit, startTime, cliffDuration, totalDuration, cancelable)</code></td><td>Create a single vesting stream. Returns the stream ID.</td></tr>
                    <tr><td><code>createBatch(recipients[], token, deposits[], startTime, cliffDuration, totalDuration, cancelable)</code></td><td>Create up to 200 streams in one transaction. Returns stream IDs.</td></tr>
                    <tr><td><code>claim(streamId)</code></td><td>Claim all vested tokens for a stream. Caller must be the recipient. Returns amount claimed.</td></tr>
                    <tr><td><code>cancel(streamId)</code></td><td>Cancel a cancelable stream. Caller must be the sender. Splits vested/unvested.</td></tr>
                    <tr><td><code>changeRecipient(streamId, newRecipient)</code></td><td>Transfer recipient rights to a new address. Caller must be the current recipient.</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="doc-subheading">Read Functions</h4>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr><th>Function</th><th>Returns</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>getStream(streamId)</code></td><td>Full stream struct: sender, recipient, token, deposit, claimed, startTime, cliffTime, endTime, cancelable, canceled</td></tr>
                    <tr><td><code>claimable(streamId)</code></td><td>Amount currently claimable by the recipient (uint256)</td></tr>
                    <tr><td><code>nextStreamId()</code></td><td>The next stream ID that will be assigned (uint256)</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="doc-subheading">Events</h4>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr><th>Event</th><th>Indexed Fields</th><th>Data Fields</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code>StreamCreated</code></td><td>streamId, sender, recipient</td><td>token, deposit, startTime, cliffTime, endTime, cancelable</td></tr>
                    <tr><td><code>Claimed</code></td><td>streamId, recipient</td><td>amount</td></tr>
                    <tr><td><code>Canceled</code></td><td>streamId</td><td>senderAmount, recipientAmount</td></tr>
                    <tr><td><code>RecipientChanged</code></td><td>streamId, oldRecipient, newRecipient</td><td>&mdash;</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="doc-heading">FeeRouter.sol</h3>
              <p className="doc-body">
                FeeRouter manages the protocol fee. The fee is collected automatically when a stream
                is created. Key parameters:
              </p>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <tbody>
                    <tr><td className="doc-td-label">Current fee</td><td>25 basis points (0.25%)</td></tr>
                    <tr><td className="doc-td-label">Hard cap</td><td>50 basis points (0.50%)</td></tr>
                    <tr><td className="doc-td-label">Timelock</td><td>48 hours on fee changes</td></tr>
                    <tr><td className="doc-td-label">Event</td><td><code>FeeTaken(streamId, token, amount)</code></td></tr>
                  </tbody>
                </table>
              </div>
            </article>

            {/* 07 SECURITY */}
            <article className="editorial-article" id="security">
              <p className="micro mb-3">DOCUMENT / 07</p>
              <h2>Security</h2>

              <h3 className="doc-heading">Current Status</h3>
              <ul className="doc-list">
                <li>Raqio is deployed on Elysium Testnet only. Testnet tokens have no real value.</li>
                <li>The contracts have not been formally audited. A security audit will be completed before any mainnet deployment.</li>
                <li>All stream data (amounts, addresses, timing) is public on-chain.</li>
              </ul>

              <h3 className="doc-heading">On-Chain Transparency</h3>
              <p className="doc-body">
                Stream amounts, token addresses, sender and recipient addresses, start times, cliff times,
                end times, and every claim and cancellation event are recorded on-chain and visible to anyone.
                Do not use Raqio for streams that require confidentiality.
              </p>

              <h3 className="doc-heading">Threat Model</h3>
              <p className="doc-body">
                For a detailed analysis of threats, mitigations, and accepted risks, see the{" "}
                <Link href="/security" className="link">security and threat model page</Link>.
              </p>
            </article>

            {/* 08 FAQ */}
            <article className="editorial-article" id="faq">
              <p className="micro mb-3">DOCUMENT / 08</p>
              <h2>FAQ</h2>

              <h3 className="doc-heading">Can I change the recipient of a stream?</h3>
              <p className="doc-body">
                Yes. The current recipient can call <code>changeRecipient(streamId, newRecipient)</code>
                to transfer their claim rights to a different address. Only the current recipient can
                initiate this transfer.
              </p>

              <h3 className="doc-heading">What happens if the token contract is paused?</h3>
              <p className="doc-body">
                The stream continues to vest according to its schedule. However, claim transactions will
                revert because the token transfer will fail. Once the token is unpaused, the recipient
                can claim all accumulated vested tokens.
              </p>

              <h3 className="doc-heading">Is there a minimum deposit?</h3>
              <p className="doc-body">
                There is no minimum deposit enforced by the contract. However, very small deposits may
                not be practical given gas costs for creation and claiming.
              </p>

              <h3 className="doc-heading">Can I stream native HYPE?</h3>
              <p className="doc-body">
                No. Raqio supports ERC-20 tokens only. To stream HYPE, you would need to wrap it as
                WHYPE (wrapped HYPE) first, if such a wrapper contract exists on Elysium.
              </p>

              <h3 className="doc-heading">What if I send tokens to the wrong recipient?</h3>
              <p className="doc-body">
                If the stream is cancelable, you can cancel it immediately. The unvested portion returns
                to you. Any tokens that have already vested belong to the recipient. If the stream is
                non-cancelable, you cannot recover the tokens.
              </p>

              <h3 className="doc-heading">Can multiple streams use the same token?</h3>
              <p className="doc-body">
                Yes. You can create any number of streams for the same ERC-20 token, to the same or
                different recipients, with the same or different schedules. Each stream is independent.
              </p>

              <h3 className="doc-heading">When will Raqio deploy to mainnet?</h3>
              <p className="doc-body">
                A mainnet deployment on Elysium (Chain ID 99901) will follow after a completed security
                audit. No timeline has been announced. Follow the{" "}
                <Link href="/#roadmap" className="link">roadmap</Link> for updates.
              </p>
            </article>
          </div>
        </div>
      </Section>
    </>
  );
}
