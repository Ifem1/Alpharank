import { notFound } from 'next/navigation';
import { getProject, getEvaluation, getHistoricalScores } from '@/lib/genlayer';
import { EvidenceLockPanel } from '@/components/EvidenceLockPanel';
import { EvaluationPanel } from '@/components/EvaluationPanel';
import { HistoricalChart } from '@/components/HistoricalChart';
import { GenLayerProofPanel } from '@/components/GenLayerProofPanel';
import { TierBadge } from '@/components/TierBadge';
import {
  TechnicalScoreCard, TeamScoreCard, MarketFitCard,
  SecurityScoreCard, ExecutionScoreCard, TokenUtilityCard,
} from '@/components/ScoreCard';
import { formatDate, formatScore, getScoreHex } from '@/utils';
import type { GenLayerProof, GenLayerProofStep } from '@/types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ projectId: string }>; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  try {
    const project = await getProject(projectId);
    return {
      title: project ? `${project.name} — AlphaRank` : 'Project — AlphaRank',
      description: project?.description ?? 'GenLayer-evaluated crypto project.',
    };
  } catch {
    return { title: 'Project — AlphaRank' };
  }
}

function buildProof(
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>,
  evaluation: Awaited<ReturnType<typeof getEvaluation>>
): GenLayerProof {
  const isEvaluating = ['evaluating', 'ranked', 'reevaluation_pending'].includes(project.status);
  const isRanked     = ['ranked', 'reevaluation_pending'].includes(project.status);
  // Evaluation Finalized = run_evaluation succeeded = get_evaluation is not "{}"
  const evalFinalized = !!evaluation && !!evaluation.evaluation_id;
  // Ranking Updated = get_ranking is not "{}" or project is ranked
  const rankUpdated  = isRanked && evalFinalized;

  const steps: GenLayerProofStep[] = [
    { label: 'Project Submitted',    status: 'complete',                                          timestamp: project.created_at,      method: 'create_project' },
    { label: 'Evidence Locked',      status: project.evidence_hash ? 'complete' : 'pending',      timestamp: project.locked_at,        method: 'lock_project_data' },
    { label: 'Evaluation Started',   status: isEvaluating ? 'complete' : 'pending',                                                    method: 'submit_evaluation' },
    { label: 'Evaluation Finalized', status: evalFinalized ? 'complete' : 'pending',              timestamp: evaluation?.evaluated_at,  method: 'run_evaluation' },
    { label: 'Ranking Updated',      status: rankUpdated   ? 'complete' : 'pending',                                                    method: 'run_evaluation' },
  ];
  return {
    project_id: project.project_id,
    contract_address: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || '0x36De06c17912d1e2DEDc90CaFEC48A811820B647',
    evidence_hash: project.evidence_hash,
    evaluation_hash: evaluation?.evaluation_hash,
    steps,
  };
}

const PANEL = {
  background: '#0e0a1a',
  border: '1px solid rgba(230,190,247,0.08)',
  borderRadius: '14px',
  padding: '20px',
};

