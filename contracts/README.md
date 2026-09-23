# Sheaf contracts

Sheaf is the private execution desk for Robinhood Chain (an Arbitrum Orbit L2, chain id 4663).
Private externally. Transparent internally.

This folder holds the four on-chain operations, one contract each, built with Foundry and
Solidity 0.8.24.

## What "private" means here, and what it does not

Privacy in Sheaf means one thing: the wallet that owns funds or eligibility does not appear as
the destination of the transfer on-chain. A claim goes to a fresh address, not to the eligible
wallet. An OTC fill pays each side into an address of its choosing. A treasury pays out from a
shared desk contract, not from its own wallet.

It does not mean anonymous, untraceable or unlinkable. On an L2 with public calldata:

- amounts and timing are visible and can be correlated;
- the `Claimed(account, recipient, amount)` event publicly links the eligible wallet to its
  fresh address;
- every executed StealthDesk leg is a public transfer with a public event tied to a `planId`
  that is itself tied to the treasury;
- every OTC order and fill, and every treasury proposal, approval and payment, is public.

Each contract carries the same statement in its NatSpec. Do not describe these contracts using
the words anonymous, untraceable or unlinkable.

## Contracts

All four use custom errors (no `require` strings), OpenZeppelin `ReentrancyGuard` where funds
move, and a shared `TokenTransfer` library that turns any failed ERC-20 transfer into a single
explicit revert, `TransferRejected(token, to, amount, reason)` (or `TransferFromRejected` on the
inbound side), with the token's own revert data attached. This matters for Robinhood Stock
Tokens, which run compliance checks on sender and receiver and revert for unverified addresses.
When that happens the whole transaction unwinds: nothing is marked done, nothing is stuck, and
the normal cancel or withdraw path still works.

### PrivateClaim (`CLAIM`)

Private allocation claim for a launch or airdrop.

- Owner deploys with the claim token, funds the contract (`fund` or a direct transfer), and
  calls `configure(root, start, end)` with a Merkle root over `leaf(account, amount)` and the
  claim window. The root is locked after the first claim.
- `claim(account, recipient, amount, proof)`: `account` calls it directly and names a
  `recipient`. Tokens go to `recipient`; `account` never holds them.
- `claimWithSignature(account, recipient, amount, deadline, proof, signature)`: anyone (a
  relayer) submits `account`'s EIP-712 signature over
  `Claim(address account,address recipient,uint256 amount,uint256 deadline)`. The signature is
  bound to the recipient, so a relayer cannot redirect it. Replay is prevented by the
  one-claim-per-account rule, so there is no separate nonce; `deadline` limits how long an
  unsubmitted signature stays valid. Domain: name `Sheaf PrivateClaim`, version `1`.
- One claim per account. After `end`, the owner can `sweep` unclaimed tokens.
- Leaf: `keccak256(bytes.concat(keccak256(abi.encode(account, amount))))`, OpenZeppelin
  sorted-pair hashing.

### StealthDesk (`ACCUMULATE`)

Stealth accumulation. Shared by many treasuries.

- A treasury calls `deposit(token, amount)` into its desk balance and `setOperator(operator)`.
- It commits a plan with `commitPlan(planId, root)`, where `root` is a Merkle root over
  `leafOf(planId, legIndex, leg)` and each leg is `(recipient, token, amount, notBefore, salt)`.
  The `salt` keeps unexecuted leaves unguessable.
- The operator (or the treasury) reveals one leg at a time with
  `executeLeg(planId, legIndex, leg, proof)`. It pays from the treasury's desk balance, not
  before `notBefore`, at most once per `legIndex`.
- The treasury can `cancelPlan` (remaining legs are void) and `withdraw` its balance at any
  time. Deposits are credited by balance delta, so fee-on-transfer tokens credit what arrived.

What is hidden: the legs not yet executed, and so the plan's total size and recipient list.
What is public: every executed payout, its amount, its timing and its `planId`.

### OtcEscrow (`OTC`)

Private OTC block trade, never touching a pool.

