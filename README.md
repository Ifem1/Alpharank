# AlphaRank

AI-powered crypto project intelligence built on [GenLayer](https://genlayer.com).
AlphaRank evaluates and ranks crypto projects using on-chain AI smart contracts that
fetch live web evidence and reach tamper-proof consensus — no backend makes the
decisions, no single party controls the score.

**Live App:** [alpharank-brown.vercel.app](https://alpharank-brown.vercel.app)  
**Contract:** `0xC1086aefFb6a8a8520719b8fD7F6526c2A61e5f0` (GenLayer StudioNet)  
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
fact_check = gl.vm.run_nondet_unsafe(_leader_fact_check, _validator_fact_check)
```

The leader calls `gl.nondet.exec_prompt(..., response_format="json")` and returns
the 12 fact verdict labels plus `overall_credibility`. Each validator calls the same
leader function independently against the same evidence, producing its own second
fact result. `_fact_checks_equivalent` then compares only:

- The **overall credibility tier** — exactly one of `"high"`, `"medium"`, `"low"`, `"very_low"`
- Every one of **twelve fact verdict labels** — each exactly one of
  `"verified"`, `"partially_verified"`, `"unverified"`, `"disputed"`, `"not_checkable"`

Differences in prose (red flags wording, highlights, summary sentences) do not affect
equivalence. If any substantive label or the credibility tier differs, the validator
returns `False`, so a materially different leader fact result cannot feed scoring.
Missing or invalid fact consensus fields are rejected; they are not silently converted
into default classifications.

### Round 2 — Scoring (`_evaluate_all_scores`)

Using the fact-check result and web evidence summary as grounding, the contract scores
six dimensions (Technical 25%, Team 20%, Market Fit 20%, Security 15%, Execution 10%,
Token Utility 10%) via:

```python
scores = gl.vm.run_nondet_unsafe(_leader_scores, _validator_scores)
```

The leader independently produces all six scores, confidence, and prose lists. Each
validator independently scores the same evidence and fact-check result. `_scores_equivalent`
accepts only when all six score dimensions land in the same deterministic 10-point
band (`0-9`, `10-19`, ... `90-100`) and confidence differs by no more than 10 points.
For example, `84` and `82` agree; `84` and `62` reject. Strengths, weaknesses, and
recommendation wording are normalized for storage but are not consensus fields.
The same-band rule is intentionally strict at band boundaries, so `80` and `89`
agree while `79` and `80` reject. Missing, non-numeric, or out-of-range score
consensus fields are rejected; they are not silently converted into default `50`
or `70` values.

### Malformed output handling

Consensus fields are structurally validated before equivalence and again before
storage. The contract requires all twelve fact labels, the credibility tier, all six
score dimensions, and confidence to be present and valid. Fallback normalization is
limited to non-consensus prose fields such as summaries, strengths, weaknesses, and
recommendations.

### What is deliberately deterministic

Everything outside those two LLM calls is deterministic:

- Access control (`assert project["owner"] == sender`)
- Evidence hashing (SHA-256 of submitted data)
- Score arithmetic and weighted average
- Tier assignment thresholds (S+ ≥ 95, S ≥ 90, …)
- Credibility cap logic after weighted arithmetic (`low`/`very_low` -> overall score <= 60)
- Storage reads and writes
- Reputation and leaderboard updates based only on stored post-consensus scores

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
                               │    run_nondet_unsafe → leader labels compared with validator labels
                               │
                               └─ _evaluate_all_scores()
                                    run_nondet_unsafe → leader scores compared with validator scores
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
- **Consensus primitive:** `gl.vm.run_nondet_unsafe` with explicit leader and validator functions
- **Runner:** `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- **Source hash:** `3F0B9CAECEA607C36904C39005A92B5F9FA7C62E58BC551FB3571714F7C19EAC`
- **Deployment tx:** `0xe371672d8e396d9bd0652e9a33118e6def0c0604e0d199568190e352166b24fb`
- **Consensus smoke tx:** `0x56d76e1fb4d415be45be197a5784477eb26e146f8fbfd09fe44fdf4d94cd38c4`
- **Smoke evaluation:** project `27885557bdaa4e62ba2267665a92349f`, evaluation `1ce8259e1d47526c2fb1d4ea4750cdb7`

Final local proof commands passed on the hardened source:

```bash
genvm-lint check contracts/AlphaRank.py --json
python -m unittest tests.test_consensus_rules
npm run lint
npx tsc --noEmit
npm run build
```

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
