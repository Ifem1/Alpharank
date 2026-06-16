export type ProjectCategory =
  | 'DeFi'
  | 'AI'
  | 'Gaming'
  | 'Infrastructure'
  | 'RWA'
  | 'DePIN'
  | 'Consumer'
  | 'Other';

export type ProjectStatus =
  | 'draft'
  | 'submitted'
  | 'evaluation_locked'
  | 'evaluating'
  | 'ranked'
  | 'reevaluation_pending'
  | 'archived';

export type RankTier = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Tokenomics {
  utility: string;
  emissions: string;
  supply: string;
  token_symbol?: string;
  total_supply?: number;
  circulating_supply?: number;
}

export interface TeamMember {
  name: string;
  role: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
}

export interface AuditReport {
  auditor: string;
  url: string;
  date: string;
  score?: number;
}

export interface Project {
  project_id: string;
  owner: string;
  name: string;
  category: ProjectCategory;
  website: string;
  description: string;
  whitepaper_url?: string;
  docs_url?: string;
  github_repos: string[];
  roadmap: string;
  investors?: string[];
  partnerships?: string[];
  tokenomics: Tokenomics;
  audits: AuditReport[];
  bug_bounty_url?: string;
  team: TeamMember[];
  ecosystem_integrations?: string[];
  evidence_hash?: string;
  locked_at?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface EvaluationScores {
  technical_score: number;
  team_score: number;
  market_fit_score: number;
  security_score: number;
  execution_score: number;
  token_utility_score: number;
  overall_score: number;
}

export type FactCheckVerdict =
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'disputed'
  | 'not_checkable'
  | 'fetch_failed';

export interface FactCheckReport {
  website_live: FactCheckVerdict;
  website_matches_description: FactCheckVerdict;
  team_verifiable: FactCheckVerdict;
  audit_reports_accessible: FactCheckVerdict;
  bug_bounty_active: FactCheckVerdict;
  github_repos_active: FactCheckVerdict;
  github_recent_commits: FactCheckVerdict;
  partnerships_mentioned_online: FactCheckVerdict;
  investors_mentioned_online: FactCheckVerdict;
  overall_credibility: 'high' | 'medium' | 'low' | 'very_low';
  red_flags: string[];
  verified_highlights: string[];
  fact_check_summary: string;
}

export interface Evaluation extends EvaluationScores {
  evaluation_id: string;
  project_id: string;
  tier: RankTier;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  fact_check_report?: FactCheckReport;
  web_evidence_urls?: Record<string, string | string[]>;
  evaluation_hash?: string;
  tx_hash?: string;
  evaluated_at: string;
}

export interface HistoricalScore {
  project_id: string;
  old_score: number;
  new_score: number;
  delta: number;
  old_tier: RankTier;
  new_tier: RankTier;
  timestamp: string;
  evaluation_id: string;
}

export interface Ranking {
  project_id: string;
  project_name: string;
  category: ProjectCategory;
  overall_score: number;
  tier: RankTier;
  rank_position: number;
  category_rank: number;
  previous_rank?: number;
  rank_change?: number;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  project_id: string;
  project_name: string;
  category: ProjectCategory;
  website: string;
  overall_score: number;
  tier: RankTier;
  technical_score: number;
  team_score: number;
  market_fit_score: number;
  security_score: number;
  execution_score: number;
  token_utility_score: number;
  evaluation_count: number;
  last_evaluated: string;
}

export interface Profile {
  wallet_address: string;
  display_name?: string;
  bio?: string;
  twitter?: string;
  github?: string;
  total_projects: number;
  total_evaluations: number;
  average_score: number;
  best_score: number;
  credibility_score: number;
  consistency_score: number;
  security_rating: number;
  execution_rating: number;
  created_at: string;
}

export interface GenLayerProofStep {
  label: string;
  status: 'pending' | 'complete' | 'failed';
  tx_hash?: string;
  timestamp?: string;
  method?: string;
  contract_address?: string;
}

export interface GenLayerProof {
  project_id: string;
  contract_address: string;
  evidence_hash?: string;
  evaluation_hash?: string;
  steps: GenLayerProofStep[];
}

export interface Notification {
  id: string;
  wallet_address: string;
  type: 'evaluation_complete' | 'rank_change' | 'reevaluation_approved' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  project_id?: string;
}

export interface AnalyticsData {
  total_projects: number;
  total_evaluations: number;
  average_score: number;
  tier_distribution: Record<RankTier, number>;
  category_distribution: Record<ProjectCategory, number>;
  score_over_time: { date: string; avg_score: number }[];
  top_categories: { category: ProjectCategory; count: number; avg_score: number }[];
}

export interface TreasuryState {
  total_fees_collected: number;
  total_evaluations_paid: number;
  evaluation_fee: number;
  reevaluation_fee: number;
  owner: string;
}
