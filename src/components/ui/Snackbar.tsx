import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, OctagonAlert, Trophy } from 'lucide-react';
import { dismissSnack, useSnackbar } from '@/hooks/useSnackbar';

const ICON = {
  info: <Info size={16} className="text-cyan" aria-hidden="true" />,
  success: <CheckCircle2 size={16} className="text-green" aria-hidden="true" />,
  warning: <AlertTriangle size={16} className="text-amber" aria-hidden="true" />,
  critical: <OctagonAlert size={16} className="text-red" aria-hidden="true" />,
};

/** Non-blocking notifications (replaces browser alerts). */
export function SnackbarHost() {
  const snacks = useSnackbar();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite" role="status">
      <AnimatePresence>
        {snacks.map((s) => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => dismissSnack(s.id)}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="card card-elevated pointer-events-auto flex w-full max-w-md items-start gap-3 px-4 py-3 text-left"
          >
            <span className="mt-0.5 shrink-0">{s.label === 'Achievement' ? <Trophy size={16} className="text-amber" aria-hidden="true" /> : ICON[s.tone]}</span>
            <span className="min-w-0">
              {s.label && <span className="label-caps block">{s.label}</span>}
              <span className="block text-sm text-text">{s.message}</span>
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
