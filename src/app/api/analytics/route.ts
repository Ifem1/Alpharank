import { NextResponse } from 'next/server';
import { getTotalProjects, getTotalEvaluations, getLeaderboard } from '@/lib/genlayer';
import type { RankTier, ProjectCategory } from '@/types';

export async function GET() {
  try {
    const [totalProjects, totalEvaluations, overall] = await Promise.all([
      getTotalProjects(),
      getTotalEvaluations(),
      getLeaderboard('overall'),
    ]);

    const tierDistribution: Record<RankTier, number> = { 'S+': 0, S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    const categoryDistribution: Partial<Record<ProjectCategory, number>> = {};
    let totalScore = 0;

    for (const e of overall) {
      tierDistribution[e.tier] = (tierDistribution[e.tier] || 0) + 1;
      categoryDistribution[e.category] = (categoryDistribution[e.category] || 0) + 1;
      totalScore += e.overall_score;
    }

    const averageScore = overall.length > 0 ? Math.round((totalScore / overall.length) * 10) / 10 : 0;

    return NextResponse.json({
      total_projects: totalProjects,
      total_evaluations: totalEvaluations,
      average_score: averageScore,
      ranked_projects: overall.length,
      tier_distribution: tierDistribution,
      category_distribution: categoryDistribution,
    });
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    return NextResponse.json({ total_projects: 0, total_evaluations: 0 });
  }
}
