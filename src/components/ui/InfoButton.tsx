import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Sheet } from './Sheet';

interface InfoButtonProps {
  title: string;
  children: ReactNode;
  label?: string;
  className?: string;
}

/** Small "what does this mean?" icon that opens an explanation sheet. */
export function InfoButton({ title, children, label, className = '' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-3 hover:bg-elevated hover:text-cyan ${className}`}
        onClick={() => setOpen(true)}
        aria-label={label ?? `Erklärung: ${title}`}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <div className="space-y-3 text-sm leading-relaxed text-text-2 [&_strong]:text-text">{children}</div>
      </Sheet>
    </>
  );
}
