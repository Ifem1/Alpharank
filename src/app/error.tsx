'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center space-y-4"
        style={{ background: '#0e0a1a', border: '1px solid rgba(248,113,113,0.18)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto"
          style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
        >
          ⚠
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Something went wrong</h2>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono" style={{ color: '#6b5490' }}>
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: '#fff',
            boxShadow: '0 0 16px rgba(168,85,247,0.3)',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
