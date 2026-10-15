import { useEffect } from 'react';

const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/** Classic Konami code listener (keyboard only – never interferes with inputs). */
export function useKonami(onTrigger: () => void): void {
  useEffect(() => {
    let position = 0;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === SEQUENCE[position]) {
        position += 1;
        if (position === SEQUENCE.length) {
          position = 0;
          onTrigger();
        }
      } else {
        position = key === SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTrigger]);
}
