# Sheaf privacy threat model

Positioning: **"Private externally. Transparent internally."** This document states what that means in practice, who can see what, and what Sheaf does and does not promise. It was written against the verified Relay behaviour in `docs/research/relay-integration-research.md`.

## 1. Privacy objectives

1. Reduce **unnecessary** public linkage between an organisation's treasury operations and individual contractor payouts, where the underlying infrastructure supports it.
2. Keep every payout fully visible **internally** (finance operators, approvers, auditors) with immutable-by-policy audit events.
3. Never trade auditability or legal obligations for privacy.
4. Never describe a payment as anonymous, untraceable, or unlinkable.

## 2. Threat assumptions and observers

| Observer | What they can access |
|---|---|
| Block explorers, indexers, analytics firms (Chainalysis-style) | All on-chain data: sender, receiver, amount, token, timestamp, calldata, contract interactions. |
| Validators / sequencers / RPC providers | Same as above plus the submitting IP and mempool timing. The browser's RPC provider sees the treasury address with the operator's IP. |
| Relay (route provider and its solvers) | Every quote (`user`, `recipient`, amount, chains), every deposit, every fill. Relay also **publicly** exposes request metadata via `GET /requests/v2` and its transaction explorer: `user` → `recipient` pairs are listed without authentication (verified live). |
| Wallet provider (MetaMask, WalletConnect relays) | The treasury address, every transaction it signs, the dapp origin. |
| Sheaf backend operators (hosting, DB admins) | Everything in the database: names, addresses, amounts, references, CSV originals, approvals, audit trail. |
| Finance administrators and approvers | Everything in their organisation, by design. Viewers see redacted addresses. |
| Recipients | Their own incoming transaction, its sender (treasury or solver), amount, timestamp. |

Assumed adversary goal: link "this treasury" to "this set of contractors and amounts" and to "this pay cycle".

## 3. On-chain data exposure

- **Same-chain, same-token route (default: Base USDC → Base USDC).** Relay returns a plain ERC-20 `transfer(recipient, amount)` from the treasury. On-chain this is indistinguishable from paying directly: sender, recipient, amount and time are all public and linked in one transaction. **No privacy benefit.** Sheaf shows a "Direct transfer" route label and a warning in this case.
- **Cross-chain route (e.g. Arbitrum USDC → Base USDC).** The treasury sends a deposit to a Relay solver/depository address on the origin chain; a solver pays the recipient on the destination chain from a solver-controlled address. The recipient's incoming transaction does not name the treasury. However: (a) the origin deposit still names the treasury, (b) amounts and times correlate across chains, (c) Relay's public request listing links the two. This is **obfuscation against casual inspection**, not unlinkability.
- **Funding transactions.** Moving funds into the treasury from an exchange or a main wallet is public and links the treasury to its source. Out of Sheaf's scope.
- **Amounts.** Payroll amounts are typically round or repeated monthly, which makes recipients recognisable across cycles regardless of routing.

## 4. Provider and infrastructure data exposure

- Relay receives and stores the complete route graph and publishes request metadata. Anyone with the `requestId` or the treasury address can list its requests.
- RPC and wallet providers see the treasury address and operator IP. A VPN or a self-hosted RPC reduces IP linkage; Sheaf supports a per-chain RPC override.
- Sheaf's own hosting sees everything. Database at rest: contractor names, internal references and CSV originals are encrypted with AES-256-GCM under `SHEAF_ENCRYPTION_KEY`; wallet addresses and amounts stay in clear so they can be queried (see Section 11).

## 5. Internal access boundaries (implemented)

- Server-enforced roles per organisation membership: **Owner**, **Finance admin**, **Approver**, **Viewer**. Checks live in `src/lib/auth/permissions.ts` and are applied in every API route and server page, not only in the UI.
- Organisation isolation: every query is scoped by `organizationId` derived from the session, never from the request body.
- Viewers see truncated recipient addresses and cannot export; Approvers cannot edit recipients; only Owners/Finance admins can create, validate, prepare and execute; approval requires Approver or Owner and cannot be given by the same user who last modified the recipient set (four-eyes rule, enforced server-side).
- Every consequential action writes an `AuditEvent` (actor, action, batch, payload hash, timestamp). Audit rows are never updated or deleted by application code; database-level immutability is **not** enforced in this build.

