# Raqio technical whitepaper

Version: 8 November 2026. Scope: the deployed Vault, Airdrop and Score on Elysium Mainnet (`99901`). Web edition: `/whitepaper`.

## Abstract

Raqio records time-based token commitments through contract custody, vesting schedules and funded Merkle distributions. Users sign with their wallets. The application server does not hold a signing key. Commitment scores derive from vault records and are not security ratings.

## Mainnet deployment

Network: Kinetiq Elysium Mainnet. Chain ID: `99901`. RPC: `https://rpc-elysium.perpme.fun`. Explorer: `https://elysium.kinetiq.xyz/explorer`. Native gas currency in the wallet configuration: HYPE, 18 decimals. Foundry labels native fee amounts as ETH in the supplied execution log.

| Contract | Address | Deployment block |
| --- | --- | --- |
| RaqioVault | `0x7dA7CA57a86C977a9CfAf3826b257aA9C6aD1C77` | 2405054 |
| RaqioAirdrop | `0xCf32A62308ce25691CFcc129B52B8a6424462184` | 2405110 |
| RaqioScore | `0x4b5b48e5ffF7FeC9B9D1978966B2966ac5ab11C8` | 2405190 |

All six deployment/ownership nomination transactions succeeded. Total gas: `4965833`. Total paid: `0.0004973761107` native units. The public [deployment record](/contracts/elysium-mainnet-99901.json) contains the six complete transaction hashes; website `/docs#contract-ref` links the contracts, deployment receipts and generated ABIs.

Read-only RPC checks on 8 November 2026 confirmed code at all addresses, the Vault fee of 25bps, and Airdrop/Score referencing the Vault above. Owner and pendingOwner on each contract are `0xEd6e3C8196D1DC003D4c9Ee56b808Cd6ef982fbf`. This account already owns the contracts; it still needs to call `acceptOwnership()` on each to clear the pending nomination. This is not a handover to a different account or multisig. Fee recipient is the same address, not a separately deployed FeeRouter contract.

## Vault custody and rights

RaqioVault supports standard ERC-20 time locks, ERC-20 LP locks, generic ERC-721 custody and linear/cliff vesting streams. Owner and beneficiary are separate roles. Only the beneficiary claims principal; only the owner performs permitted management actions. Ownership transfer preserves the beneficiary. There is no beneficiary-change function.

Time locks can be extended, never shortened. Eligible ERC-20 time locks permit additions without another creation fee. Streams cannot be extended or topped up. Generic NFT custody supports token ID zero but does not authenticate a pool, collect trading fees or implement Uniswap V4 hooks. The administrator has no vault rescue function for withdrawing locked principal.

## Vesting

Let A be the net deposited amount, S the start timestamp, C the cliff timestamp, E the end timestamp and Q the amount claimed.

- Before C: vested(t) = 0.
- At or after E: vested(t) = A.
- Otherwise: vested(t) = floor(A × (t − S) / (E − S)).
- Claimable: vested(t) − Q.

The cliff delays claims; at the cliff, accrual since S becomes available. The beneficiary pays gas to claim. For a cancelable stream, cancellation pays vested but unclaimed tokens to the beneficiary and returns the unvested remainder to the current owner. Non-cancelable streams cannot be stopped. Chain timestamps determine release eligibility.

The deployed Vault has single-stream creation and no `createBatch` function. Stream IDs are vault lock IDs; clients decode confirmed events rather than guessing IDs.

## Fees and asset constraints

The deployment fee is 25bps (0.25%) on ERC-20 lock and stream creation. Fee = floor(gross × feeBps / 10000); net custody = gross − fee. The current fee is read on-chain before deposit. The cap is 50bps and fee changes wait 48 hours. The owner can change the fee recipient separately. NFT custody and additions to existing time locks do not charge this creation fee.

Deposits must arrive exactly: transfer-tax deposits are rejected. Rebasing and other non-standard token accounting are unsupported. Token restrictions or pauses can prevent claims from transferring. Vault deposits use ERC-20 tokens or ERC-721 custody; native gas is not streamed directly.

## Merkle airdrops

A creator funds a campaign and commits its root. Allocation amounts are integer base units. Leaves are `keccak256(keccak256(abi.encode(address, uint256)))`. Sibling hashes are sorted and odd nodes are promoted. The browser generates a downloadable allocation/proof manifest, which the creator must retain and distribute. Only the root is stored on-chain.

Each wallet claims once per campaign. Immediate campaigns pay the claimant directly. Vested campaigns create a Vault stream whose beneficiary is the claimant and whose owner is the campaign creator; the Vault creation fee reduces the gross allocation. Cancellation follows the stream's original setting. After campaign expiry, the creator can recover only that campaign's unclaimed remainder. Claimed and recovered amounts are accounted separately.

## Commitment score

RaqioScore reads Vault records. Its components contribute up to 40 points for locked supply, 20 for amount-weighted remaining duration, 20 for registered LP locks, 10 for active vesting and 10 for history. LP associations require owner registration; arbitrary NFTs are excluded. The scorer refuses tokens with more than 256 indexed Vault records rather than providing incomplete results. Score administration can change the configured vault and LP associations.

The indicator does not establish token safety, valuation, owner identity, pool authenticity or fraud protection. Third parties can influence permissionless history.

## Security and operational scope

Wallets, amounts, timing, calldata and events are public. There is no shielded pool or anonymity guarantee. Deployment receipts and local regression coverage do not establish independent audit or explorer source verification.

Legacy execution-desk operations have separate demo/real settings and Relay integration. PrivateClaim, StealthDesk, OtcEscrow and DelegatedTreasury sources are outside this three-contract deployment. Legacy demo mode does not simulate Vault or Airdrop wallet actions. Cross-chain routes require actual provider support and separately configured token addresses. Existing organizations and operations retain their historical network settings.

## Future work and tokenomics

No RAQIO token, staking, governance, fee discount, buyback or burn distribution was deployed. [Tokenomics](/#tokenomics) remains a draft proposal. Independent audit, scalable indexing, DEX-specific validation and cross-chain support are separate milestones.

## References

- [Mainnet deployment record](/contracts/elysium-mainnet-99901.json)
- [Contract source and deployment guide](/docs#contract-ref)
- [Platform implementation status](/docs/vault)
- [Launch and operating checklist](/docs#security)
