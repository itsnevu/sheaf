> Draft proposal — not an implemented or deployed token system. Supply allocations, staking returns, discounts, governance and burns below are unapproved design assumptions, not live protocol parameters. The implemented vault fee is separate.

# RAQIO Token Economics

## Token Overview

| Parameter       | Value                              |
| --------------- | ---------------------------------- |
| Name            | RAQIO                               |
| Network         | Elysium L2 (Chain ID 99801)        |
| Standard        | ERC-20                             |
| Total supply    | 100,000,000 (fixed, no inflation)  |
| Decimals        | 18                                 |

## Distribution

| Allocation                      | Share | Tokens      | Vesting                              |
| ------------------------------- | ----- | ----------- | ------------------------------------ |
| Protocol treasury               | 30%   | 30,000,000  | 4-year linear, 1-year cliff          |
| Team & contributors             | 25%   | 25,000,000  | 4-year linear, 1-year cliff          |
| Community & ecosystem grants    | 20%   | 20,000,000  | Unlocked on grant approval           |
| Public sale / liquidity          | 15%   | 15,000,000  | 20% at TGE, 80% over 12 months      |
| Security audit fund & bounties  | 10%   | 10,000,000  | Unlocked, disbursed on completion    |

Team and treasury allocations are vested through Raqio's own RaqioStream contracts (dog-fooding). This means vesting terms are enforced on-chain and publicly verifiable.

## Supply Unlock Schedule

```
Year 0 (TGE):    ~28M circulating
  - Public sale TGE unlock:     3,000,000  (20% of 15M)
  - Community grants (initial): 15,000,000
  - Security fund:              10,000,000

Year 0-1 (cliff period):
  - Public sale monthly unlock: 1,000,000/month (12M over 12 months)
  - Community grants disbursed as approved
  - Treasury & team: locked (cliff)

Year 1-4 (linear vesting):
  - Treasury unlocks:  ~625,000/month (30M over 48 months, starts month 12)
  - Team unlocks:      ~520,833/month (25M over 48 months, starts month 12)

Year 4+:
  - All tokens fully vested
  - Circulating supply = total supply minus cumulative burns
```

Projected circulating supply (excluding burns):
- Month 0:  28,000,000  (28%)
- Month 6:  34,000,000  (34%)
- Month 12: 40,000,000  (40%)
- Month 24: 53,750,000  (53.75%)
- Month 36: 67,500,000  (67.5%)
- Month 48: 100,000,000 (100%)

## Utility

### Governance voting
1 RAQIO = 1 vote. Token holders vote on protocol parameters, fee changes, treasury allocations, and upgrade proposals. Voting weight is multiplied by staking lock duration.

### Fee discount
RAQIO stakers receive reduced protocol fees on stream creation:
- No stake: 25 bps (0.25%)
- Any active stake: 15 bps (0.15%)

The discount applies at deposit time. The FeeRouter contract checks staking status on-chain.

### Protocol revenue sharing
50% of all protocol fees collected by FeeRouter are distributed to RAQIO stakers proportional to their staking weight. Distributions happen per-block and are claimable at any time.

## Burn Mechanism

RAQIO is deflationary. Tokens are permanently removed from supply through two mechanisms:

### Fee burns
5% of all protocol fees collected are used to buy RAQIO on the open market and burn it. The burn happens through an automated buyback contract with a 24-hour TWAP to prevent manipulation.

### Cancellation burns
When a cancelable stream is canceled, 1% of the unvested token amount is converted to RAQIO and burned. This creates a cost to cancellation that increases with larger streams.

### Deflationary projection
At a conservative estimate of 10,000 streams per month with an average deposit of 10,000 tokens:
- Monthly fee revenue: ~25,000 tokens (25 bps on 100M volume)
- Monthly fee burn: ~1,250 tokens worth of RAQIO
- Cancellation burns: variable, additive

The burn rate accelerates with protocol adoption. Over years, cumulative burns reduce effective supply below the 100M cap.

## Staking

### Lock periods and multipliers

| Lock period | Weight multiplier | APY boost |
| ----------- | ----------------- | --------- |
| 30 days     | 1.0x              | Base      |
| 90 days     | 1.5x              | +50%      |
| 180 days    | 2.0x              | +100%     |
| 365 days    | 3.0x              | +200%     |

Weight multiplier affects both governance voting power and revenue share allocation.

### Auto-compound
Stakers can enable auto-compound, which automatically restakes earned revenue share into the same lock position. This compounds returns without manual claiming.

### Unstaking
Tokens can only be withdrawn after the lock period ends. Early withdrawal is not possible. Stakers can extend their lock at any time to upgrade their multiplier.

## Governance

| Parameter            | Value                        |
| -------------------- | ---------------------------- |
| Proposal threshold   | 100,000 RAQIO (0.1% supply)  |
| Quorum               | 4% of circulating supply     |
| Voting period        | 7 days                       |
| Execution timelock   | 48 hours                     |

### Governable parameters
- Protocol fee rate (within 0-50 bps hard cap)
- Fee discount thresholds
- Revenue share ratio
- Treasury disbursements
- Contract upgrades (proxy pattern)
- Burn rate percentage

### Process
1. Proposal submitted with 100,000 RAQIO stake
2. 2-day review period (no voting)
3. 7-day voting period
4. If quorum met and majority votes yes: 48-hour timelock
5. Execution after timelock

Failed proposals return the stake. Passed proposals also return the stake after execution.

## Security

### Treasury management
- 3-of-5 multi-sig (Gnosis Safe)
- Signers: 2 team members, 1 advisor, 2 community-elected
- All disbursements require governance approval above 50,000 RAQIO
- Emergency pause: any 2 signers can pause protocol (unpause requires 3)

### Timelock
All parameter changes enforced by a 48-hour timelock contract. The timelock address is the owner of FeeRouter and any future governance-controlled contracts.

### Audit
The RAQIO token contract, staking contract, and governance contract will be audited before mainnet launch. The security audit fund (10M RAQIO) covers:
- Initial audit: 2 independent firms
- Ongoing bug bounty program
- Future re-audits on upgrades
