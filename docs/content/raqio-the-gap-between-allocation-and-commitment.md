# The Gap Between a Token Allocation and a Real Commitment

![Three engraved blue bridges crossing a mountain ravine beneath a celestial sky.](assets/raqio-commitment-no-text.png)

*Token distribution gets announced in percentages. Recipients experience it through deadlines, uncertainty, and the ability to claim. Closing that gap starts with making the terms and the funding verifiable.*

Consider a contributor who has been allocated tokens for work on a project. The amount is confirmed. The announcement is public. A release schedule has been shared.

A few weeks later, the contributor still needs to message someone to find out what happens next.

There may be a spreadsheet to check, a treasury signer to contact, or another transaction waiting to be prepared. The contributor can see the allocation but cannot independently establish whether the funds have been set aside, what is available today, or which conditions could change the outcome.

Everyone involved may be acting in good faith. The process can still leave the person receiving the tokens dependent on someone else's attention.

This is a practical weakness in how token commitments can be organized. An allocation describes an intended distribution. Carrying out that distribution requires funding, release rules, and a way for the recipient to exercise their rights.

Raqio approaches this gap by bringing supported token locks, vesting, and funded airdrop distributions into a shared contract record on Elysium. Its purpose becomes clearer when viewed through the problems that remain after an allocation has been announced.

## The announcement leaves the hardest questions open

Token announcements usually make the amount easy to find. A chart can show the share assigned to the team, contributors, investors, or the community. A supporting document might add a cliff and a vesting period.

Those details matter, but they leave room for very different arrangements.

An allocation might already be deposited into a contract with a named beneficiary. It might remain in a general treasury wallet. It might depend on future transfers that have not yet been prepared. The same headline number can describe each of these situations.

For a recipient, the difference is substantial. Funding determines whether the assets have been committed to the mechanism. Release rules determine when a claim becomes possible. Management rights determine which parts of the arrangement remain under someone else's control.

A recipient evaluating an allocation needs those facts together. Reading an amount on one page, a schedule on another, and an explanation of cancellation in a message thread creates unnecessary work. It also increases the chance that two people understand the same commitment differently.

This uncertainty can become especially difficult when the allocation spans months. People change roles. Treasury responsibilities move. Documents acquire new versions. A recipient who was present for the original conversation may understand the arrangement differently from someone who joins later.

A stronger distribution process gives everyone a common reference that connects the promise to its execution.

## Funding gives the schedule something concrete to stand on

There is an important operational difference between planning to provide tokens over time and depositing those tokens into a mechanism that records how they can be released.

In the first arrangement, each future payment can depend on another action by the sender. In the second, the recipient has a funded record to inspect, subject to the terms and behavior of the contract and token.

Raqio makes this distinction concrete through contract-held locks and vesting streams. The creator deposits supported assets and establishes the applicable release conditions. The record connects the token, the net amount, the beneficiary, and the timing.

That connection makes a commitment easier to examine. A team can point to a specific record when explaining an allocation. A contributor can inspect the terms without waiting for someone to reconstruct them. An outside observer can distinguish a published plan from an arrangement that has actually been funded into the Vault.

Funding alone does not settle every question. A funded stream can still carry a cancellation right. The token itself may have transfer restrictions. Contract correctness remains important. These conditions deserve the same visibility as the deposit.

The benefit is that funding and release terms can be discussed from a shared factual starting point. The conversation becomes more precise because the assets and the rules are connected.

## Repeated execution creates repeated dependencies

A manual distribution process asks people to get the same sequence right again and again: confirm the amount, identify the recipient, prepare the transfer, obtain the required signatures, send it, and update the records.

For a small allocation, that may be manageable. As recipients and release dates accumulate, the process creates more coordination work. Someone needs to know which transfer belongs to which commitment, whether it was already completed, and how a change should affect the remaining balance.

A missed handoff can delay a payment even when the funds exist. A recipient may need to follow up simply because the next step is sitting with a particular person. The quality of the experience starts to depend on how reliably that coordination repeats.

Contract-defined vesting changes the structure of that work. The sender establishes and funds the release arrangement. The recipient then claims the amount available under its rules, rather than requesting a newly prepared treasury transfer for every release.

