'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ProjectComparison } from '@/components/ProjectComparison';
import type { Project, Evaluation, LeaderboardEntry } from '@/types';

async function fetchProjectAndEval(id: string) {
  try {
    const [pRes, eRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/evaluate?project_id=${id}`),
    ]);
    if (!pRes.ok) return null;
    const project: Project = await pRes.json();
    const evaluation: Evaluation | null = eRes.ok ? await eRes.json() : null;
    return { project, evaluation: evaluation?.evaluation_id ? evaluation : null };
  } catch { return null; }
}

function ProjectSearchInput({
  label,
  value,
  onSelect,
  allProjects,
}: {
  label: string;
  value: string;
  onSelect: (id: string, name: string) => void;
  allProjects: LeaderboardEntry[];
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = allProjects.filter(
    (p) =>
      p.project_name.toLowerCase().includes(query.toLowerCase()) ||
      p.project_id.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9b86b8' }}>
        {label}
      </label>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search project name or paste ID…"
        className="w-full px-3 py-2.5 rounded-lg text-sm"
        style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.12)', color: 'var(--foreground)', outline: 'none' }}
      />
      {open && results.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#160f29', border: '1px solid rgba(230,190,247,0.14)' }}
        >
          {results.map((p) => (
            <button
              key={p.project_id}
              onClick={() => { onSelect(p.project_id, p.project_name); setQuery(p.project_name); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left"
              style={{ borderBottom: '1px solid rgba(230,190,247,0.05)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(230,190,247,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>{p.project_name}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: '#6b5490' }}>{p.project_id}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono" style={{ color: '#e6bef7' }}>{p.overall_score}</span>
                <span className="text-xs font-bold font-mono" style={{ color: '#9b86b8' }}>{p.tier}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [allProjects, setAllProjects] = useState<LeaderboardEntry[]>([]);
  const [dataA, setDataA] = useState<{ project: Project; evaluation: Evaluation | null } | null>(null);
  const [dataB, setDataB] = useState<{ project: Project; evaluation: Evaluation | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rankings').then((r) => r.json()).then((d) => setAllProjects(d.entries ?? []));
  }, []);

  const handleCompare = useCallback(async () => {
    if (!idA || !idB) { setError('Select or enter both projects'); return; }
    setLoading(true); setError('');
    const [a, b] = await Promise.all([fetchProjectAndEval(idA), fetchProjectAndEval(idB)]);
    if (!a) { setError('Project A not found'); setLoading(false); return; }
    if (!b) { setError('Project B not found'); setLoading(false); return; }
    setDataA(a); setDataB(b);
    setLoading(false);
  }, [idA, idB]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--foreground)' }}>Compare Projects</h1>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          Side-by-side GenLayer evaluation scores.
        </p>
      </div>

      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <ProjectSearchInput
            label="Project A"
            value={idA}
            onSelect={(id) => setIdA(id)}
            allProjects={allProjects}
          />
          <ProjectSearchInput
            label="Project B"
            value={idB}
            onSelect={(id) => setIdB(id)}
            allProjects={allProjects}
          />
        </div>

        {error && <p className="text-sm mb-3" style={{ color: '#f87171' }}>{error}</p>}

        <button
          onClick={handleCompare}
          disabled={loading || !idA || !idB}
          className="font-semibold px-6 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: '#fff',
            boxShadow: loading ? 'none' : '0 0 14px rgba(168,85,247,0.3)',
          }}
        >
          {loading ? 'Loading…' : 'Compare →'}
        </button>
      </div>

      {dataA && dataB && (
        <div
          className="rounded-xl p-6"
          style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
        >
          <ProjectComparison
            projectA={dataA.project}
            projectB={dataB.project}
            evalA={dataA.evaluation}
            evalB={dataB.evaluation}
          />
        </div>
      )}
    </div>
  );
}
