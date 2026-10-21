import { Share2 } from 'lucide-react';

export function Header({ onShare }: { onShare: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3 pb-3 pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true" className="shrink-0">
          <path d="M17 1.5 L33 28.5 H1 Z" fill="#f2a900" stroke="#293133" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M18.5 9 L12.5 19 H17 L15 25.5 L22 15 H17.5 Z" fill="#293133" />
        </svg>
        <div className="min-w-0">
          <p className="font-cond text-[1.55rem] font-extrabold leading-none tracking-tight">50 Hz of Grey</p>
          <p className="text-[0.875rem] leading-tight text-ink-2">Echte Daten, viel Spannung, kurz vor dem Weltuntergang.</p>
        </div>
      </div>
      <button type="button" className="btn shrink-0 !px-3.5" onClick={onShare} data-testid="share">
        <Share2 size={18} aria-hidden="true" />
        <span className="max-[379px]:sr-only">Teilen</span>
      </button>
    </header>
  );
}
