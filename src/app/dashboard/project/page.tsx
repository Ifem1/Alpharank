'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EvidenceLockPanel } from '@/components/EvidenceLockPanel';
import { EvaluationPanel } from '@/components/EvaluationPanel';
import { HistoricalChart } from '@/components/HistoricalChart';
import { GenLayerProofPanel } from '@/components/GenLayerProofPanel';
import {
  TechnicalScoreCard, TeamScoreCard, MarketFitCard,
  SecurityScoreCard, ExecutionScoreCard, TokenUtilityCard,
} from '@/components/ScoreCard';
import { TierBadge } from '@/components/TierBadge';
import { Skeleton } from '@/components/Skeleton';
import { formatDate, formatScore, getScoreHex } from '@/utils';
import type { Project, Evaluation, HistoricalScore, GenLayerProof, GenLayerProofStep } from '@/types';

interface DashboardProjectData {
  project: Project;
  evaluation: Evaluation | null;
  history: HistoricalScore[];
}

function buildProof(project: Project, evaluation: Evaluation | null): GenLayerProof {
  const steps: GenLayerProofStep[] = [
    { label: 'Project Submitted', status: 'complete', timestamp: project.created_at, method: 'create_project' },
    { label: 'Evidence Locked', status: project.evidence_hash ? 'complete' : 'pending', timestamp: project.locked_at, method: 'lock_project_data' },
    { label: 'Evaluation Started', status: ['evaluating','ranked','reevaluation_pending'].includes(project.status) ? 'complete' : 'pending', method: 'submit_evaluation' },
    { label: 'Evaluation Finalized', status: evaluation ? 'complete' : 'pending', timestamp: evaluation?.evaluated_at, method: 'finalize_score' },
    { label: 'Ranking Updated', status: project.status === 'ranked' || project.status === 'reevaluation_pending' ? 'complete' : 'pending', method: 'update_leaderboard' },
  ];
  return {
    project_id: project.project_id,
    contract_address: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || '0x36De06c17912d1e2DEDc90CaFEC48A811820B647',
    evidence_hash: project.evidence_hash,
    evaluation_hash: evaluation?.evaluation_hash,
    steps,
  };
}

