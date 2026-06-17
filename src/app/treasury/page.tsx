import type { Metadata } from 'next';
import { TreasuryPanel } from '@/components/TreasuryPanel';
import { glReadContract } from '@/lib/genlayer';
import type { TreasuryState } from '@/types';

export const metadata: Metadata = {
  title: 'Treasury — AlphaRank',
  description: 'AlphaRank protocol treasury — fee structure and on-chain fund management.',
};
export const dynamic = 'force-dynamic';

async function fetchTreasury(): Promise<TreasuryState> {
  try {
    const result = await glReadContract('get_treasury_state', []);
    const data = JSON.parse(result as string);
    return {
      ...data,
      evaluation_fee: parseFloat(process.env.NEXT_PUBLIC_EVALUATION_FEE || '0.1'),
      reevaluation_fee: parseFloat(process.env.NEXT_PUBLIC_REEVALUATION_FEE || '0.05'),
      total_evaluations_paid: data.total_fees_collected ?? 0,
    };
  } catch {
    return {
      total_fees_collected: 0,
      total_evaluations_paid: 0,
      evaluation_fee: parseFloat(process.env.NEXT_PUBLIC_EVALUATION_FEE || '0.1'),
      reevaluation_fee: parseFloat(process.env.NEXT_PUBLIC_REEVALUATION_FEE || '0.05'),
      owner: '',
    };
  }
}

const PANEL = {
  background: '#0e0a1a',
  border: '1px solid rgba(230,190,247,0.08)',
  borderRadius: '14px',
  padding: '24px',
};

export default async function TreasuryPage() {
  const treasury = await fetchTreasury();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--foreground)' }}>Protocol Treasury</h1>
        <p className="text-sm" style={{ color: '#9b86b8' }}>
          All protocol fees are stored and managed by the GenLayer Intelligent Contract on-chain.
        </p>
      </div>

      <TreasuryPanel treasury={treasury} className="mb-6" />

      {/* Fee structure breakdown */}
      <div style={PANEL}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--foreground)' }}>Fee Structure</h2>
        <div className="space-y-3">
          {[
            { label: 'Initial Evaluation',   value: `${treasury.evaluation_fee} GEN`,   desc: 'Paid when submitting project for first evaluation' },
            { label: 'Reevaluation Request', value: `${treasury.reevaluation_fee} GEN`, desc: 'Paid when requesting a second evaluation cycle' },
          ].map((fee) => (
            <div
              key={fee.label}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'rgba(230,190,247,0.04)', border: '1px solid rgba(230,190,247,0.07)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#ddd0f0' }}>{fee.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#6b5490' }}>{fee.desc}</p>
              </div>
              <span className="font-mono font-bold text-sm" style={{ color: '#e6bef7' }}>{fee.value}</span>
            </div>
          ))}
        </div>

        <div
          className="mt-4 rounded-lg p-3 text-xs leading-relaxed"
          style={{ background: 'rgba(230,190,247,0.03)', borderTop: '1px solid rgba(230,190,247,0.07)', color: '#6b5490' }}
        >
          Fees are paid directly to the GenLayer contract.
          Withdrawal is only available to the contract owner via <code className="font-mono" style={{ color: '#9b86b8' }}>withdraw_protocol_fees()</code>.
        </div>
      </div>
    </div>
  );
}
