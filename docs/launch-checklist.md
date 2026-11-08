# Raqio Launch Checklist

Elysium Testnet (99801). Mainnet parameters are not configured in this implementation; verify its chain ID, RPC and explorer before any production deployment. The mainnet checklist below is a draft, not a deployment record.

---

## 1. Pre-Audit

- [ ] Smart contract freeze: no changes to RaqioStream.sol or FeeRouter.sol after this point
- [ ] Unit tests: 100% branch coverage on both contracts
- [ ] Fuzz testing: Foundry fuzz tests for edge cases (overflow, zero amounts, max batch size 200, dust deposits, uint256 boundary)
- [ ] Invariant tests: total deposits = total claimed + total unclaimed + total fees at all times
- [ ] Gas optimization: measure and document gas for createStream, createBatch(200), claim, cancel
- [ ] Static analysis: Slither, Mythril, Aderyn scans clean with zero high/critical
- [ ] Testnet deployment verified: all functions exercised on Elysium testnet 99801
- [ ] Internal code review completed by at least 2 engineers

## 2. Security Audit

- [ ] Engage auditor (Cyfrin, Trail of Bits, OpenZeppelin, or equivalent)
- [ ] Provide auditor with: contracts, full test suite, deployment scripts, architecture doc
- [ ] Audit scope covers: RaqioStream.sol, FeeRouter.sol, all imported libraries
- [ ] Remediation: fix all critical and high findings
- [ ] Document accepted medium/low findings with justification
- [ ] Re-audit if remediation required changes to core logic
- [ ] Publish final audit report on /security page

## 3. Mainnet Deployment

- [ ] Deploy FeeRouter.sol to Elysium mainnet (chain 99901)
- [ ] Deploy RaqioStream.sol with FeeRouter address as constructor arg
- [ ] Verify both contracts on Elysium block explorer
- [ ] Set protocol fee to 25 bps via FeeRouter.setFee()
- [ ] Transfer FeeRouter ownership to multisig (3-of-5)
- [ ] Transfer RaqioStream admin role to multisig (3-of-5)
- [ ] Record deployed addresses in .env and docs
- [ ] Smoke test: createStream on mainnet with minimal amount
- [ ] Smoke test: claim on mainnet
- [ ] Smoke test: cancel on mainnet
- [ ] Verify FeeRouter received fee from smoke test

## 4. Indexer and API

- [ ] Update Ponder config: chain ID 99901, mainnet RPC, mainnet contract addresses
- [ ] Update fallback indexer: mainnet WSS endpoint, mainnet start block
- [ ] Deploy Ponder indexer to Railway or Fly
- [ ] Deploy Hono API server to Railway or Fly
- [ ] Verify indexer catches StreamCreated, Claimed, Canceled events on mainnet
- [ ] Verify API returns correct data for /streams, /stats, /claims endpoints
- [ ] Set up monitoring and alerts for indexer lag (threshold: 30 seconds behind head)
- [ ] Configure indexer auto-restart on crash

## 5. Frontend

- [ ] Add Elysium mainnet chain definition (99901) to wagmi config alongside testnet
- [ ] Network switcher in app UI: testnet / mainnet toggle
- [ ] Set NEXT_PUBLIC_RAQIO_STREAM_ADDRESS to mainnet contract
- [ ] Set NEXT_PUBLIC_FEE_ROUTER_ADDRESS to mainnet contract
- [ ] Remove or gate testnet-specific copy ("tokens have no real value", "TESTNET" labels)
- [ ] OG image updated with final Raqio branding
- [ ] Favicon finalized (current: fluid drip mark)
- [ ] Mobile responsive QA pass on all /app/* routes and marketing pages
- [ ] Cross-browser testing: Chrome, Firefox, Safari, mobile Safari, mobile Chrome
- [ ] Lighthouse audit targets: performance > 90, accessibility > 95, best practices > 90

## 6. Infrastructure

- [ ] Production domain configured and DNS propagated
- [ ] SSL/TLS certificate active (auto-renew via Let's Encrypt or provider)
- [ ] CDN configured for static assets and Next.js static output
- [ ] Database backups: automated daily with 30-day retention
- [ ] Error monitoring deployed (Sentry or equivalent), alerts to team channel
- [ ] Uptime monitoring: external probe every 60 seconds, alert on 2 consecutive failures
- [ ] Rate limiting on all API endpoints (per-IP and per-session)
- [ ] CORS restricted to production domain only (remove wildcard)
- [ ] Environment variables reviewed: no secrets in client bundle, no testnet values in production

## 7. Legal and Compliance

- [ ] Terms of service published at /terms
- [ ] Privacy policy updated for mainnet data handling
- [ ] Cookie banner functional and compliant
- [ ] Disclaimer visible: protocol is experimental, not financial advice
- [ ] Evaluate geo-blocking requirements for restricted jurisdictions
- [ ] Open-source license confirmed (if applicable)

## 8. Token Launch

Only if RAQIO governance token is included in mainnet launch.

- [ ] RAQIO token contract deployed and verified on Elysium mainnet
- [ ] Total supply: 100,000,000 RAQIO, fixed, no mint function
- [ ] Initial liquidity provided on DEX
- [ ] Team tokens (25%) vested via Raqio streams: 4-year linear, 1-year cliff
- [ ] Treasury tokens (30%) vested via Raqio streams: 4-year linear, 1-year cliff
- [ ] Token listed on at least one DEX with sufficient depth
- [ ] CoinGecko listing application submitted
- [ ] CoinMarketCap listing application submitted
- [ ] Token contract address published on docs, website, and socials

## 9. Communications

- [ ] Launch announcement post drafted and reviewed
- [ ] Documentation site live and complete at /docs
- [ ] Twitter/X account set up and first posts scheduled
- [ ] Community channel created (Discord or Telegram)
- [ ] Developer integration docs: code examples for createStream, claim via viem/ethers
- [ ] Video walkthrough: creating a stream from wallet connect to confirmation
- [ ] Press kit: logo assets, one-pager, protocol summary

## 10. Post-Launch

First 48 hours are critical monitoring period.

- [ ] Monitor all contract interactions: watch for reverts, unexpected patterns
- [ ] Watch for unusual behavior: mass cancellations, fee manipulation attempts, large single streams
- [ ] Indexer health: confirm zero missed events, lag under 10 seconds
- [ ] Community feedback collection: pinned thread or form
- [ ] Bug bounty program live on Immunefi or equivalent
- [ ] Incident response plan documented: who to contact, how to pause if needed
- [ ] First governance proposal planned (signal vote on fee parameters or grants)
- [ ] Roadmap update published: what comes after mainnet

---

Last updated: 2026-11-08