- `createOrder(makerToken, makerAmount, takerToken, takerAmount, taker, expiry, makerRecipient)`
  escrows the maker's tokens. `taker` may be zero (anyone can fill). `makerRecipient` is where
  the maker receives the taker's tokens (zero means the maker itself).
- `fill(orderId, takerRecipient)` moves both legs in one transaction: taker tokens to
  `makerRecipient`, escrowed tokens to `takerRecipient` (zero means the taker itself).
- `cancel(orderId, refundTo)`: the maker gets the escrow back at any time before a fill,
  including after expiry.
- Fee-on-transfer tokens are rejected: both legs are checked by balance delta and must match
  the stated amounts exactly (`AmountMismatch`).

### DelegatedTreasury (`TREASURY`)

Delegated treasury with on-chain four-eyes. This one is about control, not privacy.

Roles:

- `OWNER` (OpenZeppelin `Ownable2Step`): funds, sets roles and per-token daily caps, cancels
  anything, and can `withdraw` everything at any time, not subject to the cap.
- `OPERATOR`: `propose(token, to, amount)` and `execute(proposalId)`.
- `APPROVER`: `approve(proposalId)`. The approver must be a different address from the
  proposer, enforced on-chain (`ProposerCannotApprove`). An address may hold both roles but
  still cannot approve its own proposal.

Lifecycle: `Proposed -> Approved -> Executed`, with `Cancelled` reachable from `Proposed` or
`Approved` by the owner or the proposer. Every transition emits an event.

Daily cap: per token, a 24-hour window starts at the first execution after the previous window
ended; spend inside the window may not exceed `dailyCap[token]`. A cap of zero (the default for
every token) blocks execution until the owner sets one. `remainingToday(token)` reports the
headroom.

## Layout

```
contracts/
  foundry.toml
  src/
    PrivateClaim.sol
    StealthDesk.sol
    OtcEscrow.sol
    DelegatedTreasury.sol
    TokenTransfer.sol          shared transfer helper
    mocks/MockUSDG.sol         6-decimal stablecoin for tests
    mocks/MockRestrictedToken.sol  allowlisted ERC-20 that models Stock Token restrictions
  test/                        one test file per contract, plus test/utils/Merkle.sol
  script/Deploy.s.sol          deploys all four
  lib/                         forge-std and openzeppelin-contracts (git submodules / vendored)
```

## Running tests

Requires Foundry.

```
cd contracts
forge install          # only if lib/ is empty
forge build
forge test -vv
forge fmt --check
```

The suite covers happy paths, one claim per account, signature replay and deadline, wrong
recipient in a signature, leg double-execute and `notBefore`, plan cancel and withdraw, OTC
fill by the wrong taker, expiry refund, clean reverts on restricted tokens for every contract,
four-eyes, the daily cap, role checks, and one fuzz test per contract.

## Deploying to Robinhood Chain

Robinhood Chain is an Arbitrum Orbit L2 with chain id 4663. For the RPC URL, explorer and the
USDG contract address, see the Robinhood Chain docs; nothing here hard-codes them.

Environment (put these in `contracts/.env`, which is git-ignored, or export them):

```
ROBINHOOD_RPC_URL=<from the Robinhood Chain docs>
SHEAF_OWNER=0x...             # owner of PrivateClaim and DelegatedTreasury
SHEAF_CLAIM_TOKEN=0x...       # ERC-20 distributed by PrivateClaim, e.g. USDG
PRIVATE_KEY=0x...             # deployer key (or use --ledger / --account instead)
```

Then:

```
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ROBINHOOD_RPC_URL" \
  --chain-id 4663 \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

The script prints the four addresses. Verification depends on the explorer Robinhood Chain
provides; pass the usual `--verify` flags for it if supported.

After deployment:

- PrivateClaim: owner calls `configure` and funds the contract.
- StealthDesk and OtcEscrow: no setup; each treasury or maker configures its own state.
- DelegatedTreasury: owner calls `setOperator`, `setApprover`, `setDailyCap` and funds it.
