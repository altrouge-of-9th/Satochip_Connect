import { EIP155_RPCS_BY_CHAINS } from '@/constants/Eip155';

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60 * 60 * 1000;

interface RpcEndpointState {
  failures: number;
  unavailableUntil?: number;
}

const endpointStates = new Map<string, RpcEndpointState>();

function getEndpointKey(chainId: number, rpcUrl: string): string {
  return `${chainId}:${rpcUrl}`;
}

export function getAvailableRpcUrls(chainId: number): string[] {
  const urls = EIP155_RPCS_BY_CHAINS[chainId] || [];
  const now = Date.now();

  return urls.filter(rpcUrl => {
    const key = getEndpointKey(chainId, rpcUrl);
    const state = endpointStates.get(key);

    if (!state?.unavailableUntil) {
      return true;
    }

    if (state.unavailableUntil <= now) {
      endpointStates.delete(key);
      return true;
    }

    return false;
  });
}

export function recordRpcSuccess(chainId: number, rpcUrl: string): void {
  endpointStates.delete(getEndpointKey(chainId, rpcUrl));
}

export function recordRpcFailure(chainId: number, rpcUrl: string): void {
  const key = getEndpointKey(chainId, rpcUrl);
  const state = endpointStates.get(key) || { failures: 0 };

  if (state.unavailableUntil && state.unavailableUntil > Date.now()) {
    return;
  }

  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.unavailableUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[RpcEndpointHealth] RPC ${rpcUrl} on chain ${chainId} failed ${FAILURE_THRESHOLD} times; skipping it for 1 hour`,
    );
  }

  endpointStates.set(key, state);
}
