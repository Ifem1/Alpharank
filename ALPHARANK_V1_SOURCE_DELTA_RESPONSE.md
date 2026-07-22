# AlphaRank V1 Source Delta Response

Review received from Joaquin on July 22, 2026 at 21:54:

> The deployed contract may contain the claimed fact-checking path, but the rewarded source and submitted source delta are not identified. Please provide an immutable comparison between the contract version reviewed with the linked Project and this deployment source.

## Response

Thank you for the review. The original Main PJ submission was based on the June 3, 2026 source. The last commit before my initial submission was:

- Original reviewed source: [`97ad211575e455cca1b9b531443a399d9484c91f`](https://github.com/Ifem1/Alpharank/commit/97ad211575e455cca1b9b531443a399d9484c91f)
- Commit date: June 3, 2026 at 21:43:54 UTC
- Commit message: `feat: new contract 0xa0BA37824D + async polling evaluation UX`

After steward feedback, I submitted V1 from the June 17, 2026 source. The latest commit in that V1 submission range was:

- V1 deployment source: [`98c7cec7bc9c1028c98cb44d569d4a9d16693315`](https://github.com/Ifem1/Alpharank/commit/98c7cec7bc9c1028c98cb44d569d4a9d16693315)
- Commit date: June 17, 2026 at 12:22:51 UTC
- Commit message: `fix: restore white text on dark search input in rankings page`

## Immutable Source Comparison

The immutable comparison between the originally reviewed source and the V1 deployment source is:

https://github.com/Ifem1/Alpharank/compare/97ad211575e455cca1b9b531443a399d9484c91f...98c7cec7bc9c1028c98cb44d569d4a9d16693315

## Primary V1 Contract Delta

The main contract change responding to the steward feedback was introduced in:

- Fact-checking commit: [`ea7ed133be530f204f075d9da66b88f0016ac52f`](https://github.com/Ifem1/Alpharank/commit/ea7ed133be530f204f075d9da66b88f0016ac52f)
- Commit date: June 16, 2026 at 23:33:02 UTC
- Commit message: `feat: add web fact-checking with third-party intelligence + new contract address`

This V1 contract update added an on-chain web fact-checking path to the AlphaRank intelligent contract. The updated `run_evaluation` flow fetches submitted project URLs and external evidence before scoring. The contract now checks submitted sources such as project websites, whitepapers, docs, GitHub repositories, audit reports, and bug bounty pages, while also fetching third-party intelligence from CoinGecko, DeFiLlama, GitHub search, and GitHub REST data.

The new fact-checking flow cross-references project-submitted claims against live web evidence and uses GenLayer validator consensus through `gl.eq_principle.prompt_non_comparative()` before producing the final evaluation. The structured fact-check report can classify claims as verified, disputed, or unverified, and the scoring prompt now incorporates these third-party validation signals.

## Additional V1 Changes

The source comparison also includes supporting V1 changes:

- README documentation was updated to describe the fact-checking system and new contract address.
- The frontend was updated to use the new V1 contract address.
- A light mode/theme toggle was added to the frontend UI.
- Follow-up UI fixes were made for light mode readability.

The main requested contract/source delta is the comparison from `97ad211575e455cca1b9b531443a399d9484c91f` to `98c7cec7bc9c1028c98cb44d569d4a9d16693315`, with the core fact-checking implementation introduced in `ea7ed133be530f204f075d9da66b88f0016ac52f`.
