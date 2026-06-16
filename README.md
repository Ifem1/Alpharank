# AlphaRank

AI-powered crypto intelligence platform built on [GenLayer](https://genlayer.com). AlphaRank evaluates and ranks crypto projects using on-chain AI smart contracts with live web fact-checking, delivering objective, tamper-proof scores directly on the blockchain.

**Live App:** [alpharank-brown.vercel.app](https://alpharank-brown.vercel.app)  
**Contract:** `0x36De06c17912d1e2DEDc90CaFEC48A811820B647` (GenLayer Testnet)

---

## Features

- On-chain AI evaluation of crypto projects via GenLayer intelligent contracts
- **Live web fact-checking** — contract fetches and verifies project URLs at evaluation time
- **Third-party intelligence** — independently queries CoinGecko, DeFiLlama, and GitHub to cross-check claims
- **Decentralised AI consensus** via GenLayer's Equivalence Principle — multiple validator nodes agree on every score before it's written on-chain
- Real-time scoring with async polling for evaluation results
- Dashboard with project rankings, tier badges, and detailed analysis
- Wallet-connected submissions and immutable evidence locking

## How Evaluation Works

1. **Project submits** — website, whitepaper, GitHub repos, audit reports, team, tokenomics
2. **Evidence is locked** — a SHA-256 hash of all submitted data is stored on-chain; nothing can be changed after this point
3. **Contract fetches live web data** — hits every submitted URL directly from within the intelligent contract
4. **Third-party fact-checking** — independently searches CoinGecko, DeFiLlama, and GitHub for the project; not relying on self-reported data
5. **AI scores via Equivalence Principle** — multiple GenLayer validators each run the evaluation prompt independently; only a consensus result is accepted
6. **Score written on-chain** — immutable, verifiable, not controlled by any backend

### Scoring Categories

| Category | Weight | What it measures |
|---|---|---|
| Technical | 25% | Architecture, docs, GitHub activity |
| Team | 20% | Verifiable credentials, online presence |
| Market Fit | 20% | Problem clarity, traction, aggregator listings |
| Security | 15% | Audit accessibility, bug bounty, open source |
| Execution | 10% | Shipped product evidence, roadmap specificity |
| Token Utility | 10% | Token necessity, supply logic, value capture |

### Fact-Check Report

Every evaluation includes a `fact_check_report` with verdicts on:
- `website_live` — is the site actually reachable?
- `audit_reports_accessible` — can the audit URLs be fetched?
- `github_repos_active` — real commit activity via GitHub API?
- `listed_on_coingecko` — independently verified on CoinGecko
- `listed_on_defillama` — independently verified on DeFiLlama
- `independent_github_presence` — community forks/mentions found via GitHub search
- `overall_credibility` — `high / medium / low / very_low`

Projects with `low` or `very_low` credibility are capped at a score of 60.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Blockchain:** GenLayer (intelligent contracts with web access)
- **Database:** Supabase
- **Deployment:** Vercel

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Key variables:

```
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x36De06c17912d1e2DEDc90CaFEC48A811820B647
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `DEPLOYMENT.md` for the full list.

## Deployment

The app is deployed on Vercel: [alpharank-brown.vercel.app](https://alpharank-brown.vercel.app)

For self-hosting instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Smart Contract

- **Address:** `0x36De06c17912d1e2DEDc90CaFEC48A811820B647`
- **Network:** GenLayer Testnet
- **Source:** [`contracts/AlphaRank.py`](contracts/AlphaRank.py)

The contract uses `gl.get_webpage()` for live URL fetching and `gl.eq_principle.prompt_non_comparative()` for decentralised AI consensus. See [CONTRACT_GUIDE.md](CONTRACT_GUIDE.md) for the full ABI and state machine.

## Testing

See [TESTING.md](TESTING.md) for the testing guide.
