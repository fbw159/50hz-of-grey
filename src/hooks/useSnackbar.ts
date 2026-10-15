import { useSyncExternalStore } from 'react';

export interface Snack {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'critical';
  /** Optional small label, e.g. "Achievement". */
  label?: string;
  durationMs: number;
}

type Listener = () => void;
let seq = 0;
let snacks: Snack[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function showSnack(message: string, opts: Partial<Omit<Snack, 'id' | 'message'>> = {}): number {
  const snack: Snack = { id: ++seq, message, tone: opts.tone ?? 'info', label: opts.label, durationMs: opts.durationMs ?? 3500 };
  snacks = [...snacks.slice(-2), snack];
  emit();
  setTimeout(() => dismissSnack(snack.id), snack.durationMs);
  return snack.id;
}

export function dismissSnack(id: number): void {
  if (!snacks.some((s) => s.id === id)) return;
  snacks = snacks.filter((s) => s.id !== id);
  emit();
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => snacks;

export function useSnackbar(): Snack[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
