'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ScoreBreakdown } from './ScoreBreakdown';
import { TierBadge } from './TierBadge';
import { formatScore, getScoreHex, formatDateTime } from '@/utils';
import {
  contractSubmitEvaluation,
  contractRunEvaluation,
  contractRequestReevaluation,
} from '@/lib/genlayer-write';
import {
  savePendingEval, getPendingEval, clearPendingEval,
  updatePendingEvalStage, STAGE_LABEL,
  type EvalStage,
} from '@/lib/pending-tx';
import type { Project, Evaluation } from '@/types';

interface EvaluationPanelProps {
  project: Project;
  evaluation?: Evaluation | null;
  onEvaluate?: (evaluation?: Evaluation) => void;
  className?: string;
}

const POLL_INTERVAL = 15_000; // 15 seconds
const MAX_POLLS     = 20;     // 20 × 15s = 5 minutes

// ── Stage chip ────────────────────────────────────────────────────

const STAGE_COLOR: Record<EvalStage, string> = {
  signing:    '#e6bef7',
  submitted:  '#a78bfa',
  validating: '#fbbf24',
  finalising: '#34d399',
  completed:  '#4ade80',
  stalled:    '#fb923c',
};

function StageChip({ stage }: { stage: EvalStage }) {
  const color = STAGE_COLOR[stage];
  return (
    <div className="rounded-lg p-3 text-xs flex items-center gap-2.5"
      style={{ background: `${color}0f`, border: `1px solid ${color}33` }}>
      {stage !== 'completed' && stage !== 'stalled' && (
        <span className="w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0"
          style={{ borderColor: `${color}33`, borderTopColor: color }} />
      )}
      {stage === 'completed' && <span style={{ color }}>✓</span>}
      {stage === 'stalled' && <span style={{ color }}>⚠</span>}
      <span style={{ color }}>{STAGE_LABEL[stage]}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export function EvaluationPanel({ project, evaluation: initialEvaluation, onEvaluate, className }: EvaluationPanelProps) {
  const { address } = useAccount();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(initialEvaluation ?? null);
  const [stage, setStage]     = useState<EvalStage | null>(null);
  const [error, setError]     = useState('');
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOwner = address?.toLowerCase() === project.owner?.toLowerCase();
  const canEvaluate    = isOwner && project.status === 'evaluation_locked';
  const canRetry       = isOwner && project.status === 'evaluating' && !evaluation;
  const canReevaluate  = isOwner && project.status === 'ranked';
  const isPolling      = stage !== null && stage !== 'completed' && stage !== 'stalled';

  // ── Fetch latest state from GenLayer ──────────────────────────

  const fetchLatest = useCallback(async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`/api/projects/${project.project_id}`),
        fetch(`/api/evaluate?project_id=${project.project_id}`),
      ]);
      const proj  = pRes.ok  ? await pRes.json()  : null;
      const eval_ = eRes.ok  ? await eRes.json()  : null;

      if (eval_?.evaluation_id) {
        setEvaluation(eval_ as Evaluation);

        // Sync to Supabase cache
        fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: project.project_id, wallet: address }),
        }).catch(() => {});

        clearPendingEval();
        setStage('completed');
        if (pollRef.current) clearInterval(pollRef.current);
        onEvaluate?.(eval_ as Evaluation);
        return true;
      }

      if (proj?.status === 'evaluating') setStage('validating');
      if (proj?.status === 'ranked' && !eval_?.evaluation_id) setStage('finalising');
    } catch { /* non-fatal */ }
    return false;
  }, [project.project_id, address, onEvaluate]);

  // ── Polling loop ──────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let count = 0;

    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      const done = await fetchLatest();
      if (done || count >= MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (!done) {
          setStage('stalled');
          updatePendingEvalStage('stalled');
        }
      }
    }, POLL_INTERVAL);
  }, [fetchLatest]);

  // ── On mount: resume pending eval from localStorage ───────────

  useEffect(() => {
    const pending = getPendingEval();
    if (pending && pending.project_id === project.project_id && !evaluation) {
      const elapsed = Date.now() - pending.started_at;
      if (elapsed < 300_000) {
        // Still within 5 min window — resume polling
        setStage(pending.stage === 'completed' ? 'validating' : pending.stage);
        startPolling();
      } else {
        setStage('stalled');
      }
    }
  }, [project.project_id]); // eslint-disable-line

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Run evaluation flow ───────────────────────────────────────

  async function handleEvaluate(skipSubmit: boolean) {
    if (!address) return;
    setError('');

    try {
      if (!skipSubmit) {
        setStage('signing');
        savePendingEval({ project_id: project.project_id, method: 'submit_evaluation', stage: 'signing', started_at: Date.now() });

        const submitTx = await contractSubmitEvaluation(address, project.project_id);
        setStage('submitted');
        updatePendingEvalStage('submitted', { tx_hash: submitTx });

        // Wait for project to show "evaluating" (poll up to 60s)
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 10_000));
          const r = await fetch(`/api/projects/${project.project_id}`);
          const p = r.ok ? await r.json() : null;
          if (p?.status === 'evaluating') break;
        }
      }

      // Now submit run_evaluation — returns tx hash immediately
      setStage('signing');
      updatePendingEvalStage('signing', { method: 'run_evaluation' });

      const runTx = await contractRunEvaluation(address, project.project_id);

      setStage('validating');
      updatePendingEvalStage('validating', { tx_hash: runTx });

      // Start polling — this is where the 2–5 min wait happens
      startPolling();

    } catch (e) {
      // Only real errors — wallet rejection, network failure, contract revert
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      setStage(null);
      clearPendingEval();
    }
  }

  async function handleReevaluate() {
    if (!address) return;
    setError('');
    setStage('signing');
    try {
      await contractRequestReevaluation(address, project.project_id);
      setStage(null);
      fetch('/api/reevaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.project_id, wallet: address }),
      }).catch(() => {});
      onEvaluate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reevaluation failed');
      setStage(null);
    }
  }

  async function handleRefresh() {
    setStage('finalising');
    const done = await fetchLatest();
    if (!done) setStage('stalled');
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className={className}
      style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.10)', borderRadius: '12px', padding: '20px' }}>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: '#f5eeff' }}>GenLayer Evaluation</h3>
        {/* Refresh status button — always visible during/after evaluation */}
        {(isPolling || stage === 'stalled' || evaluation) && (
          <button onClick={handleRefresh}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(230,190,247,0.07)', border: '1px solid rgba(230,190,247,0.15)', color: '#e6bef7' }}>
            ↻ Refresh Status
          </button>
        )}
      </div>

      {/* ── Active evaluation exists ─────────────────────────── */}
      {evaluation ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4"
            style={{ borderBottom: '1px solid rgba(230,190,247,0.07)' }}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black font-mono"
                style={{ color: getScoreHex(evaluation.overall_score), textShadow: `0 0 20px ${getScoreHex(evaluation.overall_score)}55` }}>
                {formatScore(evaluation.overall_score)}
              </span>
              <span className="text-sm" style={{ color: '#6b5490' }}>/ 100</span>
            </div>
            <div className="text-right">
              <TierBadge tier={evaluation.tier} size="lg" />
              <div className="text-[10px] mt-1" style={{ color: '#6b5490' }}>{evaluation.confidence}% confidence</div>
            </div>
          </div>

          <ScoreBreakdown evaluation={evaluation} />

          {evaluation.strengths?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#4ade80' }}>Strengths</h4>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: '#9b86b8' }}>
                    <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.weaknesses?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#f87171' }}>Weaknesses</h4>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: '#9b86b8' }}>
                    <span style={{ color: '#f87171', flexShrink: 0 }}>✗</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.recommendations?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#e6bef7' }}>Recommendations</h4>
              <ul className="space-y-1">
                {evaluation.recommendations.map((r, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: '#9b86b8' }}>
                    <span style={{ color: '#e6bef7', flexShrink: 0 }}>→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[10px] pt-3"
            style={{ borderTop: '1px solid rgba(230,190,247,0.06)', color: '#6b5490' }}>
            Evaluated by GenLayer validators · {formatDateTime(evaluation.evaluated_at)}
          </div>

          {canReevaluate && (
            <button onClick={handleReevaluate} disabled={!!stage}
              className="w-full text-sm font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
              style={{ background: 'rgba(230,190,247,0.07)', border: '1px solid rgba(230,190,247,0.16)', color: '#e6bef7' }}>
              {stage ? (STAGE_LABEL[stage] || 'Processing…') : 'Request Reevaluation'}
            </button>
          )}
        </div>

      ) : (
        /* ── No evaluation yet ──────────────────────────────── */
        <div className="space-y-3">

          {/* Stage progress chip */}
          {stage && <StageChip stage={stage} />}

          {/* Poll progress indicator */}
          {isPolling && pollCount > 0 && (
            <div className="text-[11px]" style={{ color: '#6b5490' }}>
              Checking on-chain state… ({pollCount * 15}s elapsed)
            </div>
          )}

          {/* Stalled state — not failure */}
          {stage === 'stalled' && (
            <div className="rounded-lg p-3 text-xs"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}>
              GenLayer validation can take up to 5 minutes. Click &quot;Refresh Status&quot; to check again.
              A timeout is NOT a failure — your transaction was submitted successfully.
            </div>
          )}

          {/* Error (real failures only) */}
          {error && !stage && (
            <div className="rounded-lg p-3 text-xs"
              style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Status text when not actively running */}
          {!stage && (
            <p className="text-sm" style={{ color: '#9b86b8' }}>
              {project.status === 'evaluating'
                ? 'Status: evaluating. Click below to run the AI evaluation.'
                : project.status === 'reevaluation_pending'
                ? 'Reevaluation request pending.'
                : 'Lock your evidence first, then run the GenLayer evaluation.'}
            </p>
          )}

          {/* A: evaluation_locked → full flow */}
          {canEvaluate && !stage && (
            <button onClick={() => handleEvaluate(false)}
              className="w-full font-semibold py-2.5 px-4 rounded-lg text-sm transition-all"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#c084fc)', color: '#fff', boxShadow: '0 0 18px rgba(168,85,247,0.35)' }}>
              ⬡ Run GenLayer Evaluation
            </button>
          )}

          {/* B: stuck in evaluating — retry run only */}
          {canRetry && !stage && (
            <div className="space-y-2">
              <div className="rounded-lg p-3 text-xs"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                ⚠ Project is in evaluating state. Click below to submit the AI evaluation.
              </div>
              <button onClick={() => handleEvaluate(true)}
                className="w-full font-semibold py-2.5 px-4 rounded-lg text-sm transition-all"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#c084fc)', color: '#fff', boxShadow: '0 0 18px rgba(168,85,247,0.35)' }}>
                ⬡ Run Evaluation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
