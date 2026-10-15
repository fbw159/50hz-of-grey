import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Width class for desktop dialogs. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional id for the title element. */
  labelledBy?: string;
}

const SIZE = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' } as const;

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 * Closes on scrim tap and Escape; restores focus when closed.
 */
export function Sheet({ open, onClose, title, children, size = 'md' }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer);
      const prev = previousFocus.current as HTMLElement | null;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          style={{ background: 'var(--c-scrim)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          onClick={onClose}
          data-testid="sheet-scrim"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            className={`card card-elevated flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-[var(--radius-card)] ${SIZE[size]} outline-none`}
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden="true" />
              <h2 className="hidden font-display text-base font-semibold sm:block">{title}</h2>
              <button type="button" className="btn btn-ghost btn-sm absolute right-2 top-2 sm:static" onClick={onClose} aria-label="Schließen">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {title && <h2 className="px-4 pt-3 font-display text-base font-semibold sm:hidden">{title}</h2>}
            <div className="safe-bottom overflow-y-auto px-4 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