## 6. Metadata leakage

- CSV originals are stored verbatim (needed for audit) and contain names. They are served only to Owner/Finance admin roles.
- Internal references (invoice numbers) never leave the database; they are not written into calldata or memos.
- Transaction references from the provider are stored and shown; they are public identifiers by nature.
- Export files contain names and full addresses; the UI warns before download and logs the export.

## 7. Timing correlation risks

- A batch executed as a burst of N transfers within seconds is a strong "payroll run" fingerprint, both on-chain and in Relay's request feed.
- **Jitter** (randomised spacing between route submissions) is implemented as an operator setting: off by default, bounded to 0–30 minutes per route, never extending past the batch deadline, with the scheduled and actual timestamps recorded internally. Evaluation: jitter weakens naive "same block" clustering but does not defeat an observer who groups by sender address or by Relay request listing. It is therefore described in the UI as "spacing" for operational and light-privacy reasons, never as anonymity.
- Jitter is disabled automatically when a batch has a deadline closer than the maximum jitter window.

## 8. Amount correlation risks

- Identical amounts every cycle identify a recipient across cycles regardless of route. Splitting or rounding amounts is **not** implemented: altering an approved amount would violate the "no silent changes" principle and complicate accounting.
- Fee-inclusive quoting (`EXACT_OUTPUT`) makes the origin amount slightly different from the recipient amount on cross-chain routes, which marginally weakens exact-amount matching; this is a side effect, not a control.

## 9. Verified privacy guarantees

Only these are claimed:

1. Internal role-based access control is enforced on the server (tested by API tests).
2. Recipient addresses are truncated for Viewer role in UI and API responses.
3. Every batch state change and every export is recorded as an audit event.
4. On cross-chain routes, the recipient's incoming on-chain transaction is sent by a Relay solver address, not by the treasury (verified from live quote structure; not verified by executing a fill).

## 10. Unverified assumptions

- That Relay solvers do not reuse a dedicated per-integrator address that would itself become a treasury fingerprint.
- That Relay's public request listing cannot be opted out of (no documentation found either way).
- That fills on the destination chain are not batched by the solver in a way that groups Sheaf's recipients together in one transaction (possible and would re-link them).
- Any behaviour on non-EVM destination chains.

## 11. Technical limitations

- Field-level encryption covers names, references and CSV originals with one server-side key. Wallet addresses and amounts are plaintext columns (needed for duplicate detection and search); per-organisation keys held in a KMS are a follow-up.
- The audit table is append-only (the data layer refuses updates and deletes, and database triggers enforce the same rule for raw SQL). It is not anchored in an external or immutable store.
- No mixing, shielded pools, or zero-knowledge transfers. Sheaf does not integrate any privacy protocol.
- Same-chain routes have zero external privacy.
- Relay is a single trusted intermediary with full visibility.

## 12. Recommended mitigations

| Risk | Mitigation | Status |
|---|---|---|
| Treasury ↔ recipient direct link | Prefer a cross-chain or cross-token route; Sheaf flags direct-transfer routes on review | Implemented (flag) |
| Public Relay request feed | Contact Relay about private/opt-out request indexing; use `useDepositAddress` with strict addresses so the on-chain sender is a fresh deposit address | Documented; not enabled |
| Burst timing fingerprint | Optional bounded jitter, off by default | Implemented |
| Operator IP linkage | Self-hosted RPC (`NEXT_PUBLIC_RPC_URL_<chain>`), VPN | Configurable |
| Data at rest | Field-level encryption (names, references, CSV originals) with a server-side key; restrict DB access; back up the key with the database | Implemented (single key; per-org KMS keys not implemented) |
| Insider misuse | Four-eyes approval, role separation, audit trail, export logging | Implemented |
| Amount fingerprint | Accept; document to customers. Do not alter approved amounts. | Documented |
| Treasury reuse across cycles | Rotate treasury wallets per period (organisation policy) | Documented |

## Language policy

Approved: "Designed to reduce unnecessary public linkage between treasury operations and individual payouts, subject to the capabilities and limitations of the underlying payment infrastructure."

Not approved anywhere in the product or site: "anonymous", "untraceable", "unlinkable", "invisible", "private transactions", "hidden from the blockchain".
