import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <div
          className="text-8xl font-black font-mono mb-4 select-none"
          style={{
            background: 'linear-gradient(135deg, #e6bef7 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 24px rgba(168,85,247,0.3))',
          }}
        >
          404
        </div>

        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
          Page Not Found
        </h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: '#9b86b8' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          It may also be a project that hasn&apos;t been evaluated yet.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="font-semibold px-6 py-3 rounded-xl text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(168,85,247,0.3)',
            }}
          >
            Back to Home
          </Link>
          <Link
            href="/rankings"
            className="font-semibold px-6 py-3 rounded-xl text-sm transition-all"
            style={{
              background: 'rgba(230,190,247,0.06)',
              border: '1px solid rgba(230,190,247,0.16)',
              color: '#e6bef7',
            }}
          >
            Browse Rankings
          </Link>
        </div>
      </div>
    </div>
  );
}
