import { useEffect, useRef, useState } from 'react';
import { SocketFace, type FaceMood } from './SocketFace';
import { Seg } from './Meters';
import type { GridView } from '@/logic/view';
import type { Headline } from '@/logic/headline';
import { doomClockTime, minutesToMidnight } from '@/logic/panic';
import { ERROR_TEXT, INDEX_NAME, LOADING_TEXT, MOODS, QUOTES, SHORT_CIRCUIT, SOCKET_NAME, SOCKET_POKES, doomLine, pick } from '@/content/texts';
import { formatAge, formatBerlinTime } from '@/lib/dateUtils';

interface Props {
  view: GridView;
  status: 'idle' | 'loading' | 'ready' | 'error';
  slot: string;
  onRetry: () => void;
  onDemo: () => void;
}

const BAR_SEGMENTS = 20;

function barColor(i: number): 'g' | 'y' | 'r' {
  if (i < 8) return 'g';
  if (i < 14) return 'y';
  return 'r';
}

/** Headline with the highlighted part in yellow. */
function HeadlineText({ h }: { h: Pick<Headline, 'text' | 'highlight'> }) {
  const i = h.highlight ? h.text.indexOf(h.highlight) : -1;
  if (i < 0) return <>{h.text}</>;
  return (
    <>
      {h.text.slice(0, i)}
      <mark className="headline-mark">{h.highlight}</mark>
      {h.text.slice(i + h.highlight.length)}
    </>
  );
}

/** Eyes follow the finger / mouse. */
function useLook(target: React.RefObject<HTMLElement | null>) {
  const [look, setLook] = useState<{ x: number; y: number } | undefined>(undefined);
  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      const { clientX, clientY } = e;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = target.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.4;
        setLook({ x: (clientX - cx) / Math.max(160, window.innerWidth / 2), y: (clientY - cy) / Math.max(160, window.innerHeight / 2) });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);
  return look;
}

