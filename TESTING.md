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
- Scores in the same accepted 10-point band -> accept
- Materially different score bands -> reject
- Malicious/wrong leader fact result versus independently derived validator result -> reject
- Malicious/wrong leader score result versus independently derived validator result -> reject
- `very_low`/`low` credibility cap boundary: a raw score above 60 is capped to 60

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
