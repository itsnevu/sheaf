# Sheaf privacy threat model

Positioning: **"Private externally. Transparent internally."** Sheaf is the private execution desk for Robinhood Chain (chain id 4663). This document states what that means in practice, who can see what, and what Sheaf does and does not promise. The Relay observations come from `docs/research/relay-integration-research.md`; the on-chain observations for Robinhood Chain are stated as assumptions until verified.

## 1. What privacy means here

Privacy means one thing: **the wallet that owns the funds or the eligibility does not appear as the destination on-chain.** A claim lands in a fresh recipient, an accumulation plan lands in fresh recipients, an OTC block settles into a receive-into address, a delegated payout goes to its payee without the desk wallet being the payee.

What stays visible, always:

- amounts and assets of every leg;
- timing of every leg (block timestamps, and internally the not-before and actual times);
- the desk contract addresses (`PrivateClaim`, `StealthDesk`, `OtcEscrow`, `DelegatedTreasury`) and, today, the desk wallet or a Relay solver as the on-chain sender;
- everything inside the desk: labels, memos, addresses, approvals, the audit trail.

Words never used in the product or the docs: anonymous, untraceable, unlinkable, invisible, hidden from the blockchain.

## 2. Privacy objectives

1. Keep the owning or eligible wallet out of the destination field of every leg.
2. Keep every leg fully visible **internally** (desk operators, approvers, auditors) with immutable-by-policy audit events.
3. Never trade auditability or legal obligations for privacy.
4. Never describe an operation as anonymous, untraceable, or unlinkable.

## 3. Observers

| Observer | What they can access |
|---|---|
| Block explorers, indexers, analytics firms | All on-chain data on Robinhood Chain: sender, receiver, amount, token, timestamp, calldata, contract interactions, including every call to a desk contract. |
| Sequencer / RPC providers | Same as above plus the submitting IP and timing. The browser's RPC provider sees the desk wallet with the operator's IP. |
| Relay (route provider and its solvers) | Every quote (`user`, `recipient`, amount, chains), every deposit, every fill. Relay also **publicly** exposes request metadata via `GET /requests/v2` and its transaction explorer: `user` → `recipient` pairs are listed without authentication (verified live on Base). |
| Wallet provider (MetaMask, WalletConnect relays) | The desk wallet, every transaction it signs, the dapp origin. |
| Robinhood (issuer of Stock Tokens) | Transfer restrictions on sender and receiver mean the issuer's allowlist sees every Stock Token movement; a fresh unverified address cannot receive them. |
| Sheaf backend operators (hosting, DB admins) | Everything in the database: labels, addresses, amounts, memos, CSV originals, approvals, audit trail (labels, memos and CSV originals encrypted at rest with one server key). |
| Desk operators and approvers | Everything in their desk, by design. Viewers see redacted addresses. |
| Counterparties and recipients | Their own incoming transaction, its sender (desk wallet, solver or desk contract), amount, timestamp. |

Assumed adversary goal: link "this desk wallet" to "these fresh recipients, counterparties and amounts" and to "this plan".

## 4. On-chain exposure by operation kind

| Kind | Intended on-chain shape (with the contracts wired) | Shape today (contracts not called) |
|---|---|---|
| CLAIM | The eligible account proves eligibility to `PrivateClaim`; the allocation is sent to a fresh recipient. The eligible account is visible as the caller, the fresh recipient as the destination. | A route from the desk wallet to the fresh recipient. |
| ACCUMULATE | The plan is committed as a Merkle root in `StealthDesk`; legs are executed one at a time, each revealing only its own leaf (recipient, amount, not-before). | One route per leg from the desk wallet, spaced by not-before and optional jitter. |
| OTC | `OtcEscrow` holds the give side until the counterparty settles the want side or the block expires; the receive-into address is fresh. | A single route from the desk wallet to the counterparty address. |
| TREASURY | `DelegatedTreasury` enforces proposer ≠ approver and a daily cap on-chain; payouts go to payees. | Four-eyes and the cap are enforced in the desk only; a route per payee from the desk wallet. |

Until the contracts are wired in, the desk wallet is the visible sender on same-chain routes, and a Relay solver is the sender on cross-chain routes. The UI flags direct-transfer routes for this reason.

## 5. Provider exposure (Relay)

- Every quote carries `user` (desk wallet), `recipient` (leg destination), amount and chains.
- Requests are listed publicly on Relay's explorer and `GET /requests/v2`; no opt-out is documented.
- Solver fills on the destination chain are sent from solver addresses, not from the desk wallet (verified from live quote structure on Base; not verified by executing a fill; not verified on Robinhood Chain at all).

## 6. Internal exposure and controls

