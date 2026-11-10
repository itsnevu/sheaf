# From Token Promises to Public Records: Why Raqio Exists

*A closer look at the problem, the technology, and the limits of transparent token distribution.*

A token allocation tells someone how much they are supposed to receive. It does not, by itself, tell them when they can receive it, whether the allocation has been funded, or who can change the arrangement.

Those questions matter to a contributor waiting for compensation, a community member checking an airdrop, and a team trying to explain its token commitments.

Raqio is built around one idea: **make the release schedule as clear as the allocation.**

It brings token locks, vesting streams, and funded airdrop distributions together on Elysium Mainnet. The goal is to give people a shared contract record of the amount, the timing, and the conditions under which tokens become available.

## The problem: a published schedule is only part of the commitment

Consider a team that announces an allocation of one million tokens to contributors over twelve months.

The announcement may describe the intended distribution clearly. But recipients still need answers:

- Have the tokens actually been deposited?
- Who is entitled to claim them?
- When does vesting begin, and when does it end?
- Is there a cliff?
- Can the creator cancel the stream?
- What happens to tokens that have already vested?
- Does the stated allocation include creation fees?

A spreadsheet can describe these terms. A manual payment process can carry them out. The difficulty is keeping the description, the available funds, and the actual payments aligned over time.

When that alignment depends on repeated manual transfers, recipients depend on the sender continuing to execute the schedule. When several people maintain different records, basic questions can become reconciliation work.

Raqio addresses the funded schedule itself: tokens are deposited into a contract, the release terms are recorded, and eligible recipients claim according to those terms.

## What Raqio provides

Raqio separates three related jobs.

**Token locks** hold supported assets until their release conditions are met. The Vault supports ERC-20 time locks and ERC-20 LP locks, as well as generic ERC-721 custody.

**Vesting streams** make an ERC-20 allocation available over time. They support linear release and a cliff that delays when claims can begin.

**Merkle airdrops** let a creator fund a campaign and commit to an allocation set. Eligible wallets can prove their allocation and claim, either directly or through a vesting stream.

These are useful for different situations. A team allocation may need a long vesting schedule. A community distribution may need an immediate claim. A liquidity commitment may need a time lock. The terms should match the purpose of the allocation.

## The technology: three contracts with distinct responsibilities

The deployed system described in Raqio's technical documentation consists of RaqioVault, RaqioAirdrop, and RaqioScore on Elysium Mainnet, chain ID 99901.

### RaqioVault: custody and release rules

RaqioVault holds deposited assets and records their release conditions.

For a vesting stream, the record includes the token, deposited amount, beneficiary, owner, start, cliff, end, and cancellation setting.

The owner and beneficiary are separate roles. The beneficiary claims principal. The owner performs the management actions allowed by the contract. Transferring ownership does not replace the beneficiary, and the deployed Vault has no beneficiary-change function.

Time locks can be extended, but cannot be shortened. Eligible ERC-20 time locks can receive additions. Streams cannot be extended or topped up, so their terms need to be reviewed before creation.

The application does not hold a signing key for these wallet actions. Users sign transactions with their own wallets; the deposited assets are held by the contract under its rules. That still means users rely on the contract's correctness and the behavior of the deposited token.

### How vesting becomes claimable

For a linear stream, vesting is calculated from the net deposited amount and the elapsed portion of the schedule.

Before the cliff, nothing is claimable. At the cliff, the amount accrued since the start becomes available. At or after the end, the full net allocation has vested.

For example, suppose a stream contains **12,000 net tokens**, lasts twelve months, and has a three-month cliff. At one quarter of the scheduled duration, 3,000 tokens have vested. The beneficiary can claim that amount once the cliff is reached. Subsequent entitlement grows with elapsed time until the end.

The contract uses timestamps and integer arithmetic; this example uses months only to make the proportions easier to understand.

**Vested and claimed are different states.** Vesting determines entitlement. Claiming transfers the available tokens to the beneficiary's wallet and requires a transaction and gas. Raqio does not automatically push a payment to the wallet every second.

### Cancellation is a term recipients should see

Cancelable and non-cancelable streams create different commitments.

For a cancelable stream, cancellation pays vested but unclaimed tokens to the beneficiary and returns the unvested remainder to the current owner. A non-cancelable stream cannot be stopped through that cancellation mechanism.

This distinction should be part of the recipient's decision before accepting a schedule. A long end date alone does not explain how firm the future allocation is.

### RaqioAirdrop: funded distribution with allocation proofs

For a Merkle campaign, the creator funds the campaign and records a Merkle root on-chain. That root commits to a set of wallet allocations without storing every allocation directly in contract storage.

A claimant supplies a proof that their wallet and amount belong to the committed set. Each wallet can claim once per campaign.

Immediate campaigns transfer the allocation directly. Vested campaigns create a Vault stream for the claimant, using the campaign's vesting terms. The Vault creation fee reduces the gross allocation when that stream is created.

