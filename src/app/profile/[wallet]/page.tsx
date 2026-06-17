import type { Metadata } from 'next';
import { getProfile } from '@/lib/genlayer';
import { getServiceClient } from '@/lib/supabase';
import { formatAddress, formatDate, formatScore, getScoreColor, getScoreHex, cn } from '@/utils';
import { TierBadge } from '@/components/TierBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { RankTier } from '@/types';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ wallet: string }>; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  return {
    title: `${formatAddress(wallet)} — AlphaRank Profile`,
    description: `View on-chain reputation and project history for wallet ${formatAddress(wallet)}`,
  };
}

async function getWalletProjects(wallet: string) {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('projects')
      .select('project_id, name, category, status, created_at')
      .eq('owner', wallet)
      .order('created_at', { ascending: false });

    const withEvals = await Promise.all(
      (data ?? []).map(async (p) => {
        try {
          const e = await (await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/evaluate?project_id=${p.project_id}`
          )).json();
          return { ...p, evaluation: e?.evaluation_id ? e : null };
        } catch { return { ...p, evaluation: null }; }
      })
    );
    return withEvals;
  } catch { return []; }
}

export default async function ProfilePage({ params }: Props) {
  const { wallet } = await params;
  let profile;
  try { profile = await getProfile(wallet); } catch { profile = null; }
  if (!profile) notFound();

  const projects = await getWalletProjects(wallet);

  const METRICS = [
    { label: 'Credibility',  value: profile.credibility_score,  desc: 'Based on evaluation history' },
    { label: 'Consistency',  value: profile.consistency_score,  desc: 'Variance across evaluations' },
    { label: 'Security Avg', value: profile.security_rating,    desc: 'Average security score' },
    { label: 'Execution Avg',value: profile.execution_rating,   desc: 'Average execution score' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div
        className="rounded-2xl p-8 mb-6"
        style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.10)' }}
      >
        <div className="flex items-center gap-5 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#e6bef7)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(230,190,247,0.2)',
            }}
          >
            {wallet.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black font-mono mb-1" style={{ color: 'var(--foreground)' }}>
              {formatAddress(wallet)}
            </h1>
            <p className="text-sm" style={{ color: '#6b5490' }}>
              Member since {formatDate(profile.created_at)}
            </p>
            <code className="text-[11px] font-mono" style={{ color: '#3d2a6b' }}>{wallet}</code>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Projects',     value: profile.total_projects },
            { label: 'Evaluations',  value: profile.total_evaluations },
            { label: 'Avg Score',    value: formatScore(profile.average_score) },
            { label: 'Best Score',   value: formatScore(profile.best_score) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(230,190,247,0.04)', border: '1px solid rgba(230,190,247,0.07)' }}
            >
              <div className="text-2xl font-black font-mono mb-0.5" style={{ color: '#e6bef7' }}>
                {stat.value}
              </div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: '#6b5490' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reputation metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-5"
            style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: '#ddd0f0' }}>{m.label}</span>
              <span className="font-mono font-bold text-sm" style={{ color: getScoreHex(m.value) }}>
                {formatScore(m.value)}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-2"
              style={{ background: 'rgba(230,190,247,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${m.value}%`, background: `linear-gradient(90deg, ${getScoreHex(m.value)}55, ${getScoreHex(m.value)})` }}
              />
            </div>
            <p className="text-[11px]" style={{ color: '#6b5490' }}>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(230,190,247,0.06)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Projects</h2>
        </div>
        {projects.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: '#6b5490' }}>
            No projects submitted.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(230,190,247,0.04)' }}>
            {projects.map((p: { project_id: string; name: string; category: string; status: string; created_at: string; evaluation: { overall_score: number; tier: RankTier } | null }) => (
              <Link
                key={p.project_id}
                href={`/project/${p.project_id}`}
                className="flex items-center justify-between px-6 py-4 transition-all"
                style={{ display: 'flex' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(230,190,247,0.03)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6b5490' }}>
                    {p.category} · {formatDate(p.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {p.evaluation ? (
                    <>
                      <span className={cn('font-mono font-bold text-sm', getScoreColor(p.evaluation.overall_score))}>
                        {formatScore(p.evaluation.overall_score)}
                      </span>
                      <TierBadge tier={p.evaluation.tier} size="sm" />
                    </>
                  ) : (
                    <span className="text-xs capitalize" style={{ color: '#6b5490' }}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span style={{ color: '#3d2a6b' }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