This is the role of Raqio's vesting streams. The available entitlement develops according to the recorded timeline. The recipient can inspect the record and submit a claim when tokens are available.

The distinction between entitlement and transfer still matters. A stream does not send tokens to the wallet every second. It calculates what has vested; moving the available amount requires a claim transaction and network gas.

That model gives the recipient a clearer next action. Once the required conditions are met, they can exercise the claim themselves. The process relies less on a recurring administrative handoff between the sender and the recipient.

## The recipient needs an understandable timeline

Even a funded distribution can be difficult to use if the interface or explanation blurs several different states.

An allocation is the amount assigned. The net amount in a stream reflects the deposit after applicable creation fees. The vested amount is the portion whose entitlement has accrued under the schedule. The claimable amount subtracts what has already been claimed. Claimed tokens have already left the stream for the recipient.

For someone planning around an allocation, these differences are material. A single large balance cannot explain all of them.

Consider an illustrative stream with 12,000 net tokens, a 360-day duration, and a 90-day cliff. Before the cliff, nothing is claimable. At day 90, the amount accrued from the start becomes available: 3,000 tokens. At day 180, the total vested amount is 6,000 tokens.

If the recipient already claimed 3,000 tokens at the cliff, the additional amount available at day 180 is 3,000. Showing 6,000 as though it were a new payment would give the recipient the wrong expectation.

The cliff itself also needs a clear explanation. In Raqio's implementation, it delays access to the accrued entitlement. Once the cliff is reached, the calculation accounts for time elapsed since the stream's start. The relationship between the start, cliff, and end determines the result.

A useful recipient experience makes these states legible before the user signs anything. It should help someone understand what is available now, what remains subject to time, and what they have already collected.

Raqio's public records provide the underlying terms for that explanation. Their value depends on how clearly those terms are communicated to the people relying on them.

## Control belongs in the explanation of the commitment

An amount and an end date can create an impression of certainty that the full terms do not support.

Imagine two streams with identical deposits and release periods. One allows its owner to cancel the unvested portion. The other does not. A recipient deciding how to rely on the allocation should understand that difference from the beginning.

In a cancelable Raqio stream, cancellation pays the vested but unclaimed portion to the beneficiary and returns the unvested remainder to the current owner. The calculation follows the stream's rules, including any cliff.

Using the earlier example, suppose cancellation happens at day 180, when 6,000 of the 12,000 net tokens have vested. If 3,000 tokens were already claimed, cancellation pays the remaining 3,000 vested tokens to the recipient and returns 6,000 unvested tokens to the owner.

Before the cliff, the result is different because the vested amount is still zero. That condition can materially affect a recipient's understanding of the arrangement.

This is why cancellation should be treated as a visible term of the allocation. It is part of how the commitment works, with consequences for both parties.

Raqio also separates the owner of a lock from its beneficiary. The owner can perform the management actions permitted by that lock; the beneficiary receives the applicable payouts. Transferring management ownership preserves the beneficiary in the implementation described here.

Making those roles explicit helps prevent a vague phrase such as “the tokens are locked” from carrying more meaning than the record actually supports.

## An airdrop is also a delivery problem

An airdrop announcement can attract attention well before the practical work of distribution is complete.

A recipient still needs to establish eligibility, obtain the required proof, understand the claim window, and know what a successful claim will produce. The creator needs to fund the campaign and provide a reliable path from an allocation list to a completed claim.

Raqio addresses this through funded Merkle campaigns. A creator commits to an allocation set using a Merkle root. Recipients use proofs that correspond to their wallets and amounts. The contract checks the proof and records whether that wallet has already claimed its allocation in that campaign.

This gives the campaign a defined verification mechanism. It also makes the creator's remaining responsibilities clearer. The allocation list must be correct, funding must cover the intended distribution, and recipients must receive access to the appropriate proof.

The blockchain stores the root, not every recipient's downloadable proof file. Saving and distributing those proofs is part of delivering the campaign. A funded contract with an inaccessible proof manifest can still produce a poor recipient experience.