There is an important operational responsibility: **the root is on-chain, but the complete allocation list and proofs are not.** The browser produces a downloadable manifest. The creator must retain it and make the relevant claim information available to recipients.

After campaign expiry, the creator can recover that campaign's unclaimed remainder. Expiry is therefore another term recipients need to understand.

## Transparency: what people can actually inspect

Transparency is useful when someone can answer a specific question from a shared record.

Raqio's public contract records can help people inspect funded allocations, beneficiaries, timing, cancellation settings, and claim activity. Its documentation publishes deployed addresses, transaction references, and ABIs so readers can identify the intended contracts.

A recipient should be able to ask: “What is available to me now?” A team should be able to point to the recorded schedule. An observer should be able to distinguish a planned commitment from one that has been deposited into the Vault.

This visibility also has a privacy cost. Wallets, amounts, timing, transaction calldata, and events are public. Raqio's deployed Vault and Airdrop do not provide a shielded pool or an anonymity guarantee.

Public records make the arrangement inspectable. They do not prove that a project is well run, that its token has value, or that every explanation around an allocation is accurate.

## The commitment score: useful within a clearly defined scope

RaqioScore summarizes selected Vault records into a commitment indicator. Its components cover locked supply, remaining lock duration, registered LP locks, active vesting, and history.

The scope matters: **the score reads RaqioVault records on Elysium Mainnet. It does not aggregate all vesting and locks across other platforms or project contracts.**

A token can have a zero Raqio score while having vesting elsewhere. A high score does not establish safety, identity, valuation, or protection against fraud.

LP associations require administrative registration. Generic NFTs do not count as proof of locked pool liquidity. The scoring contract also refuses calculations above its 256-record per-token limit rather than silently presenting a partial result.

This makes the score a starting point for inspecting commitments, rather than a substitute for examining the underlying records.

## Why use Raqio?

The strongest reason is a concrete need: **you want supported tokens funded into a publicly inspectable lock, release schedule, or claim campaign on Elysium.**

For teams, this replaces repeated execution of a funded schedule with contract-defined release eligibility. Teams still need to choose the correct terms, fund the arrangement, communicate it, and handle their operational responsibilities.

For recipients, the benefit is a direct relationship between the recorded terms and what they can claim. They can inspect the schedule and claim available tokens without requesting a fresh manual transfer for each release.

For communities, the benefit is a shared reference. Discussions about an allocation can point to the same contract record, while remaining clear about what that record does and does not establish.

Raqio brings these related workflows into one product. That is particularly relevant when a team needs both individual vesting streams and a funded community distribution.

## Fees, compatibility, and risks deserve the same visibility

Raqio's deployment documentation records a 25-basis-point creation fee, or 0.25%, for ERC-20 locks and streams. The current fee must be read on-chain before deposit. Fee changes have a 48-hour delay and a 50-basis-point cap.

Recipients also pay network gas when claiming. Gross allocation and net deposited amount should therefore be communicated clearly.

Supported token behavior matters. Transfer-tax deposits are rejected, and rebasing or other non-standard accounting is unsupported. A token's own restrictions or pause functionality can prevent transfers even when a claim is otherwise eligible.

Generic NFT custody does not authenticate a liquidity pool or collect trading fees. Cross-chain distribution is outside the scope of these three contracts. The deployed Vault creates individual streams; it does not expose a batch-stream creation function.

The Vault administrator has no rescue function for withdrawing locked principal. However, administrative powers still exist elsewhere, including fee configuration and changes to scoring configuration and LP associations.

Finally, deployment receipts and regression tests do not establish an independent security audit. The referenced documentation does not establish that an independent audit has been completed. Anyone using the system should consider contract risk, token risk, wallet security, and the exact terms they are signing.

## Clear terms are part of the product

A useful token schedule should answer more than “how much?”

It should explain when the allocation becomes available, whether it has been funded, who can claim it, what can be changed, and which conditions remain outside the system's control.

Raqio turns those questions into a workflow built around deposited assets, explicit schedules, recipient claims, and public records.

For teams and recipients who need that workflow on Elysium, the value is practical: fewer ambiguities between an allocation announcement and the release arrangement people can inspect.

**Your tokens. Your timeline.**

Explore the mechanics at [raqio.xyz/docs](https://raqio.xyz/docs), inspect [public locks](https://raqio.xyz/explore), and read the [security scope](https://raqio.xyz/security) before creating a commitment.

---

*Editorial note: this draft is based on the repository's technical whitepaper dated 8 November 2026 and the supplied contract implementation. Deployment fees are historical values; current fees and administrative configuration must be checked on-chain. No posting or publication is implied.*

### Source references for editorial review

- [Technical whitepaper](../whitepaper.md)
- [Deployment record](../../contracts/deployments/elysium-mainnet-99901.json)
- [RaqioVault implementation](../../contracts/src/RaqioVault.sol)
- [RaqioAirdrop implementation](../../contracts/src/RaqioAirdrop.sol)
- [RaqioScore implementation](../../contracts/src/RaqioScore.sol)
