/**
 * genlayer-write.ts — Client-side GenLayer write service.
 *
 * GenLayer transactions take 2–5 minutes to finalize.
 * This module NEVER throws on timeout — it submits the tx,
 * then returns the hash. Callers poll for completion.
 *
 * Flow: create_project → lock_project_data → submit_evaluation → run_evaluation
 * run_evaluation does ALL ranking. Do NOT call finalize_score in normal flow.
 */

import { createClient, abi } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

const calldata = abi.calldata;

const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ||
  '0x3F7D43d3db911eCC2fDE6bcB35e627Fe77cc5550'
) as `0x${string}`;

const CHAIN = studionet;
const CHAIN_ID_HEX = `0x${CHAIN.id.toString(16)}`;
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';

// ── Provider ─────────────────────────────────────────────────────

type EthProvider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isBraveWallet?: boolean;
  providers?: EthProvider[];
};

function getProvider(): EthProvider {
  if (typeof window === 'undefined') throw new Error('Browser only');
  const win = window as Window & { ethereum?: EthProvider };
  if (!win.ethereum) throw new Error('No wallet detected. Please install MetaMask.');
  if (Array.isArray(win.ethereum.providers)) {
    const mm = win.ethereum.providers.find((p: EthProvider) => p.isMetaMask && !p.isBraveWallet);
    return mm ?? win.ethereum.providers[0] ?? win.ethereum;
  }
  return win.ethereum;
}

async function ensureGenLayerChain(): Promise<void> {
  let provider: EthProvider;
  try { provider = getProvider(); } catch { return; }
  const chainParams = {
    chainId: CHAIN_ID_HEX,
    chainName: 'GenLayer Studionet',
    nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
    rpcUrls: [RPC_ENDPOINT],
    blockExplorerUrls: ['https://studio.genlayer.com'],
  };
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 4001) throw new Error('Network switch rejected. Please approve in your wallet.');
    if (code === 4902 || code === -32603) {
      try {
        await provider.request({ method: 'wallet_addEthereumChain', params: [chainParams] });
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
      } catch (addErr: unknown) {
        if ((addErr as { code?: number }).code === 4001) throw new Error('Please approve adding GenLayer network.');
        console.warn('wallet_addEthereumChain not supported:', addErr);
      }
    } else {
      console.warn('wallet_switchEthereumChain non-fatal:', err);
    }
  }
}

function getBrowserClient(account: string) {
  if (!account || !account.startsWith('0x')) throw new Error('Invalid wallet address.');
  return createClient({
    chain: CHAIN, endpoint: RPC_ENDPOINT,
    account: account as `0x${string}`,
    provider: getProvider(),
  });
}

// ── Core submit helpers ──────────────────────────────────────────

/**
 * Send a write tx — returns tx hash immediately after wallet signs.
 * Does NOT wait for finalization. Use glSubmitAndWait for blocking calls.
 */
export async function glSubmit(method: string, args: string[], account: string): Promise<string> {
  await ensureGenLayerChain();
  const client = getBrowserClient(account);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    value: BigInt(0),
  });
  return txHash as string;
}

/**
 * Submit + wait up to timeoutMs for FINALIZED.
 * On timeout: logs warning, returns tx hash. Does NOT throw.
 * GenLayer can take 2–5 min — we never hard-fail on timeout.
 */
export async function glSubmitAndWait(
  method: string,
  args: string[],
  account: string,
  timeoutMs = 300_000
): Promise<string> {
  const txHash = await glSubmit(method, args, account);
  try {
    const client = getBrowserClient(account);
    const timeoutP = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), timeoutMs)
    );
    await Promise.race([
      client.waitForTransactionReceipt({
        hash: txHash as `0x${string}` & { length: 66 },
        status: TransactionStatus.FINALIZED,
        interval: 5000,   // poll every 5 s — consensus rounds take 2–5 min
        retries: 90,      // 90 × 5 s = 7.5 min max before outer timeout wins
      }),
      timeoutP,
    ]);
  } catch (e) {
    // timeout or receipt error — tx was still submitted, not a real failure
    console.warn(`${method} wait ended (timeout/non-fatal) — tx ${txHash}:`, (e as Error).message);
  }
  return txHash as string;
}