const LINK_STYLE = { color: '#e6bef7' };

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;

  let project;
  try { project = await getProject(projectId); } catch { project = null; }
  if (!project) notFound();

  const [evaluation, history] = await Promise.all([
    getEvaluation(projectId).catch(() => null),
    getHistoricalScores(projectId).catch(() => []),
  ]);

  const proof = buildProof(project, evaluation);
  const statusColor =
    project.status === 'ranked'            ? '#4ade80' :
    project.status === 'evaluating'        ? '#fbbf24' :
    project.status === 'evaluation_locked' ? '#e6bef7' : '#6b5490';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-black" style={{ color: '#f5eeff' }}>{project.name}</h1>
            {evaluation && <TierBadge tier={evaluation.tier} size="lg" />}
            {evaluation && (
              <span className="text-2xl font-black font-mono"
                style={{ color: getScoreHex(evaluation.overall_score), textShadow: `0 0 16px ${getScoreHex(evaluation.overall_score)}44` }}>
                {formatScore(evaluation.overall_score)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color: '#9b86b8' }}>
            <span className="uppercase tracking-widest text-[10px] border rounded px-2 py-0.5 font-medium"
              style={{ borderColor: 'rgba(230,190,247,0.15)', color: '#9b86b8' }}>
              {project.category}
            </span>
            {project.website && (
              <a href={project.website} target="_blank" rel="noopener noreferrer"
                className="hover:underline text-sm" style={LINK_STYLE}>
                {project.website}
              </a>
            )}
            <span>Submitted {formatDate(project.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs" style={{ color: statusColor }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
          <span className="capitalize">{project.status.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main column ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* About */}
          <div style={PANEL}>
            <h2 className="font-semibold text-sm mb-3" style={{ color: '#f5eeff' }}>About</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#9b86b8' }}>{project.description}</p>
          </div>

          {/* Score breakdown cards — only shown when evaluated */}
          {evaluation && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b5490' }}>
                Score Breakdown · Powered by GenLayer AI
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TechnicalScoreCard score={evaluation.technical_score} />
                <TeamScoreCard      score={evaluation.team_score} />
                <MarketFitCard      score={evaluation.market_fit_score} />
                <SecurityScoreCard  score={evaluation.security_score} />
                <ExecutionScoreCard score={evaluation.execution_score} />
                <TokenUtilityCard   score={evaluation.token_utility_score} />
              </div>
            </div>
          )}

          {/* Evaluation action panel */}
          <EvaluationPanel project={project} evaluation={evaluation} />

          {/* Score history */}
          {history.length > 0 && (
            <div style={PANEL}>
              <h2 className="font-semibold text-sm mb-4" style={{ color: '#f5eeff' }}>Score History</h2>
              <HistoricalChart history={history} />
            </div>
          )}

          {/* Technical Evidence */}
          {(project.whitepaper_url || project.docs_url || project.github_repos?.length > 0) && (
            <div style={PANEL} className="space-y-4">
              <h2 className="font-semibold text-sm" style={{ color: '#f5eeff' }}>Technical Evidence</h2>

              {project.whitepaper_url && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#6b5490' }}>Whitepaper</span>
                  <a href={project.whitepaper_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm hover:underline break-all" style={LINK_STYLE}>
                    {project.whitepaper_url}
                  </a>
                </div>
              )}

              {project.docs_url && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#6b5490' }}>Documentation</span>
                  <a href={project.docs_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm hover:underline break-all" style={LINK_STYLE}>
                    {project.docs_url}
                  </a>
                </div>
              )}

              {project.github_repos?.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: '#6b5490' }}>GitHub Repositories</span>
                  <div className="space-y-1">
                    {project.github_repos.map((repo, i) => (
                      <a key={i} href={repo} target="_blank" rel="noopener noreferrer"
                        className="block text-sm hover:underline font-mono" style={LINK_STYLE}>
                        {repo}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security */}
          {(project.audits?.length > 0 || project.bug_bounty_url) && (
            <div style={PANEL} className="space-y-3">
              <h2 className="font-semibold text-sm" style={{ color: '#f5eeff' }}>Security</h2>

              {project.audits?.map((audit, i) => (
                <div key={i}
                  className="flex items-center justify-between py-2 text-sm"
                  style={{ borderBottom: '1px solid rgba(230,190,247,0.05)' }}>
                  <div>
                    <span className="font-medium" style={{ color: '#ddd0f0' }}>{audit.auditor}</span>
                    <span className="ml-3 text-xs" style={{ color: '#6b5490' }}>{formatDate(audit.date)}</span>
                  </div>
                  <a href={audit.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded hover:underline"
                    style={{ background: 'rgba(74,222,128,0.07)', color: '#4ade80' }}>
                    Report ↗
                  </a>
                </div>
              ))}

              {project.bug_bounty_url && (
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: '#9b86b8' }}>Bug Bounty</span>
                  <a href={project.bug_bounty_url} target="_blank" rel="noopener noreferrer"
                    className="hover:underline text-xs" style={LINK_STYLE}>
                    {project.bug_bounty_url}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Roadmap */}
          {project.roadmap && (
            <div style={PANEL}>
              <h2 className="font-semibold text-sm mb-3" style={{ color: '#f5eeff' }}>Roadmap</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#9b86b8' }}>
                {project.roadmap}
              </p>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <div className="space-y-4">

          <EvidenceLockPanel project={project} />
          <GenLayerProofPanel proof={proof} />

          {/* Tokenomics */}
          {project.tokenomics && Object.values(project.tokenomics).some(Boolean) && (
            <div style={PANEL} className="space-y-2.5">
              <h3 className="font-semibold text-sm mb-1" style={{ color: '#f5eeff' }}>Tokenomics</h3>
              {project.tokenomics.token_symbol && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6b5490' }}>Symbol</span>
                  <span className="font-mono font-bold" style={{ color: '#e6bef7' }}>{project.tokenomics.token_symbol}</span>
                </div>
              )}
              {project.tokenomics.supply && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#6b5490' }}>Supply</span>
                  <span style={{ color: '#ddd0f0' }}>{project.tokenomics.supply}</span>
                </div>
              )}
              {project.tokenomics.utility && (
                <div className="text-sm">
                  <span className="block mb-1" style={{ color: '#6b5490' }}>Utility</span>
                  <span style={{ color: '#9b86b8' }}>{project.tokenomics.utility}</span>
                </div>
              )}
              {project.tokenomics.emissions && (
                <div className="text-sm">
                  <span className="block mb-1" style={{ color: '#6b5490' }}>Emissions</span>
                  <span style={{ color: '#9b86b8' }}>{project.tokenomics.emissions}</span>
                </div>
              )}
            </div>
          )}

          {/* Team */}
          {project.team?.length > 0 && (
            <div style={PANEL}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#f5eeff' }}>Team</h3>
              <div className="space-y-3">
                {project.team.map((member, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#ddd0f0' }}>{member.name}</div>
                      <div className="text-xs" style={{ color: '#6b5490' }}>{member.role}</div>
                    </div>
                    {member.linkedin && (
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:underline" style={LINK_STYLE}>LinkedIn</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investors & Partnerships */}
          {((project.investors ?? []).length > 0 || (project.partnerships ?? []).length > 0) && (
            <div style={PANEL} className="space-y-3">
              {(project.investors ?? []).length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: '#6b5490' }}>Investors</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(project.investors ?? []).map((inv, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(230,190,247,0.07)', border: '1px solid rgba(230,190,247,0.12)', color: '#c084fc' }}>
                        {inv}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(project.partnerships ?? []).length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: '#6b5490' }}>Partnerships</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(project.partnerships ?? []).map((p, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence hash */}
          {project.evidence_hash && (
            <div style={PANEL}>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#f5eeff' }}>
                <span>🔒</span> Evidence Hash
              </h3>
              <code className="text-[11px] font-mono break-all block leading-relaxed" style={{ color: '#4ade80' }}>
                {project.evidence_hash}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