Vesting adds another communication requirement. A direct claim transfers the allocation to the claimant. A vested claim creates a stream, after the applicable Vault creation fee, and the tokens become claimable according to that stream's terms.

In the implementation described here, the airdrop stream starts when that recipient's claim is executed. People claiming on different dates can therefore have different stream start and end dates, even when the campaign uses one vesting duration.

Campaign expiry is another distinct boundary. It determines the window for claiming an allocation. A stream already created through a successful claim follows its own vesting timeline. Explaining both timelines helps participants understand what they must do before the deadline and what happens afterward.

A distribution campaign succeeds operationally when the recipient can move from eligibility to the right action with a clear understanding of the result.

## Public records make accountability more specific

Claims of transparency become more useful when they point to evidence that answers a particular question.

For a token allocation, the relevant evidence includes the deposited asset, the amount, the beneficiary, the release conditions, and the actions already taken. A lock record and its transactions provide a reference that people can inspect together.

Raqio's public explorer makes these records readable without requiring an account to view them. A team can share a record instead of relying entirely on a screenshot or a statement about what has been arranged.

This also improves the quality of follow-up conversations. A question about the remaining allocation can be grounded in the vested and claimed amounts. A question about control can be grounded in the owner and cancellation setting. A question about timing can be grounded in the recorded timestamps.

The scope of that evidence matters. A recorded lock establishes facts about the assets in that record. It does not establish that every asset associated with a project is locked. Custody of an NFT does not, by itself, authenticate the liquidity position it is claimed to represent.

RaqioScore adds a bounded indicator derived from Vault records, including factors such as locked supply and remaining duration. The indicator can help organize an initial examination, provided readers also examine the underlying facts. It does not establish token safety, identity, market value, or future behavior.

Public records improve accountability by making claims more specific and easier to examine. Their usefulness comes from keeping the interpretation tied to what the records actually show.

## Clear terms need honest boundaries

A contract-based distribution remains subject to the system around it.

A token can impose transfer restrictions. A network transaction requires gas. A recipient needs the correct wallet. A contract can contain defects, and deployment alone does not establish an independent security audit.

A useful product explanation leaves room for these realities. It also describes the supported behavior accurately. For example, Raqio's Vault rejects deposits that arrive short because of transfer taxes, and rebasing tokens fall outside its supported accounting assumptions.

Public visibility has its own implications. Wallets, amounts, timing, and transaction events remain observable. Users should understand that these distribution records do not provide a guarantee of anonymity.

These boundaries matter because token commitments can extend across long periods. Recipients and creators need a realistic understanding of what the mechanism enforces, which conditions remain relevant, and where further review is required.

Precision helps the product's central value hold up under scrutiny. The funding can be checked. The schedule can be read. The rights can be understood. Claims about safety or outcomes should remain within the evidence available.

## A commitment people can use

From the creator's perspective, a token allocation is often part of a larger plan: compensating contributors, distributing community incentives, or recording a liquidity commitment.

From the recipient's perspective, it becomes a series of practical decisions. They need to know whether the allocation is funded, when they can access it, what action they must take, and which terms could affect the remaining amount.

Raqio brings those needs into a common structure. Supported assets are deposited into a contract. Release and claim conditions are recorded. Recipients have a way to inspect the arrangement and exercise the rights available under it.

That structure can reduce the distance between an announcement and an allocation someone can actually understand and use. It gives teams a more concrete way to demonstrate a commitment and gives recipients a clearer basis for relying on its stated terms.

A token distribution begins with an amount. Over time, its credibility depends on how the funding, the rules, and the recipient's experience fit together.

Raqio is built around making that relationship visible.

**Value, released in time.**

<!-- Editorial basis: repository commit 4cfff76ccf9ce98783c50c5e686388796dad4fba; docs/whitepaper.md; contracts/src/RaqioVault.sol; contracts/src/RaqioAirdrop.sol; contracts/src/RaqioScore.sol; src/app/(print)/docs/vault/page.tsx. Example amounts are illustrative and assume net tokens after creation fees. This article makes no claim of investment returns, independent audit, universal token compatibility, or deployed RAQIO tokenomics. -->
