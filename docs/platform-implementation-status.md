# Raqio platform continuation — 8 November 2026

Raqio uses Elysium Mainnet (99901), with HYPE for gas. HoodLock is a product reference, not a dependency, brand or source of protocol claims.

## Implemented in this workspace

- RaqioVault: ERC-20 time locks, ERC-20 LP locks, generic ERC-721 position custody (including token ID 0), linear/cliff streams, claims, cancellation, extending time locks, owner transfer and additions to time locks. Ownership transfer preserves the beneficiary. Streams cannot be extended because stretching an already-claimed schedule can reduce accrued entitlement.
- Exact ERC-20 deposit accounting: fee-on-transfer deposits are rejected rather than allowing one deposit to consume another lock's balance. Rebasing and other non-standard token behavior is unsupported. The vault has no administrative withdrawal method.
- Fees: constructor-selected deposit fee (default deployment script: 25bps), 50bps cap, 48-hour change delay. NFT custody does not charge an ERC-20 deposit fee. Adding tokens does not charge a creation fee. The configured router receives ERC-20 deposit fees.
- RaqioAirdrop: funded Merkle campaigns, immediate or streamed claims, per-wallet replay protection, campaign-specific allocation limits, claim deadlines and recovery of unclaimed funds. Claimed amounts and swept funds are accounted separately. Approvals to the vault are exact and reset. Stream ownership goes to the campaign creator, so cancellation refunds the creator while preserving vested recipient entitlement.
- RaqioScore: derives a bounded commitment indicator from actual vault records, rather than a reporter supplying arbitrary scores. Formula: supply percentage up to 40, amount-weighted remaining duration up to 20, registered LP percentage up to 20, active vesting up to 10, history up to 10. LP relationships require explicit owner registration. Arbitrary NFTs are excluded. A token with more than 256 indexed vault records is refused rather than given an incomplete score. History is permissionless and can be influenced by third parties; it is not identity or fraud verification.
- Contract ABIs generated from Forge artifacts, including exact indexed event fields. Rebuild with `node scripts/sync-contract-abis.cjs` after compiling Solidity.
- Wallet forms: configured-address and chain gates, arbitrary token decimals, integer precision validation, balance/MAX, beneficiary checks, live fee read, allowance reset where needed, approval receipts, simulation, transaction receipts and lock IDs decoded from confirmed events.
- `/app/lock`, `/app/lock/tokens`, `/app/lock/lp`, `/app/lock/nft`, `/app/lock/stream`, `/app/airdrop`.
- Public `/explore` and `/explore/[id]`, readable without an account, plus corresponding desk routes. ID/token/wallet search, 20-record pagination, loading/errors distinct from empty data, ownership/beneficiary records, proof links, share, claim, extend, transfer and top-up. Unlock controls use the chain timestamp.
- Airdrop proof generation runs in the browser. Each leaf is `keccak256(keccak256(abi.encode(address, uint256)))`. Sibling hashes are sorted; odd nodes are promoted. Save the downloadable allocation/proof manifest before distributing it. The chain stores the root, not recipients' downloadable proof files.
- Homepage product links and score lookup. No fabricated trust score, USD TVL, token supply, staking yield or active burn rate is displayed. Tokenomics remains a clearly marked draft proposal.
- Source/product documentation, explorer URLs, wallet chain definitions, Prisma defaults and new-account defaults moved to Elysium. Existing historical user records were not rewritten. Test-database setup now creates the empty SQLite file before invoking Prisma on Windows; encryption tests use the actual RAQIO key name.

## Verification

- 74 Solidity tests pass, including 15 new infrastructure tests and 256-run fuzz tests. Command: `forge test` from `contracts/` (the Windows npm-packaged runner was used in this environment).
- 107 application tests, including a real-route guard that prevents missing ERC-20 configuration being quoted as native HYPE. Command: `npm test`.
- TypeScript, ESLint and the real-data check pass. The production build passes.
- `node scripts/qa-vault-flow.cjs` starts a temporary Anvil chain and a separate QA database/server, deploys local-only test contracts, then exercises the actual UI through wallet RPC. No public-chain transaction is made. Report: `test-results/vault-ui-qa.json`; responsive screenshots: `test-results/vault-explore-{375,768,1440}.png`.

## Mainnet deployment and remaining operations

Follow-up review: [mainnet readiness audit](mainnet-readiness-audit.md). The review confirmed all six receipts and deployed runtime/ABI matches, reran 74 Solidity tests and 112 application tests, passed 12 production browser tests and 11 local wallet/UI checks, and repaired claimable polling, damaged form text and a documentation mismatch. Ownership acceptance, hosting release, independent audit and source verification remain open; local legacy mode is demo and one existing workspace still uses chain 4663.

Website verification for this mainnet update: 112 application tests passed; ESLint, TypeScript, the real-data check and production build passed. Local Anvil UI coverage passed for ERC-20 approval/deposit/receipts, beneficiary preservation, public records, campaign creation and vested claims, NFT ID zero custody/withdrawal, score reads and legacy stream URLs. Explorer layouts passed at 375/768/1440px; docs, vault docs, whitepaper and security passed the 375px overflow check and link all three mainnet addresses. Report: `test-results/vault-ui-qa.json`. These checks sent no public-chain transactions.

Mainnet deployment completed on Elysium chain `99901`. RaqioVault is `0x7dA7CA57a86C977a9CfAf3826b257aA9C6aD1C77`, RaqioAirdrop is `0xCf32A62308ce25691CFcc129B52B8a6424462184`, and RaqioScore is `0x4b5b48e5ffF7FeC9B9D1978966B2966ac5ab11C8`. Deployment receipts and transaction hashes are recorded in `contracts/deployments/elysium-mainnet-99901.json`.

`contracts/script/DeployMainnet.s.sol` broadcast all three deployments and ownership nominations successfully on chain 99901. The read-only RPC check on 8 November 2026 found bytecode at all three addresses, Vault fee 25bps, and both Airdrop/Score pointing to the deployed Vault. Owner and pendingOwner are both `0xEd6e3C8196D1DC003D4c9Ee56b808Cd6ef982fbf` on all three contracts: the administrator already owns them, but each nomination still requires `acceptOwnership()` to clear pending state. The fee recipient is the same EOA, not a separately deployed FeeRouter. Independent audit and explorer source verification have not been established. The testnet-only infrastructure script remains available for isolated testing.

The wallet hooks, read/write gates, public explorer, airdrops, score lookup, new-workspace defaults and Prisma schema now use 99901. Legacy stream URLs render the deployed Vault flow. Existing organizations/operations may still contain historical chain settings; review organization Settings before new real-mode operations. Do not rewrite signed plans, audit events or historical transactions to another chain. The updated documentation and `/whitepaper` describe these three contracts. There is no 200-stream batch function or beneficiary-change function in this Vault. USDG remains a legacy desk accounting denomination, not a claim about Elysium's native currency; its actual token address must be configured separately for real routes.

## Deliberately not claimed as complete

Milestone voting, oracle-conditioned unlocking, a lock marketplace, affiliate rewards, V4 hooks, DEX-specific LP validation/valuation, NFT fee-collection adapters, public USD price feeds, a scalable indexer/API/SDK/WebSocket service, and native-token staking/buyback/governance require separate implementations. Generic ERC-721 custody does not prove an NFT is a genuine Uniswap V3/V4 position. Cross-chain routes depend on actual provider support for Elysium. A commitment score is not a guarantee against rug pulls or unsafe token contracts.
