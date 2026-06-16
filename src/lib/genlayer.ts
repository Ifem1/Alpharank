import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { Project, Evaluation, Ranking, LeaderboardEntry, Profile, HistoricalScore } from '@/types';

type CalldataEncodable = string | number | bigint | boolean | null | Uint8Array | CalldataEncodable[] | { [k: string]: CalldataEncodable };

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || '0x36De06c17912d1e2DEDc90CaFEC48A811820B647') as `0x${string}`;

function getReadClient() {
  // Use the official studionet chain — includes all required SDK fields
  return createClient({ chain: studionet, endpoint: RPC_ENDPOINT });
}

export async function glReadContract(method: string, args: CalldataEncodable[] = []): Promise<unknown> {
  const client = getReadClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
  });
}

export async function glWriteContract(
  method: string,
  args: CalldataEncodable[],
  account: string,
  value?: bigint
): Promise<string> {
  // In server-side API routes, we call via the RPC directly.
  // Browser-side calls use window.ethereum through the wagmi hook.
  const client = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: account as `0x${string}`,
  });

  const writeParams = value !== undefined
    ? { address: CONTRACT_ADDRESS, functionName: method, args, value }
    : { address: CONTRACT_ADDRESS, functionName: method, args, value: BigInt(0) };

  const txHash = await client.writeContract(writeParams);

  return txHash as string;
}

// ── Read helpers ──────────────────────────────────────────────────

export async function getProject(projectId: string): Promise<Project | null> {
  const result = await glReadContract('get_project', [projectId]);
  const parsed = JSON.parse(result as string);
  return Object.keys(parsed).length === 0 ? null : (parsed as Project);
}

export async function getEvaluation(projectId: string): Promise<Evaluation | null> {
  const result = await glReadContract('get_evaluation', [projectId]);
  const parsed = JSON.parse(result as string);
  return Object.keys(parsed).length === 0 ? null : (parsed as Evaluation);
}

export async function getRanking(projectId: string): Promise<Ranking | null> {
  const result = await glReadContract('get_ranking', [projectId]);
  const parsed = JSON.parse(result as string);
  return Object.keys(parsed).length === 0 ? null : (parsed as Ranking);
}

export async function getLeaderboard(category: string = 'overall'): Promise<LeaderboardEntry[]> {
  const result = await glReadContract('get_leaderboard', [category.toLowerCase()]);
  return JSON.parse(result as string) as LeaderboardEntry[];
}

export async function getProfile(wallet: string): Promise<Profile | null> {
  const result = await glReadContract('get_profile', [wallet]);
  const parsed = JSON.parse(result as string);
  return Object.keys(parsed).length === 0 ? null : (parsed as Profile);
}

export async function getHistoricalScores(projectId: string): Promise<HistoricalScore[]> {
  const result = await glReadContract('get_historical_scores', [projectId]);
  return JSON.parse(result as string) as HistoricalScore[];
}

export async function getTotalProjects(): Promise<number> {
  const result = await glReadContract('get_total_projects', []);
  return Number(result);
}

export async function getTotalEvaluations(): Promise<number> {
  const result = await glReadContract('get_total_evaluations', []);
  return Number(result);
}
