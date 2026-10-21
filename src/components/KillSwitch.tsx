import { useEffect, useRef, useState } from 'react';
import { BLACKOUT_STEPS } from '@/content/texts';
import { readJson, writeJson } from '@/lib/storage';
import { SocketFace } from './SocketFace';

type Phase = 'off' | 'boom' | 'restart' | 'done';

/** The big red mushroom button. Pressing it "causes" a blackout and a black start. */
export function KillSwitch() {
  const [phase, setPhase] = useState<Phase>('off');
  const [count, setCount] = useState(() => readJson<number>('blackouts', 0));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const press = () => {
    clearTimers();
    const next = count + 1;
    setCount(next);
    writeJson('blackouts', next);
    try {
      navigator.vibrate?.([80, 40, 160]);
    } catch {
      /* not supported */
    }
    setPhase('boom');
    timers.current.push(setTimeout(() => setPhase('restart'), 2200));
    timers.current.push(setTimeout(() => setPhase('done'), 4600));
  };

  const close = () => {
    clearTimers();
    setPhase('off');
  };

  useEffect(() => {
    const t = timers;
    return () => t.current.forEach(clearTimeout);
  }, []);

  const open = phase !== 'off';
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setPhase('off');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const step = phase === 'off' ? null : BLACKOUT_STEPS[phase];

  return (
    <section className="panel flex items-center gap-4 p-4" aria-labelledby="killswitch-title" data-testid="killswitch">
      <button type="button" className="estop shrink-0" onClick={press} aria-label="Not-Aus drücken" data-testid="estop">
        <span className="estop-mushroom" />
      </button>
      <div className="min-w-0">
        <h2 id="killswitch-title" className="font-cond text-[1.45rem] font-bold leading-tight">
          Not-Aus. Bloß nicht drücken.
        </h2>
        <p className="text-[0.95rem] leading-snug text-ink-2">
          Schaltet ganz Deutschland ab. Ungefähr. {count > 0 && <span data-testid="blackout-count">Deine Blackouts bisher: {count}.</span>}
        </p>
      </div>

      {step && (
        <div className={`blackout fixed inset-0 z-50 flex items-center justify-center p-6 ${phase}`} role="dialog" aria-modal="true" aria-labelledby="blackout-title" data-testid="blackout">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-4 w-fit" aria-hidden="true">
              <SocketFace mood={phase === 'boom' ? 'dead' : phase === 'restart' ? 'loading' : 'chill'} size={120} />
            </div>
            <p id="blackout-title" className="font-cond text-[2.6rem] font-extrabold leading-none">
              {step.title}
            </p>
            <p className="mt-3 text-[1.05rem] leading-snug">{step.text}</p>
            {phase === 'restart' && (
              <div className="mx-auto mt-5 h-2 w-48 overflow-hidden rounded-full bg-white/15">
                <div className="blackstart-bar h-full rounded-full bg-signal" />
              </div>
            )}
            <button ref={closeRef} type="button" className={`btn mt-6 ${phase === 'done' ? 'btn-yellow' : '!border-white/20 !bg-white/10 !text-white !shadow-none'}`} onClick={close} data-testid="blackout-close">
              {phase === 'done' ? 'Weiter' : 'Licht sofort wieder an'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
