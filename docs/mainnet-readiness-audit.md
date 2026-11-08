# Mainnet readiness audit — 8 November 2026

Verdict: the three-contract deployment and local website checks pass, but production readiness is not 100% complete. This is a repository review, regression test run and read-only chain check, not an independent smart-contract security audit.

## Verified

| Check | Result |
| --- | --- |
| RPC chain | 99901 |
| Six deployment / ownership nomination receipts | All successful; addresses and blocks match the deployment record |
| Vault, Airdrop and Score runtime code | Matches local Forge artifacts, excluding compiler-designated immutable slots; the Airdrop vault pointer was checked separately |
| Public ABIs | All three match compiled artifacts |
| Airdrop and Score vault references | Both point to `0x7dA7CA57a86C977a9CfAf3826b257aA9C6aD1C77` |
| Current Vault fee | 25bps |
| Owner / pendingOwner | Both are `0xEd6e3C8196D1DC003D4c9Ee56b808Cd6ef982fbf` on all three contracts |
| Fee recipient | Same administrator address |
| Application regression | 112 tests passed |
| Solidity regression | 74 tests passed, including 256-run fuzz cases; 15 infrastructure tests cover the deployed contract family |
| ESLint, TypeScript, real-data check | Passed |
| Production build | Passed |
| Production browser tests | 12 passed, desktop and mobile; public pages, password/wallet sign-in, access restrictions and complete demo operation workflow |
| Local wallet UI | 11 checks passed, including ERC-20 unlock and full payout without reload, vested airdrop claims, NFT withdrawal, score reads and mainnet docs links |

Run `npm run audit:mainnet` for read-only on-chain/artifact/ABI checks. Evidence is saved to `test-results/mainnet-audit.json`. UI evidence is saved to `test-results/vault-ui-qa.json`. Browser tests use isolated databases; wallet tests use local Anvil. This audit did not send public-chain transactions.

## Findings repaired during this review

1. **Claimable amounts did not poll after unlock.** The lock record and chain clock refreshed, but the separate claimable query did not. ERC-20 claim buttons could remain disabled until refresh. The claimable query now polls every five seconds; the wallet regression exercises unlock and full payout without reloading the page.
2. **Vault form text had damaged Unicode.** Restored arrows, ellipses and separators from the original UTF-8 source.
3. **Stream documentation described a start-time input absent from the form.** It now states that the form starts vesting at execution; a future start is available through direct contract integration.
4. **Browser tests referred to retired navigation labels.** Updated assertions for the current desktop sidebar and mobile toggle; added docs/vault and whitepaper to public-page coverage. The desk status bar now exposes its status to assistive technology.
5. **Playwright could delete other QA evidence.** Its output now uses `test-results/e2e`, separate from wallet and on-chain audit reports. The wallet runner creates its evidence directory explicitly.

## Still open

| Item | State and required action |
| --- | --- |
| Ownership nomination | Pending on all three contracts. The administrator already owns them; that wallet must call `acceptOwnership()` on each to clear the nomination. No different-account or multisig handover is established. |
| Public hosting release | This session built and tested local source. No production hosting deployment was performed or verified. Local `NEXT_PUBLIC_APP_URL` is `http://localhost:3100`; it does not identify an audited public release. |
| Explorer links / source verification | Source verification has not been established. Firecrawl requests for the Vault address and creation receipt did not complete during this review; this is an inconclusive link check, not proof that the explorer is down. |
| Independent security review | No independent auditor report was supplied or established. Test success and matching bytecode do not replace one. |
| Legacy execution desk | Local mode is `demo`; `RAQIO_USDG_ADDRESS_99901` is unconfigured. One existing local workspace still stores origin/destination chain `4663`. Review its Settings before new real operations; historical operations were not rewritten. Relay support must be confirmed separately. These are legacy-desk limitations, not a failure of the direct Vault/Airdrop mainnet connection. |

No RAQIO token, staking, governance, buyback or burn distribution was included in the deployment. Tokenomics remains a proposal; this review does not mark those features live.
