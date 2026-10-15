import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const STEPS = ['Synchronizing electrons', 'Consulting Excel spreadsheets', 'Checking coffee supply', 'Ignoring management requests', 'Connecting energy market data'];

interface Props {
  onDone: () => void;
}

/** Short boot sequence – first visit only, skippable, skipped entirely with reduced motion. */
export function Intro({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (step < STEPS.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 320);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(false), 650);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-bg px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          data-testid="intro"
        >
          <div className="w-full max-w-sm font-mono text-sm text-text-2">
            <div className="mb-6">
              <div className="font-display text-2xl font-bold tracking-tight text-text">50 Hz of Grey</div>
              <div className="mt-1 text-xs text-text-3">Initializing German Grid Control...</div>
            </div>
            <ul className="space-y-1.5">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-2 transition-opacity ${i < step ? 'opacity-100' : 'opacity-30'}`}>
                  <span className={i < step ? 'text-green' : 'text-text-3'}>[{i < step ? '✓' : ' '}]</span>
                  {s}
                </li>
              ))}
            </ul>
            <div className={`mt-6 text-xs uppercase tracking-[0.2em] transition-opacity ${step >= STEPS.length ? 'text-cyan opacity-100' : 'opacity-0'}`}>System status: mostly functional</div>
            <button type="button" className="btn btn-sm mt-8" onClick={() => setVisible(false)} data-testid="intro-skip">
              Intro überspringen
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
