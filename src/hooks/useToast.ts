import { useSyncExternalStore } from 'react';

type Listener = () => void;
let message: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

export function showToast(text: string, ms = 2600): void {
  message = text;
  listeners.forEach((l) => l());
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
    listeners.forEach((l) => l());
  }, ms);
}

export function useToast(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => message,
    () => message,
  );
}
