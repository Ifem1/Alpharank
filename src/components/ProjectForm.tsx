'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils';
import { CATEGORIES } from '@/constants';
import { contractCreateProject } from '@/lib/genlayer-write';
import { saveProjectLocally } from '@/lib/local-projects';
import type { ProjectCategory } from '@/types';

interface ProjectFormData {
  name: string; category: ProjectCategory; website: string; description: string;
  whitepaper_url: string; docs_url: string; github_repos: string; roadmap: string;
  investors: string; partnerships: string;
  token_utility: string; token_emissions: string; token_supply: string; token_symbol: string;
  audit_auditor: string; audit_url: string; audit_date: string; bug_bounty_url: string;
  team_name: string; team_role: string; team_linkedin: string; ecosystem_integrations: string;
}

const INITIAL: ProjectFormData = {
  name: '', category: 'DeFi', website: '', description: '',
  whitepaper_url: '', docs_url: '', github_repos: '', roadmap: '',
  investors: '', partnerships: '',
  token_utility: '', token_emissions: '', token_supply: '', token_symbol: '',
  audit_auditor: '', audit_url: '', audit_date: '', bug_bounty_url: '',
  team_name: '', team_role: '', team_linkedin: '', ecosystem_integrations: '',
};

const INPUT_STYLE = {
  background: '#0e0a1a',
  border: '1px solid rgba(230,190,247,0.12)',
  borderRadius: '8px',
  color: '#f5eeff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s',
} as const;

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#9b86b8' }}>
        {label} {required && <span style={{ color: '#f87171' }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: '#6b5490' }}>{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 placeholder-[#3d2a6b]';

interface ProjectFormProps { uploadedFileNames?: string[]; }

export function ProjectForm({ uploadedFileNames = [] }: ProjectFormProps) {
  void uploadedFileNames;
  // ── ALL hooks at top — no conditional returns before this block ──
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [form, setForm]         = useState<ProjectFormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep]         = useState('');
  const [error, setError]       = useState('');
  // mounted guard: only affects RENDER OUTPUT, never skips hooks
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const set = (field: keyof ProjectFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Derived values ────────────────────────────────────────────────
  // These are only used in the submit handler (after mount) — safe
  const canSubmit = mounted && isConnected && !!address;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) { setError('Connect your wallet first'); return; }
    if (!form.name.trim())        { setError('Project name is required'); return; }
    if (!form.website.trim())     { setError('Website is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }
    if (!form.roadmap.trim())     { setError('Roadmap is required'); return; }

    setSubmitting(true);
    setError('');
    setStep('');

    try {
      setStep('Sending to GenLayer — approve in your wallet…');

      const project_id = await contractCreateProject(address!, {
        name:        form.name.trim(),
        category:    form.category,
        website:     form.website.trim(),
        description: form.description.trim(),
        whitepaper_url: form.whitepaper_url.trim(),
        docs_url:    form.docs_url.trim(),
        github_repos: form.github_repos.split('\n').map((r) => r.trim()).filter(Boolean),
        roadmap:     form.roadmap.trim(),
        tokenomics: {
          utility:      form.token_utility.trim(),
          emissions:    form.token_emissions.trim(),
          supply:       form.token_supply.trim(),
          token_symbol: form.token_symbol.trim(),
        },
        audits: form.audit_auditor.trim()
          ? [{ auditor: form.audit_auditor.trim(), url: form.audit_url.trim(), date: form.audit_date }]
          : [],
        team: form.team_name.trim()
          ? [{ name: form.team_name.trim(), role: form.team_role.trim(), linkedin: form.team_linkedin.trim() }]
          : [],
        investors:    form.investors.split(',').map((s) => s.trim()).filter(Boolean),
        partnerships: form.partnerships.split(',').map((s) => s.trim()).filter(Boolean),
        bug_bounty_url: form.bug_bounty_url.trim(),
        ecosystem_integrations: form.ecosystem_integrations.split(',').map((s) => s.trim()).filter(Boolean),
      });

      // ── Save to localStorage immediately (works even without Supabase) ──
      saveProjectLocally({
        project_id,
        name: form.name,
        category: form.category,
        website: form.website,
        description: form.description,
        owner: address!,
        status: 'draft',
        created_at: new Date().toISOString(),
      });

      // Sync to Supabase cache (non-blocking, fails silently if tables missing)
      setStep('Syncing to index…');
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id, owner: address,
          name: form.name, category: form.category,
          website: form.website, description: form.description,
        }),
      }).catch(() => {});

      // project_id is the actual contract-returned ID, not the tx hash
      if (project_id && !project_id.startsWith('0x')) {
        router.push(`/project/${project_id}`);
      } else {
        // Shouldn't happen, but fallback to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Try again.');
      setStep('');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Stable label & style (based on mounted state only — no flash) ──
  const btnLabel = !mounted
    ? '⬡ Submit Project'                          // same on server + first paint
    : submitting
      ? (step || '⬡ Submitting to GenLayer…')
      : !isConnected
        ? 'Connect wallet to submit'
        : '⬡ Submit Project';

  const btnDisabled = submitting || !mounted || !isConnected;

  const btnStyle = {
    background: btnDisabled
      ? 'rgba(168,85,247,0.3)'
      : 'linear-gradient(135deg,#7c3aed,#a855f7,#c084fc)',
    color: '#fff',
    boxShadow: btnDisabled ? 'none' : '0 0 24px rgba(168,85,247,0.35)',
  };

  // ── Section styles (pure constants — identical on server and client) ──
  const sectionStyle = {
    background: '#0e0a1a',
    border: '1px solid rgba(230,190,247,0.08)',
    borderRadius: '14px',
    padding: '24px',
  };
  const sectionHead = {
    fontSize: '15px', fontWeight: 700, color: '#f5eeff',
    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Basic Info ─────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionHead}><span style={{ color: '#e6bef7' }}>◈</span> Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project Name" required>
            <input className={inputCls} style={INPUT_STYLE} value={form.name}
              onChange={set('name')} placeholder="Protocol Name" required />
          </Field>
          <Field label="Category" required>
            <select className={inputCls} style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: '#0e0a1a' }}>{c}</option>)}
            </select>
          </Field>
          <Field label="Website" required>
            <input className={inputCls} style={INPUT_STYLE} value={form.website}
              onChange={set('website')} placeholder="https://" required />
          </Field>
          <Field label="Description" required>
            <textarea className={cn(inputCls, 'resize-none h-20')} style={INPUT_STYLE}
              value={form.description} onChange={set('description')}
              placeholder="What problem does this solve?" required />
          </Field>
        </div>
      </section>

      {/* ── Technical ──────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionHead}><span style={{ color: '#e6bef7' }}>⬡</span> Technical Evidence</h2>
        <div className="space-y-4">
          <Field label="Whitepaper URL">
            <input className={inputCls} style={INPUT_STYLE} value={form.whitepaper_url}
              onChange={set('whitepaper_url')} placeholder="https://..." />
          </Field>
          <Field label="Documentation URL">
            <input className={inputCls} style={INPUT_STYLE} value={form.docs_url}
              onChange={set('docs_url')} placeholder="https://docs..." />
          </Field>
          <Field label="GitHub Repositories" hint="One URL per line">
            <textarea className={cn(inputCls, 'resize-none h-24 font-mono text-xs')}
              style={INPUT_STYLE} value={form.github_repos} onChange={set('github_repos')}
              placeholder="https://github.com/org/repo" />
          </Field>
        </div>
      </section>

      {/* ── Business ───────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionHead}><span style={{ color: '#e6bef7' }}>▷</span> Business & Roadmap</h2>
        <div className="space-y-4">
          <Field label="Roadmap" required>
            <textarea className={cn(inputCls, 'resize-none h-28')} style={INPUT_STYLE}
              value={form.roadmap} onChange={set('roadmap')}
              placeholder="Describe your roadmap and milestones..." required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Investors" hint="Comma separated">
              <input className={inputCls} style={INPUT_STYLE} value={form.investors}
                onChange={set('investors')} placeholder="a16z, Paradigm, etc." />
            </Field>
            <Field label="Partnerships" hint="Comma separated">
              <input className={inputCls} style={INPUT_STYLE} value={form.partnerships}
                onChange={set('partnerships')} placeholder="Chainlink, Uniswap, etc." />
            </Field>
          </div>
          <Field label="Ecosystem Integrations" hint="Comma separated">
            <input className={inputCls} style={INPUT_STYLE} value={form.ecosystem_integrations}
              onChange={set('ecosystem_integrations')} placeholder="Ethereum, Arbitrum, etc." />
          </Field>
        </div>
      </section>

      {/* ── Tokenomics ─────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionHead}><span style={{ color: '#e6bef7' }}>◉</span> Tokenomics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Token Symbol">
            <input className={inputCls} style={INPUT_STYLE} value={form.token_symbol}
              onChange={set('token_symbol')} placeholder="TKN" />
          </Field>
          <Field label="Total Supply">
            <input className={inputCls} style={INPUT_STYLE} value={form.token_supply}
              onChange={set('token_supply')} placeholder="1,000,000,000" />
          </Field>
          <Field label="Token Utility">
            <textarea className={cn(inputCls, 'resize-none h-20')} style={INPUT_STYLE}
              value={form.token_utility} onChange={set('token_utility')}
              placeholder="Governance, staking, fees..." />
          </Field>
          <Field label="Emission Schedule">
            <textarea className={cn(inputCls, 'resize-none h-20')} style={INPUT_STYLE}
              value={form.token_emissions} onChange={set('token_emissions')}
              placeholder="Linear over 4 years, cliff..." />
          </Field>
        </div>
      </section>

      {/* ── Security ───────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionHead}><span style={{ color: '#e6bef7' }}>◇</span> Security</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Audit Firm">
            <input className={inputCls} style={INPUT_STYLE} value={form.audit_auditor}
              onChange={set('audit_auditor')} placeholder="Trail of Bits, Certik..." />
          </Field>
          <Field label="Audit Report URL">
            <input className={inputCls} style={INPUT_STYLE} value={form.audit_url}
              onChange={set('audit_url')} placeholder="https://..." />
          </Field>
          <Field label="Audit Date">
            <input type="date" className={inputCls} style={INPUT_STYLE}
              value={form.audit_date} onChange={set('audit_date')} />
          </Field>
          <Field label="Bug Bounty URL">
            <input className={inputCls} style={INPUT_STYLE} value={form.bug_bounty_url}
              onChange={set('bug_bounty_url')} placeholder="https://immunefi.com/..." />
          </Field>
        </div>
      </section>

      {/* ── Team ───────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionHead}><span style={{ color: '#e6bef7' }}>◈</span> Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Name">
            <input className={inputCls} style={INPUT_STYLE} value={form.team_name}
              onChange={set('team_name')} placeholder="Jane Smith" />
          </Field>
          <Field label="Role">
            <input className={inputCls} style={INPUT_STYLE} value={form.team_role}
              onChange={set('team_role')} placeholder="CEO, CTO..." />
          </Field>
          <Field label="LinkedIn">
            <input className={inputCls} style={INPUT_STYLE} value={form.team_linkedin}
              onChange={set('team_linkedin')} placeholder="https://linkedin.com/in/..." />
          </Field>
        </div>
      </section>

      {/* ── Status messages — only shown after mount (client-only) ─ */}
      {mounted && error && (
        <div className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {mounted && !isConnected && (
        <div className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', color: '#fbbf24' }}>
          Connect your wallet to submit a project.
        </div>
      )}

      {/* ── Submit button — same markup on server and client until mounted ── */}
      <button
        type="submit"
        disabled={btnDisabled}
        className="w-full font-bold py-4 px-6 rounded-xl text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={btnStyle}
      >
        {btnLabel}
      </button>

    </form>
  );
}
