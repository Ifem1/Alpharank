import type { Metadata } from 'next';
import { ProjectFormWithUpload } from '@/components/ProjectFormWithUpload';

export const metadata: Metadata = {
  title: 'Submit Project — AlphaRank',
  description: 'Submit your crypto project for AI-powered evaluation by GenLayer Intelligent Contracts.',
};

export default function SubmitPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--foreground)' }}>
          Submit Your Project
        </h1>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          Fill in all evidence. Lock it. GenLayer evaluates. Validators verify.
          Your score and tier become permanent on-chain state.
        </p>
      </div>

      {/* How it works banner */}
      <div
        className="rounded-xl p-4 mb-8 text-sm flex items-start gap-3"
        style={{
          background: 'rgba(230,190,247,0.05)',
          border: '1px solid rgba(230,190,247,0.14)',
        }}
      >
        <span className="text-lg flex-shrink-0" style={{ color: '#e6bef7' }}>⬡</span>
        <div style={{ color: '#c084fc' }}>
          <strong style={{ color: '#e6bef7' }}>How it works: </strong>
          Fill all details → Upload evidence files → Lock (SHA-256 hash generated) →
          Submit for GenLayer evaluation → Validators reach consensus →
          Score &amp; tier assigned on-chain, permanently.
        </div>
      </div>

      <ProjectFormWithUpload />
    </div>
  );
}
