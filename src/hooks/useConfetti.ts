import { useSyncExternalStore } from 'react';

let burst = 0;
const listeners = new Set<() => void>();

/** Fire a confetti burst anywhere in the app. */
export function fireConfetti(): void {
  burst += 1;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const get = () => burst;

export function useConfettiBurst(): number {
  return useSyncExternalStore(subscribe, get, get);
}
