# AlphaRank — Deployment Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase account and project
- GenLayer Testnet account
- MetaMask or injected wallet

---

## 1. Environment Setup

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` | Deployed AlphaRank contract address |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | GenLayer RPC endpoint |
| `NEXT_PUBLIC_CHAIN_ID` | GenLayer chain ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |

---

## 2. Deploy the GenLayer Contract

### 2a. Install GenLayer CLI

```bash
pip install genlayer
```

### 2b. Deploy the contract

```bash
genlayer deploy contracts/AlphaRank.py \
  --network testnet \
  --account YOUR_WALLET
```

Save the deployed contract address and set it in `.env.local`.

---

## 3. Run Supabase Migrations

In your Supabase project dashboard:
1. Go to **SQL Editor**
2. Run the contents of `supabase/migrations/001_initial.sql`

Or using Supabase CLI:

```bash
supabase db push
```

---

## 4. Build & Run

### Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

> **Note on build:** `npm run build` uses `--experimental-build-mode compile` to avoid a known Next.js 16 prerender bug on Windows (see: [Next.js #80000](https://github.com/vercel/next.js/issues)). This produces a fully functional server-side-rendered production build. All AlphaRank routes are dynamic (server-rendered on demand), so no static prerendering is required.

---

## 5. Deploy to Vercel (Recommended)

```bash
npx vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings > Environment Variables**.

The `--experimental-build-mode compile` flag is compatible with Vercel deployments.

---

## 6. Verify Deployment

1. Open the deployed URL
2. Connect MetaMask wallet
3. Navigate to `/submit` and fill in project details
4. Lock evidence
5. Submit for GenLayer evaluation
6. Check `/rankings` and `/leaderboard`
7. Verify `/analytics` shows platform stats

---

## Architecture

```
User Browser
    │
    ├── Next.js 16 Frontend (App Router + Server Components)
    │       ├── /submit → ProjectForm → POST /api/projects
    │       ├── /rankings → LeaderboardTable (reads GenLayer)
    │       ├── /project/[id] → EvaluationPanel, ProofPanel
    │       └── /dashboard → User's projects + scores
    │
    ├── API Routes (Next.js)
    │       ├── POST /api/projects → calls create_project() on GenLayer
    │       ├── POST /api/evaluate → calls run_evaluation() on GenLayer  
    │       ├── GET /api/leaderboard → reads from GenLayer on-chain state
    │       └── All ranking/scoring logic NEVER happens in API routes
    │
    ├── GenLayer Intelligent Contract (AlphaRank.py)
    │       ├── Stores all project state
    │       ├── Runs AI evaluation via gl.vm.run_nondet_unsafe()
    │       ├── Validators independently reproduce labels/scores before consensus
    │       ├── Stores scores, tiers, rankings on-chain
    │       └── Maintains append-only historical score ledger
    │
    └── Supabase (Cache + Indexing Only)
            ├── Caches project metadata for fast search
            ├── Caches evaluation results for analytics
            ├── Stores notifications
            └── NEVER generates or determines rankings
```

**Source of Truth:** GenLayer Intelligent Contract
**Cache Layer:** Supabase (always overridden by GenLayer if conflicting)
