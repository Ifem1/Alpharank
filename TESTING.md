# AlphaRank — Testing Guide

## Local Development

### 1. Start Dev Server

```bash
npm run dev
```

Open `http://localhost:3000`

### 2. GenLayer Local Testing

For local contract testing, use GenLayer Studio:

```bash
# Install GenLayer CLI
pip install genlayer

# Start local GenLayer node
genlayer node start

# Deploy contract locally
genlayer deploy contracts/AlphaRank.py --network localnet
```

Update `.env.local`:
```
NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=<local-address>
NEXT_PUBLIC_CHAIN_ID=61999
```

### 3. End-to-End Test Flow

**Test the golden path:**

1. **Connect wallet** — Click "Connect Wallet" → MetaMask → select GenLayer network
2. **Submit project** — Navigate to `/submit`, fill all fields, click Submit
3. **Verify project created** — Redirects to `/project/[id]`, status = `draft`
4. **Lock evidence** — Click "Lock Evidence", confirm in wallet
5. **Verify lock** — Status = `evaluation_locked`, evidence hash displayed
6. **Submit evaluation** — Click "Submit for GenLayer Evaluation"
7. **Wait for validators** — Status = `evaluating`, spinner shows
8. **Check results** — Status = `ranked`, scores displayed with tier badge
9. **View leaderboard** — Navigate to `/leaderboard`, project appears
10. **View proof panel** — All GenLayer proof steps show `complete`

### 4. Test Supabase Caching

```bash
# In Supabase dashboard, run:
SELECT * FROM projects;
SELECT * FROM evaluations;
SELECT * FROM rankings;
```

Verify that data in Supabase matches GenLayer on-chain state.

### 5. Test Evidence Lock Protection

After locking:
1. Try calling `PUT /api/projects/:id` → Should return 400 "Project is locked"
2. Verify evidence hash is immutable across page refreshes

### 6. Test Historical Scores

After two evaluations:
- Navigate to `/history?project_id=<id>`
- Verify both evaluations appear (append-only)
- Verify scores are never overwritten

### 7. TypeScript Check

```bash
npx tsc --noEmit
```

### 8. Lint

```bash
npm run lint
```

### 9. Build

```bash
npm run build
```

Expect all routes to compile successfully.

## Contract Unit Tests

Run the adversarial consensus regression tests:

```bash
python -m unittest tests.test_consensus_rules
```

These tests cover:

- Same fact labels with different prose -> accept
- Different fact label -> reject
- Different credibility tier -> reject
- Leader fact payload missing a required label -> reject
- Validator fact payload missing a required label -> reject
- Invalid fact verdict or credibility tier -> reject
- Malformed leader or validator fact JSON cannot default into a valid consensus result
- Empty `{}` and missing-field fact payloads are rejected before leader-path normalization
- Empty fact leader returns are rejected by the validator callback path
- Scores in the same accepted 10-point band -> accept
- Score band boundary: `80`/`89` accepts, `79`/`80` rejects
- Materially different score bands -> reject
- Malicious/wrong leader fact result versus independently derived validator result -> reject
- Malicious/wrong leader score result versus independently derived validator result -> reject
- Missing, non-numeric, below-0, above-100, or missing-confidence score payloads -> reject
- Empty `{}` and missing-field score payloads are rejected before leader-path normalization
- Empty score leader returns are rejected by the validator callback path
- Validator callback-path harnesses for fact disagreement, score disagreement, and same-band score agreement
- `very_low`/`low` credibility cap boundaries:
  - raw 95 + `very_low` -> 60
  - raw 73 + `low` -> 60
  - raw 55 + `low` -> 55
  - raw 95 + `medium` -> 95

The callback-path tests use a local `gl.vm.Return` stub because the GenLayer runner
does not provide a deterministic way to inject different LLM payloads into live
leader and validator nodes. They exercise the same validator acceptance helpers used
inside the contract's `run_nondet_unsafe` callbacks, while live StudioNet receipts
remain the proof for real validator execution.

Test the GenLayer contract directly:

```python
# test_alpharank.py
from genlayer.testing import ContractTestRunner

runner = ContractTestRunner('contracts/AlphaRank.py')

def test_create_project():
    result = runner.call('create_project', [
        'Test Protocol', 'DeFi', 'https://test.io', 'Test description',
        'https://whitepaper.test.io', 'https://docs.test.io',
        '["https://github.com/test/repo"]', 'Q1 2026: Mainnet launch',
        '{"utility":"Governance","emissions":"4yr","supply":"100M"}',
        '[]', '[]', '[]', '[]', '', '[]'
    ], sender='0xTEST_WALLET')
    assert result is not None
    assert len(result) == 32  # project_id is 32 chars

def test_lock_evidence():
    project_id = runner.call('create_project', [...])
    evidence_hash = runner.call('lock_project_data', [project_id])
    assert evidence_hash.startswith('0x')
    assert len(evidence_hash) == 66

def test_cannot_edit_after_lock():
    project_id = runner.call('create_project', [...])
    runner.call('lock_project_data', [project_id])
    try:
        runner.call('update_project_before_lock', [project_id, ...])
        assert False, "Should have failed"
    except AssertionError as e:
        assert 'locked' in str(e).lower()
```

Run with:
```bash
genlayer test test_alpharank.py
```
