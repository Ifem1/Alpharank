'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { TierBadge } from '@/components/TierBadge';
import { WalletGate } from '@/components/WalletGate';
import { cn, formatDate, getScoreColor, formatScore } from '@/utils';
import { getLocalProjectsByOwner, clearLocalProjects } from '@/lib/local-projects';
import type { Evaluation, Profile } from '@/types';
import type { RankTier } from '@/types';

interface ProjectRow {
  project_id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
  owner: string;
  evaluation: Evaluation | null;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!address || !mounted) return;
    setLoading(true);

    // ── 1. Load from localStorage immediately (fast, works offline) ──
    const local = getLocalProjectsByOwner(address);
    if (local.length > 0) {
      const rows: ProjectRow[] = local.map((p) => ({
        ...p,
        evaluation: null,
      }));
      setProjects(rows);
    }

    // ── 2. Try Supabase + GenLayer profile in background ──
    Promise.all([
      fetch(`/api/profile/${address}`).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/projects?owner=${address}`).then((r) => r.json()).catch(() => ({ projects: [] })),
    ]).then(([profileData, projectsData]) => {
      if (profileData?.wallet_address) setProfile(profileData);

      const supabaseProjects: ProjectRow[] = (projectsData?.projects ?? []).map(
        (p: { project: ProjectRow; evaluation: Evaluation | null }) => ({
          ...p.project,
          evaluation: p.evaluation,
        })
      );

      if (supabaseProjects.length > 0) {
        // Supabase has data — use it (more up-to-date than localStorage)
        setProjects(supabaseProjects);
      } else if (local.length === 0) {
        // Nothing in either — truly empty
        setProjects([]);
      }
      // If Supabase empty but local has data, keep localStorage data
    }).finally(() => setLoading(false));
  }, [address, mounted]);

  if (!mounted) return null;
  if (!isConnected) return <WalletGate message="Connect your wallet to access your dashboard." />;

  const totalProjects = profile?.total_projects ?? projects.length;
  const totalEvals    = profile?.total_evaluations ?? 0;
  const avgScore      = profile?.average_score ?? 0;
  const bestScore     = profile?.best_score ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
        <Link
          href="/submit"
          className="font-semibold px-5 py-2.5 rounded-lg text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: '#fff',
            boxShadow: '0 0 14px rgba(168,85,247,0.3)',
          }}
        >
          + Submit Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects',  value: totalProjects },
          { label: 'Evaluations',     value: totalEvals },
          { label: 'Avg Score',       value: formatScore(avgScore) },
          { label: 'Best Score',      value: formatScore(bestScore) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5 text-center"
            style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}>
            <div className="text-2xl font-black font-mono mb-1" style={{ color: '#e6bef7' }}>{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: '#6b5490' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(230,190,247,0.07)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Your Projects</h2>
          <div className="flex items-center gap-3">
            {projects.length > 0 && (
              <button
                onClick={() => { clearLocalProjects(); setProjects([]); }}
                className="text-xs transition-colors px-2 py-1 rounded"
                title="Clear locally cached projects from old contracts"
                style={{ color: '#6b5490', border: '1px solid rgba(107,84,144,0.2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b5490'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(107,84,144,0.2)'; }}
              >
                Clear cache
              </button>
            )}
            {address && (
              <Link href={`/profile/${address}`} className="text-xs transition-colors"
                style={{ color: '#9b86b8' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e6bef7')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9b86b8')}>
                View public profile →
              </Link>
            )}
          </div>
        </div>

        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-3" style={{ color: '#6b5490' }}>
            <span className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(230,190,247,0.2)', borderTopColor: '#e6bef7' }} />
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm mb-2" style={{ color: '#6b5490' }}>No projects submitted yet.</p>
            {totalProjects > 0 && (
              <p className="text-xs mb-4" style={{ color: '#9b86b8' }}>
                GenLayer shows {totalProjects} project(s) on-chain.{' '}
                <Link href="/submit/lookup" style={{ color: '#e6bef7' }}>
                  Look up by project ID →
                </Link>
              </p>
            )}
            <Link href="/submit" className="text-sm" style={{ color: '#e6bef7' }}>
              Submit your first project →
            </Link>
          </div>
        ) : (
          <div>
            {projects.map((row) => (
              <div
                key={row.project_id}
                className="px-6 py-4 flex items-center justify-between gap-4"
                style={{ borderBottom: '1px solid rgba(230,190,247,0.04)' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(230,190,247,0.02)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/project/${row.project_id}`}
                      className="font-medium text-sm transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#e6bef7')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#f5eeff')}
                    >
                      {row.name}
                    </Link>
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background:
                          row.status === 'ranked'             ? '#4ade80' :
                          row.status === 'evaluating'         ? '#fbbf24' :
                          row.status === 'evaluation_locked'  ? '#e6bef7' : '#6b5490',
                      }}
                    />
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6b5490' }}>
                    {row.category} · {formatDate(row.created_at)}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: '#3d2a6b' }}>
                    {row.project_id}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {row.evaluation ? (
                    <>
                      <span className={cn('font-mono font-bold text-sm', getScoreColor(row.evaluation.overall_score))}>
                        {formatScore(row.evaluation.overall_score)}
                      </span>
                      <TierBadge tier={row.evaluation.tier as RankTier} size="sm" />
                    </>
                  ) : (
                    <span className="text-xs capitalize" style={{ color: '#6b5490' }}>
                      {row.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  <Link
                    href={`/dashboard/project?id=${row.project_id}`}
                    className="text-xs px-3 py-1 rounded-md transition-all"
                    style={{
                      background: 'rgba(230,190,247,0.07)',
                      border: '1px solid rgba(230,190,247,0.13)',
                      color: '#e6bef7',
                    }}
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick project lookup */}
      <ProjectLookup />
    </div>
  );
}

function ProjectLookup() {
  const [id, setId] = useState('');
  return (
    <div className="mt-6 rounded-xl p-5"
      style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.06)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b5490' }}>
        Look up a project by ID
      </h3>
      <div className="flex gap-2">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Paste project ID (32-char hex)…"
          className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
          style={{
            background: '#160f29',
            border: '1px solid rgba(230,190,247,0.1)',
            color: 'var(--foreground)',
            outline: 'none',
          }}
        />
        <Link
          href={id.trim() ? `/project/${id.trim()}` : '#'}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: id.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(168,85,247,0.2)',
            color: '#fff',
            pointerEvents: id.trim() ? 'auto' : 'none',
          }}
        >
          View →
        </Link>
      </div>
      <p className="text-[11px] mt-2" style={{ color: '#3d2a6b' }}>
        If you submitted a project but it's not listed above, paste its ID here to view it directly.
      </p>
    </div>
  );
}
