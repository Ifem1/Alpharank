import { cn, getScoreHex } from '@/utils';

interface ScoreCardProps {
  label: string;
  score: number;
  weight: string;
  icon: string;
  description?: string;
  className?: string;
}

function Arc({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const hex = getScoreHex(score);

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      {/* Track */}
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(230,190,247,0.07)" strokeWidth="5" />
      {/* Fill */}
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={hex}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ filter: `drop-shadow(0 0 4px ${hex}88)`, transition: 'stroke-dashoffset 0.8s ease' }}
      />
      {/* Score text */}
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="monospace" fill={hex}>
        {Math.round(score)}
      </text>
    </svg>
  );
}

export function ScoreCard({ label, score, weight, icon, description, className }: ScoreCardProps) {
  return (
    <div
      className={cn('rounded-xl p-4 flex items-center gap-4', className)}
      style={{ background: '#0e0a1a', border: '1px solid rgba(230,190,247,0.08)' }}
    >
      <Arc score={score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span style={{ color: '#e6bef7' }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color: '#f5eeff' }}>{label}</span>
          <span className="text-[10px] font-mono ml-auto" style={{ color: '#6b5490' }}>{weight}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(230,190,247,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${score}%`,
              background: `linear-gradient(90deg, ${getScoreHex(score)}55, ${getScoreHex(score)})`,
              transition: 'width 0.8s ease',
            }}
          />
        </div>
        {description && (
          <p className="text-[11px] leading-relaxed" style={{ color: '#6b5490' }}>{description}</p>
        )}
      </div>
    </div>
  );
}

/* ── Individual named cards ─────────────────────────────────── */

export function TechnicalScoreCard({ score, className }: { score: number; className?: string }) {
  return (
    <ScoreCard
      label="Technical Innovation"
      score={score}
      weight="25%"
      icon="⬡"
      description="Protocol architecture, code quality, whitepaper depth"
      className={className}
    />
  );
}

export function TeamScoreCard({ score, className }: { score: number; className?: string }) {
  return (
    <ScoreCard
      label="Team Quality"
      score={score}
      weight="20%"
      icon="◈"
      description="Experience, credentials, investor backing"
      className={className}
    />
  );
}

export function MarketFitCard({ score, className }: { score: number; className?: string }) {
  return (
    <ScoreCard
      label="Market Fit"
      score={score}
      weight="20%"
      icon="◎"
      description="Problem clarity, TAM, differentiation, partnerships"
      className={className}
    />
  );
}

export function SecurityScoreCard({ score, className }: { score: number; className?: string }) {
  return (
    <ScoreCard
      label="Security"
      score={score}
      weight="15%"
      icon="◇"
      description="Audits, bug bounty, open source transparency"
      className={className}
    />
  );
}

export function ExecutionScoreCard({ score, className }: { score: number; className?: string }) {
  return (
    <ScoreCard
      label="Execution Progress"
      score={score}
      weight="10%"
      icon="▷"
      description="Roadmap delivery, GitHub activity, product maturity"
      className={className}
    />
  );
}

export function TokenUtilityCard({ score, className }: { score: number; className?: string }) {
  return (
    <ScoreCard
      label="Token Utility"
      score={score}
      weight="10%"
      icon="◉"
      description="Utility clarity, emission sustainability, value capture"
      className={className}
    />
  );
}
