'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { RANK_TIERS, CATEGORIES, TIER_HEX } from '@/constants';
import type { LeaderboardEntry } from '@/types';

interface Analytics {
  total_projects: number;
  total_evaluations: number;
  average_score: number;
  ranked_projects: number;
  tier_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then((r) => r.json()),
      fetch('/api/rankings').then((r) => r.json()),
    ])
      .then(([analytics, rankings]) => {
        setData(analytics);
        setEntries(rankings.entries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tierChartData = RANK_TIERS.map((t) => ({
    tier: t.tier,
    count: data?.tier_distribution?.[t.tier] ?? 0,
    fill: TIER_HEX[t.tier],
  }));

  const catChartData = CATEGORIES.map((c) => ({
    cat: c,
    count: data?.category_distribution?.[c] ?? 0,
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--foreground)' }}>Analytics</h1>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          Platform statistics derived from GenLayer on-chain state.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects',    value: loading ? '—' : data?.total_projects ?? 0 },
          { label: 'Total Evaluations', value: loading ? '—' : data?.total_evaluations ?? 0 },
          { label: 'Ranked Projects',   value: loading ? '—' : data?.ranked_projects ?? 0 },
          { label: 'Platform Avg',      value: loading ? '—' : (data?.average_score ?? 0).toFixed(1) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5 text-center"
            style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
          >
            <div
              className="text-3xl font-black font-mono mb-1"
              style={{ color: '#e6bef7', textShadow: '0 0 12px rgba(230,190,247,0.3)' }}
            >
              {s.value}
            </div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: '#6b5490' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tier distribution chart */}
        <div
          className="rounded-xl p-6"
          style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
        >
          <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--foreground)' }}>Tier Distribution</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(230,190,247,0.05)" vertical={false} />
                <XAxis dataKey="tier" tick={{ fill: '#6b5490', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b5490', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.14)', borderRadius: '8px', color: 'var(--foreground)', fontSize: 12 }}
                  cursor={{ fill: 'rgba(230,190,247,0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tierChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {RANK_TIERS.map((t) => (
              <div key={t.tier} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: TIER_HEX[t.tier] }} />
                <span className="text-[11px] font-mono" style={{ color: '#9b86b8' }}>
                  {t.tier} <span style={{ color: '#6b5490' }}>({data?.tier_distribution?.[t.tier] ?? 0})</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category distribution */}
        <div
          className="rounded-xl p-6"
          style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
        >
          <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--foreground)' }}>Category Breakdown</h2>
          <div className="space-y-3">
            {catChartData.length === 0 ? (
              <p className="text-sm" style={{ color: '#6b5490' }}>No data yet.</p>
            ) : catChartData.map((d) => {
              const total = catChartData.reduce((a, b) => a + b.count, 0);
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.cat}>
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span style={{ color: '#ddd0f0' }}>{d.cat}</span>
                    <span style={{ color: '#6b5490' }}>{d.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(230,190,247,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg,#7c3aed,#e6bef7)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 10 table */}
      {entries.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
        >
          <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--foreground)' }}>Top Ranked Projects</h2>
          <LeaderboardTable entries={entries.slice(0, 10)} />
        </div>
      )}
    </div>
  );
}