export function FrontPage({ view, status, slot, onRetry, onDemo }: Props) {
  const [poke, setPoke] = useState<{ n: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<HTMLButtonElement | null>(null);
  const look = useLook(socketRef);
  const panic = view.panic;
  const h = view.headline;

  const mood: FaceMood = panic ? panic.mood : status === 'error' ? 'dead' : 'loading';
  const verdict = panic ? MOODS[panic.mood].verdict : status === 'error' ? ERROR_TEXT.verdict : LOADING_TEXT.verdict;
  const quote = poke ? poke.text : panic ? pick(QUOTES[panic.mood], slot) : status === 'error' ? 'Ich sehe nichts! Ist das schon der Blackout?' : 'Moment, ich mache mich noch frisch …';
  const lit = panic ? Math.round((panic.score / 100) * BAR_SEGMENTS) : 0;

  const hasData = status === 'ready' || !!panic;
  const headline: Pick<Headline, 'kicker' | 'text' | 'highlight'> = h
    ? h
    : hasData
      ? { kicker: 'Skandal', text: 'Stromnetz macht einfach seinen Job!', highlight: 'seinen Job' }
      : status === 'error'
        ? { kicker: 'Panne', text: 'Netzdaten spurlos verschwunden!', highlight: 'verschwunden' }
        : { kicker: 'Gleich', text: 'Mr. Grey macht sich noch frisch …', highlight: '' };
  const truth = h
    ? h.truth
    : hasData
      ? 'Gerade gibt es keine frische Frequenzmessung, und Preis und Öko-Anteil sind unauffällig. Neue Daten kommen alle paar Stunden.'
      : status === 'error'
        ? ERROR_TEXT.line
        : LOADING_TEXT.line;

  const pokes = useRef(0);
  const zapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zap, setZap] = useState(false);
  const onPoke = () => {
    const n = pokes.current;
    pokes.current += 1;
    // every tenth poke: short circuit
    const short = (n + 1) % 10 === 0;
    setPoke({ n, text: short ? SHORT_CIRCUIT : SOCKET_POKES[n % SOCKET_POKES.length] });
    try {
      navigator.vibrate?.(short ? [60, 40, 60, 40, 200] : 15);
    } catch {
      /* not supported */
    }
    if (short) {
      setZap(true);
      if (zapTimer.current) clearTimeout(zapTimer.current);
      zapTimer.current = setTimeout(() => setZap(false), 1000);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPoke(null), short ? 4500 : 3200);
  };
  useEffect(() => {
    const t = timer;
    const z = zapTimer;
    return () => {
      if (t.current) clearTimeout(t.current);
      if (z.current) clearTimeout(z.current);
    };
  }, []);

  return (
    <section className={`frontpage${zap ? ' zap' : ''}`} aria-labelledby="hero-title" data-testid="hero">
      <div className="relative">
        <span className="starburst" aria-hidden="true">
          <span>{headline.kicker}</span>
        </span>
        <h1 id="hero-title" className="headline" data-testid="headline" key={headline.text}>
          <span className="sr-only">{headline.kicker}: </span>
          <HeadlineText h={headline} />
        </h1>
      </div>

      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3">
        <button ref={socketRef} type="button" onClick={onPoke} className="photo -rotate-2" aria-label={`${SOCKET_NAME} anstupsen`} data-testid="socket">
          <SocketFace mood={zap ? 'panic' : mood} poked={!!poke} key={poke?.n ?? 'idle'} tie look={look} size={124} />
        </button>
        <div className="pt-1">
          <p className="quote" aria-live="polite" data-testid="quote">
            „{quote}“
          </p>
          <p className="mt-2 text-[0.875rem] leading-snug text-ink-2">
            <strong className="text-ink">{SOCKET_NAME} (230)</strong> ist gerade{' '}
            <strong className="text-ink" data-testid="verdict">
              {verdict}
            </strong>
            . <a href="#steckbrief" className="underline">Steckbrief</a>
          </p>
        </div>
      </div>

      <p className="truth mx-3 mt-4" data-testid="truth">
        <strong>Die Wahrheit:</strong> {truth}
      </p>

      {status === 'error' && !panic && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 px-3">
          <button type="button" className="btn btn-yellow" onClick={onRetry} data-testid="retry">
            Nochmal versuchen
          </button>
          <button type="button" className="btn" onClick={onDemo} data-testid="demo-on">
            Beispieldaten zeigen
          </button>
        </div>
      )}

      {panic && (
        <div className="mt-4 space-y-3 px-3" data-testid="panic">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="font-cond text-[1.15rem] font-bold">{INDEX_NAME}</span>
              <span className="font-cond text-[1.5rem] font-extrabold leading-none" data-testid="panic-score">
                {panic.score}
                <span className="text-[1rem] font-semibold text-ink-2"> von 100</span>
              </span>
            </div>
            <div className="bargraph" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={panic.score} aria-label={INDEX_NAME}>
              {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
                <span key={i} data-on={i < lit ? barColor(i) : undefined} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-ink p-2.5 pr-3 text-panel-hi" data-testid="doom-clock">
            <span className="lcd shrink-0 px-2.5 py-2">
              <Seg text={doomClockTime(panic.score)} className="text-[1.5rem] leading-none" />
            </span>
            <span className="min-w-0 text-[0.9rem] leading-snug">
              <strong className="block font-cond text-[1.1rem]">Weltuntergangsuhr</strong>
              Noch {minutesToMidnight(panic.score)} {minutesToMidnight(panic.score) === 1 ? 'Minute' : 'Minuten'} bis Mitternacht. {doomLine(minutesToMidnight(panic.score))}
            </span>
          </div>
          <details className="text-[0.875rem] text-ink-2">
            <summary className="cursor-pointer select-none font-semibold text-ink">Wie wird das berechnet?</summary>
            <p className="mt-1.5">
              Ein Spaß-Index aus drei echten Messwerten: wie stark die Frequenz von 50 Hz abweicht, wie teuer der Börsenstrom ist und wie wenig Wind und Sonne gerade liefern.
              Keine offizielle Kennzahl. „Erregung“ heißt das Magnetfeld-Machen im Generator übrigens wirklich. Die Weltuntergangsuhr rechnet den Index in Minuten bis
              Mitternacht um (0 = 23:00 Uhr, 100 = 23:59 Uhr). Reine Satire, das Netz ist sehr stabil.
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {panic.factors.map((f) => (
                <li key={f.id} className="flex justify-between gap-3">
                  <span>{FACTOR_LABEL[f.id]}</span>
                  <span className="font-semibold text-ink">
                    {Math.round(f.score)} von 100, zählt {Math.round(f.weight * 100)} %
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {view.frequency && (
        <p className="fine mt-3 px-3 pb-1 text-center">
          Frequenz gemessen um {formatBerlinTime(view.frequency.t, true)} Uhr
          {view.frequency.stale
            ? ' (zu alt, zählt nicht mit)'
            : view.frequency.ageMs > 15 * 60_000
              ? ` (${formatAge(view.frequency.ageMs)}, neue Messwerte kommen alle paar Stunden)`
              : ''}
        </p>
      )}
    </section>
  );
}

const FACTOR_LABEL = { frequency: 'Frequenz-Zittern', price: 'Preis-Puls', flaute: 'Flaute-Frust' } as const;
