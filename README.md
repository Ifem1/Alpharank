# AlphaRank

AI-powered crypto project intelligence built on [GenLayer](https://genlayer.com).
AlphaRank evaluates and ranks crypto projects using on-chain AI smart contracts that
fetch live web evidence and reach tamper-proof consensus — no backend makes the
decisions, no single party controls the score.

**Live App:** [alpharank-brown.vercel.app](https://alpharank-brown.vercel.app)  
**Contract:** `0x175c87A1A7d971C6f36dE85811Fead868DE7E44D` (GenLayer StudioNet)  
**Explorer:** [studio.genlayer.com](https://studio.genlayer.com)

---

## What it does

A project submits its website, whitepaper, GitHub repos, audit reports, and team
information. AlphaRank's intelligent contract independently fetches every submitted URL
from inside the consensus round, cross-checks claims against CoinGecko, DeFiLlama, and
GitHub search, then runs a multi-validator AI scoring round. The resulting score is
written to the chain only after a quorum of validators agrees — not because the app
owner says so.

**One sentence:** Submit your crypto project, and an on-chain AI that cannot be bribed
gives it an objective, verifiable score.

---

## Why GenLayer and not a backend

Delete GenLayer. What breaks?

Without GenLayer, a single party (the app operator) decides every score. Operators
can favour paying customers, suppress competitors, or simply be wrong without recourse.
Every counterparty — investors, token buyers, ecosystem partners — must trust the
operator blindly.

With GenLayer, the scoring prompt runs independently on multiple validator nodes. Only
a quorum result is written on-chain. The operator cannot alter a score after submission,
and the evidence the contract fetched is recorded on-chain alongside the result. A regex
or a price feed cannot answer "is this team credible?" or "does this whitepaper match
what the website says?" — that requires judgement, and judgement requires consensus.

---

## How consensus is used

`run_evaluation` contains two non-deterministic rounds:

### Round 1 — Fact-check (`_fact_check_claims`)

The contract fetches live content from every project-submitted URL plus independent
queries to CoinGecko, DeFiLlama, and GitHub. It then calls:

```python
raw = gl.eq_principle.prompt_non_comparative(prompt, _fact_validator)
```

`_fact_validator(output)` rejects any output that does not contain all 12 fact verdict
labels as one of the five declared enumerated values, AND `overall_credibility` as one
of the four declared tier values. Any dict that merely has "dict shape" but uses
out-of-vocabulary values (e.g. `"fetch_failed"`, `"inconclusive"`) is rejected, so
only schema-conformant outputs can achieve consensus. The equivalence principle requires
validators to agree on:

- The **overall credibility tier** — exactly one of `"high"`, `"medium"`, `"low"`, `"very_low"`
- Every one of **twelve fact verdict labels** — each exactly one of
  `"verified"`, `"partially_verified"`, `"unverified"`, `"disputed"`, `"not_checkable"`

Differences in prose (red flags wording, summary sentences) do not affect equivalence.
Only the enumerated labels are compared. This prevents a single leader from deciding
a "low credibility" verdict that triggers the 60-point scoring cap without validator
agreement.

### Round 2 — Scoring (`_evaluate_all_scores`)

Using the fact-check result and web evidence summary as grounding, the contract scores
six dimensions (Technical 25%, Team 20%, Market Fit 20%, Security 15%, Execution 10%,
Token Utility 10%) via:

```python
raw = gl.eq_principle.prompt_non_comparative(prompt, _score_validator)
```

`_score_validator(output)` rejects any output where a score key is missing, non-integer,
or out of `[0, 100]`. Only schema-conformant scoring outputs can achieve consensus.
The equivalence principle requires validators to agree on the
**10-point band** each score falls in — not the exact integer. This avoids the
float-disagreement trap where `72` and `73` cause `UNDETERMINED` even though the
evaluation conclusion is identical.

### What is deliberately deterministic

Everything outside those two LLM calls is deterministic:

- Access control (`assert project["owner"] == sender`)
- Evidence hashing (SHA-256 of submitted data)
- Score arithmetic and weighted average
- Tier assignment thresholds (S+ ≥ 95, S ≥ 90, …)
- Credibility cap logic (low/very_low → overall score ≤ 60)
- Storage reads and writes

Keeping these deterministic means validators cannot diverge on the structural logic —
only on the inherently semantic judgements where divergence is meaningful.

---

## Architecture and data flow

```
User browser
  │
  ├─ create_project()  ──► GenLayer write (deterministic, ~30 s)
  ├─ lock_project_data() ► GenLayer write (deterministic, ~30 s)
  ├─ submit_evaluation() ► GenLayer write (deterministic, ~30 s)
  └─ run_evaluation()  ──► GenLayer write (2 nondet rounds, ~4–7 min)
                               │
                               ├─ _fetch_web_evidence()
                               │    gl.get_webpage(project URLs)
                               │    gl.get_webpage(CoinGecko, DeFiLlama, GitHub)
                               │
                               ├─ _fact_check_claims()
                               │    prompt_comparative → 12 labels + credibility tier
                               │
                               └─ _evaluate_all_scores()
                                    prompt_comparative → 6 scores in 10-pt bands
                                    → tier, evidence hash written to chain

Read path (instant):
  Browser → /api/* route (CORS proxy only) → genlayer-js readContract → StudioNet RPC
```

**Supabase** is a read-cache for fast project indexing and notification delivery. It
stores no scores and makes no decisions — those exist only on GenLayer. If Supabase is
empty or unreachable, the app falls back to `localStorage` for projects the user
created in this browser and reads evaluations directly from GenLayer via the
`/api/evaluate` route.

---

## Wallet model

| Mode | When | How |
|---|---|---|
| Injected wallet (MetaMask, Rabby) | `window.ethereum` detected | `createClient({ chain: studionet, account: walletAddress, provider: window.ethereum })` |
| Generated wallet | No injected wallet | Private key in `localStorage`; key can be exported/imported; clear warning shown before use |

Reads and writes always use the same address. The active address is shown in the navbar.
StudioNet is gasless — no faucet needed, `0 GEN` balance is expected.

---

## Transaction lifecycle

The UI surfaces every consensus stage in real time:

`PENDING → PROPOSING → COMMITTING → REVEALING → ACCEPTED → FINALIZED`

`UNDETERMINED` (validators could not agree) is shown as a retryable outcome, not an
error. `VALIDATORS_TIMEOUT` and `LEADER_TIMEOUT` get the same treatment. `ACCEPTED`
results are labelled as provisional until `FINALIZED`.

---

## Smart contract

- **Source:** [`contracts/AlphaRank.py`](contracts/AlphaRank.py)
- **Network:** GenLayer StudioNet (gasless)
- **Equivalence principles:** `prompt_comparative` for both fact-check and scoring rounds
- **Runner:** `py-genlayer:1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh`

The contract address is updated in `src/lib/genlayer.ts` and `.env` after each
deployment. The current address is in `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS`.

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values below
npm run dev
```

Environment variables:

```
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=<deployed contract address>
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
NEXT_PUBLIC_APP_URL=https://alpharank-brown.vercel.app
```

---

## Testing

See [TESTING.md](TESTING.md). Run:

```bash
PYTHONIOENCODING=utf-8 genvm-lint check contracts/AlphaRank.py --json
```

Lint result: `{"ok":true,"validate":{"methods":20,"view_methods":10,"write_methods":10}}`

---

## Honest limits

- **StudioNet balances are simulated** — GEN value flows are demonstrated but not
  proven at the EVM level.
- **`UNDETERMINED` happens** — when validators cannot reach quorum, nothing is written
  and the transaction must be retried. The UI offers a retry button.
- **Evaluation takes 4–7 minutes** — two nondet rounds × multiple web fetches. The UI
  shows an elapsed timer and the current consensus stage.
- **Supabase dependency** — the project list in the dashboard is populated from a cache.
  Projects submitted in a different browser session may not appear until the cache is
  warmed.
- **Third-party fetch variability** — CoinGecko and GitHub rate-limit unauthenticated
  requests; the contract gracefully maps failed fetches to `"not_checkable"` rather than
  `"unverified"`, so a rate-limited fetch does not unfairly penalise a project.

---

## Deployment

Deployed on Vercel: [alpharank-brown.vercel.app](https://alpharank-brown.vercel.app)

For contract redeployment after source changes:

```bash
genlayer network set studionet
genlayer deploy --contract contracts/AlphaRank.py
# update NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS in Vercel env vars + .env.local
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Vercel setup guide.