function DashboardProjectInner() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  const [data, setData] = useState<DashboardProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/evaluate?project_id=${projectId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/history/${projectId}`).then((r) => r.json()),
    ])
      .then(([project, evaluation, historyData]) => {
        setData({
          project,
          evaluation: evaluation?.evaluation_id ? evaluation : null,
          history: historyData?.history ?? [],
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p style={{ color: '#9b86b8' }}>Connect your wallet to view your project dashboard.</p>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="mb-4" style={{ color: '#9b86b8' }}>No project selected.</p>
        <Link href="/dashboard" style={{ color: '#e6bef7' }}>← Back to Dashboard</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-9 w-56 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p style={{ color: '#9b86b8' }}>Project not found.</p>
        <Link href="/dashboard" className="block mt-3" style={{ color: '#e6bef7' }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const { project, evaluation, history } = data;
  const isOwner = address?.toLowerCase() === project.owner?.toLowerCase();
  const proof = buildProof(project, evaluation);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: '#9b86b8' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#e6bef7')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9b86b8')}
      >
        ← Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-black" style={{ color: '#f5eeff' }}>{project.name}</h1>
            {evaluation && <TierBadge tier={evaluation.tier} size="lg" />}
            {evaluation && (
              <span
                className="text-2xl font-black font-mono"
                style={{ color: getScoreHex(evaluation.overall_score) }}
              >
                {formatScore(evaluation.overall_score)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#9b86b8' }}>
            <span className="uppercase tracking-widest border rounded px-1.5 py-0.5"
              style={{ borderColor: 'rgba(230,190,247,0.15)', color: '#9b86b8' }}>
              {project.category}
            </span>
            <span>{formatDate(project.created_at)}</span>
            <span
              className="flex items-center gap-1.5"
              style={{ color: project.status === 'ranked' ? '#4ade80' : project.status === 'evaluating' ? '#fbbf24' : '#9b86b8' }}
            >
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'currentColor' }} />
              {project.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/project/${project.project_id}`}
            className="text-sm px-4 py-2 rounded-lg font-medium transition-all"
            style={{ background: 'rgba(230,190,247,0.07)', border: '1px solid rgba(230,190,247,0.14)', color: '#e6bef7' }}
          >
            Public View →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Individual score cards */}
          {evaluation && (
            <div>
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: '#6b5490' }}>
                Score Breakdown
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TechnicalScoreCard score={evaluation.technical_score} />
                <TeamScoreCard score={evaluation.team_score} />
                <MarketFitCard score={evaluation.market_fit_score} />
                <SecurityScoreCard score={evaluation.security_score} />
                <ExecutionScoreCard score={evaluation.execution_score} />
                <TokenUtilityCard score={evaluation.token_utility_score} />
              </div>
            </div>
          )}

          {/* Evaluation action panel */}
          <EvaluationPanel
            project={project}
            evaluation={evaluation}
            onEvaluate={() => setRefreshKey((k) => k + 1)}
          />

          {/* Score history */}
          {history.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}>
              <h2 className="font-semibold text-sm mb-4" style={{ color: '#f5eeff' }}>Score History</h2>
              <HistoricalChart history={history} />
            </div>
          )}

          {/* Strengths / Weaknesses / Recommendations */}
          {evaluation && (evaluation.strengths.length > 0 || evaluation.recommendations.length > 0) && (
            <div className="rounded-xl p-5 space-y-5" style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}>
              <h2 className="font-semibold text-sm" style={{ color: '#f5eeff' }}>AI Analysis</h2>
              {evaluation.strengths.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4ade80' }}>Strengths</h3>
                  <ul className="space-y-1.5">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs" style={{ color: '#9b86b8' }}>
                        <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#f87171' }}>Weaknesses</h3>
                  <ul className="space-y-1.5">
                    {evaluation.weaknesses.map((w, i) => (
                      <li key={i} className="flex gap-2 text-xs" style={{ color: '#9b86b8' }}>
                        <span style={{ color: '#f87171', flexShrink: 0 }}>✗</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#e6bef7' }}>Recommendations</h3>
                  <ul className="space-y-1.5">
                    {evaluation.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs" style={{ color: '#9b86b8' }}>
                        <span style={{ color: '#e6bef7', flexShrink: 0 }}>→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────── */}
        <div className="space-y-4">
          {isOwner && (
            <EvidenceLockPanel
              project={project}
              onLock={() => setRefreshKey((k) => k + 1)}
            />
          )}
          <GenLayerProofPanel proof={proof} />

          {/* Project metadata */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}>
            <h3 className="font-semibold text-sm" style={{ color: '#f5eeff' }}>Project Info</h3>
            <div className="space-y-2 text-sm">
              {project.website && (
                <div className="flex justify-between">
                  <span style={{ color: '#6b5490' }}>Website</span>
                  <a href={project.website} target="_blank" rel="noopener noreferrer"
                    className="font-medium hover:underline" style={{ color: '#e6bef7' }}>
                    Visit ↗
                  </a>
                </div>
              )}
              {project.github_repos?.length > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: '#6b5490' }}>GitHub</span>
                  <span style={{ color: '#9b86b8' }}>{project.github_repos.length} repo(s)</span>
                </div>
              )}
              {project.audits?.length > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: '#6b5490' }}>Audits</span>
                  <span style={{ color: '#4ade80' }}>{project.audits.length} audit(s)</span>
                </div>
              )}
              {project.tokenomics?.token_symbol && (
                <div className="flex justify-between">
                  <span style={{ color: '#6b5490' }}>Token</span>
                  <span className="font-mono" style={{ color: '#e6bef7' }}>{project.tokenomics.token_symbol}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardProjectPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="flex items-center gap-3" style={{ color: '#6b5490' }}>
          <span className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(230,190,247,0.2)', borderTopColor: '#e6bef7' }} />
          Loading project…
        </div>
      </div>
    }>
      <DashboardProjectInner />
    </Suspense>
  );
}
