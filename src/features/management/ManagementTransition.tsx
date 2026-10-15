import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const LINES = ['Technische Details werden erfolgreich entfernt …', 'Wissenschaftliche Präzision wird durch strategische KPIs ersetzt …', 'Management Intelligence aktiviert.'];

interface Props {
  active: boolean;
  onDone: () => void;
}

/** Full-screen transition shown when the Management Mode™ is switched on. */
export function ManagementTransition({ active, onDone }: Props) {
  return <AnimatePresence>{active && <TransitionScreen key="mgmt" onDone={onDone} />}</AnimatePresence>;
}

function TransitionScreen({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (line < LINES.length - 1) {
      const t = setTimeout(() => setLine((l) => l + 1), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [line, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[75] flex items-center justify-center px-6"
      style={{ background: 'color-mix(in srgb, var(--c-purple) 12%, var(--c-bg-deep))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="management-transition"
    >
      <div className="w-full max-w-md text-center">
        <div className="label-caps mb-4 text-purple">Management Mode™</div>
        <AnimatePresence mode="wait">
          <motion.p key={line} className="font-display text-xl font-semibold text-text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {LINES[line]}
          </motion.p>
        </AnimatePresence>
        <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-border">
          <motion.div className="h-full bg-purple" initial={{ width: '0%' }} animate={{ width: `${((line + 1) / LINES.length) * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
      </div>
    </motion.div>
  );
}