// ── Decode base64 leader result ──────────────────────────────────

function decodeLeaderResult(b64: string): string | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    try { const d = calldata.decode(bytes.slice(1)); if (typeof d === 'string' && d.length > 0) return d; } catch {}
    try { const d = calldata.decode(bytes); if (typeof d === 'string' && d.length > 0) return d; } catch {}
    const ascii = new TextDecoder().decode(bytes.slice(3));
    if (/^[0-9a-f]{32}$/.test(ascii)) return ascii;
    return null;
  } catch { return null; }
}

async function fetchTxResult(txHash: string): Promise<string | null> {
  try {
    const res = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionByHash', params: [txHash] }),
    });
    const data = await res.json() as { result?: { consensus_data?: { leader_receipt?: Array<{ result?: string }> } } };
    const b64 = data?.result?.consensus_data?.leader_receipt?.[0]?.result;
    return b64 ? decodeLeaderResult(b64) : null;
  } catch { return null; }
}

async function glWriteAndGetResult(method: string, args: string[], account: string): Promise<unknown> {
  const txHash = await glSubmitAndWait(method, args, account);
  const fromRpc = await fetchTxResult(txHash);
  if (fromRpc) return fromRpc;
  try {
    const client = getBrowserClient(account);
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` & { length: 66 } });
    const b64 = (tx as { consensus_data?: { leader_receipt?: Array<{ result?: string }> } })?.consensus_data?.leader_receipt?.[0]?.result;
    if (b64) { const d = decodeLeaderResult(b64); if (d) return d; }
  } catch {}
  return txHash;
}

// ── Typed contract calls ─────────────────────────────────────────

export async function contractCreateProject(account: string, params: {
  name: string; category: string; website: string; description: string;
  whitepaper_url: string; docs_url: string; github_repos: string[];
  roadmap: string; tokenomics: object; audits: object[]; team: object[];
  investors: string[]; partnerships: string[]; bug_bounty_url: string;
  ecosystem_integrations: string[];
}): Promise<string> {
  const args = [
    params.name, params.category, params.website, params.description,
    params.whitepaper_url || '', params.docs_url || '',
    JSON.stringify(params.github_repos), params.roadmap,
    JSON.stringify(params.tokenomics), JSON.stringify(params.audits),
    JSON.stringify(params.team), JSON.stringify(params.investors),
    JSON.stringify(params.partnerships), params.bug_bounty_url || '',
    JSON.stringify(params.ecosystem_integrations),
  ];
  const result = await glWriteAndGetResult('create_project', args, account);
  if (typeof result === 'string' && result.length > 0 && !result.startsWith('0x')) return result;
  throw new Error(
    `Project created on-chain (tx: ${result}), but could not decode project ID. ` +
    `Check your Dashboard to find the project.`
  );
}

export async function contractLockProject(account: string, projectId: string): Promise<string> {
  return glSubmitAndWait('lock_project_data', [projectId], account, 180_000);
}

/** Step 3: changes status to "evaluating". Waits for confirmation. */
export async function contractSubmitEvaluation(account: string, projectId: string): Promise<string> {
  return glSubmitAndWait('submit_evaluation', [projectId], account, 120_000);
}

/**
 * Step 4: run_evaluation — submits the AI evaluation tx.
 * Returns tx hash immediately — does NOT wait 5 min.
 * Callers MUST poll get_project/get_evaluation for real completion.
 */
export async function contractRunEvaluation(account: string, projectId: string): Promise<string> {
  return glSubmit('run_evaluation', [projectId], account);
}

export async function contractRequestReevaluation(account: string, projectId: string): Promise<string> {
  return glSubmitAndWait('request_reevaluation', [projectId], account);
}