| Control | Status |
|---|---|
| Roles enforced on the server for every route (`requireSession(capability)`) | Implemented, tested |
| Viewer redaction of addresses in every API response | Implemented, tested |
| Four-eyes: the last editor of the legs cannot approve them | Implemented, tested; the delegated treasury kind depends on it |
| Approval bound to the leg-set hash; money changes invalidate it | Implemented, tested |
| Append-only audit trail (client extension + database triggers) | Implemented, tested |
| Encryption at rest for labels, memos, CSV originals (AES-256-GCM, one server key) | Implemented, tested |
| Export audited; demo rows carry `simulated=true` | Implemented |
| Session cookies hashed, 14 days, revoked on member removal; sign-in rate limited | Implemented |

## 7. Timing correlation

- A plan executed as a burst of N legs within seconds is a strong fingerprint on-chain and in Relay's request feed.
- **Not-before** per leg is the primary spacing tool for accumulation plans: the desk never executes a leg before its time. **Jitter** (0–30 minutes, off by default, never past the deadline) adds operational spacing. Both timestamps are recorded internally.
- Evaluation: spacing weakens naive "same block" clustering but does not defeat an observer who groups by sender address or by Relay request listing. The UI calls it spacing, never anonymity.

## 8. Amount correlation

- Identical amounts across plans identify a recipient regardless of route. Splitting or rounding amounts is **not** implemented: altering an approved amount would violate the "no silent changes" principle.
- Fee-inclusive quoting (`EXACT_OUTPUT`) makes the origin amount slightly different from the leg amount on cross-chain routes; a side effect, not a control.

## 9. Stock Token transfer restrictions

Robinhood Stock Tokens enforce compliance on both sender and receiver. Consequences for the desk:

- A fresh, unverified recipient cannot hold Stock Tokens. Fresh-recipient operations (CLAIM, ACCUMULATE) are only meaningful for USDG or other unrestricted assets, or for recipients that have been verified out of band.
- The desk does not check allowlists. A leg to a restricted destination fails at execution; the demo seed shows this as `RESTRICTED_TOKEN: recipient not allowlisted (simulated)`.
- The receive-into address of an OTC block that wants Stock Tokens must be an allowlisted address; the memo carries it, the desk does not verify it.

## 10. Verified guarantees

Only these are claimed:

1. Internal role-based access control is enforced on the server (tested).
2. Leg addresses are redacted for the Viewer role in UI and API responses (tested).
3. Every operation state change and every export is recorded as an audit event (tested).
4. A leg is never executed before its not-before time (tested against the queue).
5. On cross-chain routes through Relay, the destination transaction is sent by a solver address, not by the desk wallet (verified from live quote structure on Base; not verified by executing a fill).

## 11. Unverified assumptions

- That Relay lists Robinhood Chain (4663) and USDG, and that its solvers fill there.
- That Relay solvers do not reuse a dedicated per-integrator address that would itself become a desk fingerprint.
- That Relay's public request listing cannot be opted out of.
- That fills on the destination chain are not batched by the solver in a way that groups a plan's legs together in one transaction.
- Everything about the desk contracts' on-chain footprint: they are not called by this version.

## 12. Technical limitations

- The desk contracts are not wired in; the on-chain shape of every kind is the plain route shape in section 4.
- Field-level encryption covers labels, memos and CSV originals with one server-side key. Addresses and amounts are plaintext columns.
- The audit table is append-only inside the database but not anchored externally.
- No mixing, shielded pools or zero-knowledge transfers. Sheaf integrates no privacy protocol.
- Same-chain routes make the desk wallet the visible sender.
- Relay is a single trusted intermediary with full visibility.

## 13. Mitigations

| Risk | Mitigation | Status |
|---|---|---|
| Desk wallet ↔ recipient direct link | Wire the desk contracts so the contract, not the wallet, is the sender; until then prefer cross-chain routes and heed the direct-transfer flag | Flag implemented; contracts not wired |
| Public Relay request feed | Contact Relay about private/opt-out request indexing; use `useDepositAddress` with strict addresses so the on-chain sender is a fresh deposit address | Documented; not enabled |
| Burst timing fingerprint | Not-before per leg; optional bounded jitter | Implemented |
| Operator IP linkage | Self-hosted RPC (`NEXT_PUBLIC_RPC_URL_4663`), VPN | Configurable |
| Data at rest | Field-level encryption with a server-side key; restrict DB access; back up the key with the database | Implemented (single key) |
| Insider misuse | Four-eyes approval, role separation, audit trail, export logging | Implemented |
| Amount fingerprint | Accept; document. Do not alter approved amounts. | Documented |
| Restricted Stock Tokens to fresh addresses | Describe the restriction wherever a fresh address is offered; fail the leg; add an allowlist check before approval | Described; check not implemented |
| Desk wallet reuse across plans | Rotate desk wallets per plan (desk policy) | Documented |

## Language policy

Approved: "Designed so that the wallet that owns the funds or the eligibility is not the destination on-chain, subject to the capabilities and limitations of the underlying routing and settlement infrastructure. Amounts, timing and the desk contract address remain visible."

Not approved anywhere in the product or site: "anonymous", "untraceable", "unlinkable", "invisible", "private transactions", "hidden from the blockchain".
