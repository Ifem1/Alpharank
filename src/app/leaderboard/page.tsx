'use client';

import { useState, useEffect } from 'react';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import type { LeaderboardEntry } from '@/types';

const CATEGORIES = ['Overall','DeFi','AI','Infrastructure','Gaming','RWA','DePIN','Consumer'];

export default function LeaderboardPage() {
  const [category, setCategory] = useState('Overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?category=${category.toLowerCase()}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--foreground)' }}>Leaderboard</h1>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          Category rankings sourced from GenLayer on-chain state.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              category === c
                ? {
                    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: '#fff',
                    boxShadow: '0 0 12px rgba(168,85,247,0.3)',
                  }
                : {
                    background: 'rgba(230,190,247,0.05)',
                    border: '1px solid rgba(230,190,247,0.1)',
                    color: '#9b86b8',
                  }
            }
          >
            {c}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#6b5490' }}>
            <span
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'rgba(230,190,247,0.2)', borderTopColor: '#e6bef7' }}
            />
            Loading {category} leaderboard…
          </div>
        ) : (
          <LeaderboardTable entries={entries} />
        )}
      </div>
    </div>
  );
}
