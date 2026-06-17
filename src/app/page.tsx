import Link from 'next/link';

const FLOW_STEPS = [
  { n: '01', label: 'Submit',            desc: 'Upload whitepaper, GitHub, docs, tokenomics, and team data.' },
  { n: '02', label: 'Lock Evidence',     desc: 'Generate an immutable SHA-256 hash. Evidence is frozen.' },
  { n: '03', label: 'GenLayer Evaluates',desc: 'AI agents assess 6 dimensions via Intelligent Contracts.' },
  { n: '04', label: 'Validators Verify', desc: 'Decentralized validators reach consensus on results.' },
  { n: '05', label: 'Ranking Published', desc: 'Score, tier, and rank become permanent on-chain state.' },
];

const PROBLEMS = [
  { label: 'Influencer Rankings', desc: 'Paid opinions masquerading as research' },
  { label: 'VC Bias',             desc: 'Portfolio projects get undeserved promotion' },
  { label: 'Paid Reviews',        desc: 'Cash-for-coverage with no methodology' },
  { label: 'Manipulated Metrics', desc: 'Cherry-picked data, no verification standard' },
];

const DIMENSIONS = [
  { icon: '⬡', label: 'Technical Innovation', weight: '25%' },
  { icon: '◈', label: 'Team Quality',          weight: '20%' },
  { icon: '◎', label: 'Market Fit',            weight: '20%' },
  { icon: '◇', label: 'Security',              weight: '15%' },
  { icon: '▷', label: 'Execution Progress',    weight: '10%' },
  { icon: '◉', label: 'Token Utility',         weight: '10%' },
];

const TIERS = [
  { tier: 'S+', range: '95–100', hex: '#fbbf24' },
  { tier: 'S',  range: '90–94',  hex: '#e6bef7' },
  { tier: 'A',  range: '80–89',  hex: '#a78bfa' },
  { tier: 'B',  range: '70–79',  hex: '#34d399' },
  { tier: 'C',  range: '60–69',  hex: '#22d3ee' },
  { tier: 'D',  range: '50–59',  hex: '#fb923c' },
  { tier: 'F',  range: '0–49',   hex: '#f87171' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative px-4 py-24 sm:py-36 text-center max-w-5xl mx-auto overflow-hidden">
        {/* background glow */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(168,85,247,0.12) 0%, transparent 70%)',
          }}
        />

        {/* badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
          style={{
            background: 'rgba(230,190,247,0.07)',
            border: '1px solid rgba(230,190,247,0.18)',
            color: '#e6bef7',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#e6bef7', boxShadow: '0 0 6px #e6bef7' }}
          />
          Powered by GenLayer Intelligent Contracts
        </div>

        <h1
          className="text-4xl sm:text-6xl font-black tracking-tight mb-5 leading-tight"
          style={{ color: 'var(--foreground)' }}
        >
          Crypto project rankings
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg,#e6bef7 0%,#c084fc 40%,#a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            powered by GenLayer intelligence.
          </span>
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: '#9b86b8' }}>
          Submit your project. Lock the evidence. Let GenLayer AI analyze.
          Build verifiable on-chain reputation that researchers and investors trust.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/submit"
            className="font-semibold px-8 py-3.5 rounded-xl text-base w-full sm:w-auto transition-all"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7,#c084fc)',
              color: '#fff',
              boxShadow: '0 0 24px rgba(168,85,247,0.35)',
            }}
          >
            Submit Your Project
          </Link>
          <Link
            href="/rankings"
            className="font-semibold px-8 py-3.5 rounded-xl text-base w-full sm:w-auto transition-all"
            style={{
              background: 'rgba(230,190,247,0.06)',
              border: '1px solid rgba(230,190,247,0.16)',
              color: '#e6bef7',
            }}
          >
            Browse Rankings
          </Link>
        </div>
      </section>

      {/* ── Problem ─────────────────────────────────────── */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            The problem with crypto research
          </h2>
          <p style={{ color: '#6b5490' }}>Existing systems are broken by design.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PROBLEMS.map((p) => (
            <div
              key={p.label}
              className="rounded-xl p-5"
              style={{
                background: '#0e0a1a',
                border: '1px solid rgba(248,113,113,0.12)',
              }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: '#f87171' }}>
                {p.label}
              </div>
              <div className="text-xs" style={{ color: '#6b5490' }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Flow ──────────────────────────────────────────── */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            How AlphaRank works
          </h2>
          <p style={{ color: '#6b5490' }}>Every step is verifiable on-chain.</p>
        </div>
        <div className="space-y-3">
          {FLOW_STEPS.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-5 rounded-xl p-5"
              style={{
                background: '#0e0a1a',
                border: '1px solid rgba(230,190,247,0.08)',
              }}
            >
              <span
                className="font-mono font-black text-xl flex-shrink-0 w-8"
                style={{
                  background: 'linear-gradient(135deg,#e6bef7,#a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {s.n}
              </span>
              <div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--foreground)' }}>{s.label}</div>
                <div className="text-xs" style={{ color: '#9b86b8' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dimensions ─────────────────────────────────── */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            6 AI evaluation dimensions
          </h2>
          <p style={{ color: '#6b5490' }}>Weighted scoring across what actually matters.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIMENSIONS.map((d) => (
            <div
              key={d.label}
              className="flex items-center gap-4 rounded-xl p-5"
              style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
            >
              <span
                className="text-2xl w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ background: 'rgba(230,190,247,0.08)', color: '#e6bef7' }}
              >
                {d.icon}
              </span>
              <div>
                <div className="text-sm font-medium" style={{ color: '#ddd0f0' }}>{d.label}</div>
                <div className="font-mono font-bold text-sm" style={{ color: '#e6bef7' }}>{d.weight}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tiers ─────────────────────────────────────── */}
      <section className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Ranking Tiers
          </h2>
          <p style={{ color: '#6b5490' }}>On-chain assignment. Permanent and verifiable.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {TIERS.map((t) => (
            <div
              key={t.tier}
              className="rounded-xl p-4 text-center"
              style={{
                background: '#0e0a1a',
                border: `1px solid ${t.hex}28`,
              }}
            >
              <div
                className="text-2xl font-black font-mono mb-1"
                style={{ color: t.hex, textShadow: `0 0 10px ${t.hex}55` }}
              >
                {t.tier}
              </div>
              <div className="text-[10px] font-medium" style={{ color: '#6b5490' }}>{t.range}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="px-4 py-24 text-center max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-10"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.15) 0%,rgba(230,190,247,0.06) 100%)',
            border: '1px solid rgba(230,190,247,0.12)',
            boxShadow: '0 0 48px rgba(168,85,247,0.08)',
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Build verifiable on-chain reputation
          </h2>
          <p className="mb-8" style={{ color: '#9b86b8' }}>
            AlphaRank is the decentralized AI-powered crypto reputation network.
            Rankings are derived from GenLayer Intelligent Contracts — not opinions.
          </p>
          <Link
            href="/submit"
            className="inline-block font-bold px-10 py-4 rounded-xl text-lg transition-all"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7,#e6bef7)',
              color: '#fff',
              boxShadow: '0 0 28px rgba(230,190,247,0.25)',
            }}
          >
            Get Your Project Ranked
          </Link>
        </div>
      </section>
    </div>
  );
}
