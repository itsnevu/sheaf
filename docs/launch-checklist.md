# Raqio mainnet operations checklist

Elysium Mainnet, chain `99901`. Deployment has completed; this checklist records what is proven and what remains open. [Deployment record](../contracts/deployments/elysium-mainnet-99901.json), [whitepaper](whitepaper.md).

## Confirmed deployment

- [x] RaqioVault deployed at `0x7dA7CA57a86C977a9CfAf3826b257aA9C6aD1C77`, block 2405054.
- [x] RaqioAirdrop deployed at `0xCf32A62308ce25691CFcc129B52B8a6424462184`, block 2405110.
- [x] RaqioScore deployed at `0x4b5b48e5ffF7FeC9B9D1978966B2966ac5ab11C8`, block 2405190.
- [x] Three ownership nominations broadcast successfully; all six receipts saved.
- [x] Read-only RPC check on 8 November 2026: chain 99901, bytecode at all three addresses, Airdrop/Score point to Vault, Vault fee 25bps.
- [x] Owner, pendingOwner and fee recipient checked: `0xEd6e3C8196D1DC003D4c9Ee56b808Cd6ef982fbf`. The nominated account already owns all three contracts.

## Administrator actions remaining

- [ ] Nominated administrator calls `acceptOwnership()` on each contract and verifies `pendingOwner()` is zero afterward.
- [ ] Decide whether to transfer protocol ownership to a multisig; nominate and accept explicitly if desired. The current deployment does not establish multisig ownership.
- [ ] Verify source on the appropriate explorer and publish reproducible compiler settings.
- [ ] Obtain an independent audit; address findings and publish the report. Local tests are not an audit.
- [ ] Register legitimate ERC-20 LP relationships in Score as needed; publish registration policy.

## Web release

- [x] Wallet hooks, network gates, explorer, airdrop proof exports and score lookup target chain 99901.
- [x] Legacy stream entry points use the deployed Vault flow.
- [x] Mainnet addresses, receipts, ABIs, docs and whitepaper are linked publicly.
- [x] New-workspace defaults use 99901. Existing operations retain historical network settings.
- [ ] Build and deploy the updated website with production public environment values; check the deployed site afterward.
- [ ] Review each existing organization's Settings before new mainnet legacy operations.
- [ ] If legacy real-mode Relay routes are needed, confirm actual provider support and configure `RAQIO_USDG_ADDRESS_99901`. Do not reuse testnet addresses.
- [ ] Exercise any funded mainnet smoke test only as a separately authorized wallet transaction.

## Operating checks

- [ ] Production secrets and database backups configured and restore tested.
- [ ] Health checks, RPC error monitoring and exactly one legacy worker path configured.
- [ ] Monitor claims, cancellation, fee proposals and ownership events.
- [ ] Keep proof manifests available for campaign recipients; the chain stores roots, not downloadable allocation files.

## Outside this deployment

No separate RaqioStream, FeeRouter, RAQIO token, staking, governance, burn, buyback, Ponder indexer or Hono API deployment is established. Do not mark those systems live because the three infrastructure contracts were deployed.
