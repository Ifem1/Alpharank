'use client';

import { useState, useEffect, useMemo } from 'react';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { ProjectBoard } from '@/components/ProjectBoard';
import { CATEGORIES } from '@/constants';
import type { LeaderboardEntry } from '@/types';

export default function RankingsPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [view, setView] = useState<'table' | 'board'>('table');

  useEffect(() => {
    fetch('/api/rankings')
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (category !== 'All') list = list.filter((e) => e.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.project_name.toLowerCase().includes(q));
    }
    return list;
  }, [entries, category, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--foreground)' }}>Global Rankings</h1>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          Derived from GenLayer Intelligent Contract state · Scores are immutable once finalized.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6b5490' }}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm"
            style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.12)', color: '#f5eeff', outline: 'none' }}
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={category === c
                ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' }
                : { background: 'rgba(230,190,247,0.05)', border: '1px solid rgba(230,190,247,0.1)', color: '#9b86b8' }
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div
          className="flex rounded-lg overflow-hidden ml-auto"
          style={{ border: '1px solid rgba(230,190,247,0.1)' }}
        >
          {(['table', 'board'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-2 text-xs font-medium transition-all capitalize"
              style={view === v
                ? { background: 'rgba(230,190,247,0.12)', color: '#e6bef7' }
                : { background: 'transparent', color: '#6b5490' }
              }
            >
              {v === 'table' ? '≡ Table' : '⊞ Board'}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs mb-4" style={{ color: '#6b5490' }}>
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          {search || category !== 'All' ? ' matching filters' : ' ranked'}
        </p>
      )}

      {/* Content */}
      <div className="rounded-2xl p-6" style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#6b5490' }}>
            <span className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(230,190,247,0.2)', borderTopColor: '#e6bef7' }} />
            Loading rankings from GenLayer…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg mb-2" style={{ color: '#6b5490' }}>No projects found.</p>
            {(search || category !== 'All') && (
              <button onClick={() => { setSearch(''); setCategory('All'); }}
                className="text-sm" style={{ color: '#e6bef7' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : view === 'table' ? (
          <LeaderboardTable entries={filtered} />
        ) : (
          <ProjectBoard entries={filtered} columns={3} />
        )}
      </div>
    </div>
  );
}
