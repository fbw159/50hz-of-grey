import { useRef, useState } from 'react';
import { SocketFace, type FaceMood } from './SocketFace';
import type { GridView } from '@/logic/view';
import { ERROR_TEXT, LOADING_TEXT, MOODS, SOCKET_POKES, pick } from '@/content/texts';
import { formatBerlinTime } from '@/lib/dateUtils';

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

export function Hero({ view, status, slot, onRetry, onDemo }: Props) {
  const [poke, setPoke] = useState<{ n: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panic = view.panic;

  const mood: FaceMood = panic ? panic.mood : status === 'error' ? 'dead' : 'loading';
  const verdict = panic ? MOODS[panic.mood].verdict : status === 'error' ? ERROR_TEXT.verdict : LOADING_TEXT.verdict;
  const line = panic ? pick(MOODS[panic.mood].lines, slot) : status === 'error' ? ERROR_TEXT.line : LOADING_TEXT.line;
  const lit = panic ? Math.round((panic.score / 100) * BAR_SEGMENTS) : 0;

  const onPoke = () => {
    const n = (poke?.n ?? -1) + 1;
    setPoke({ n, text: SOCKET_POKES[n % SOCKET_POKES.length] });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPoke(null), 2800);
  };

  return (
    <section className="panel relative overflow-hidden px-4 pb-5 pt-3" aria-labelledby="hero-title" data-testid="hero">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-1 z-10 flex justify-center" aria-live="polite">
          {poke && (
            <p key={poke.n} className="bubble max-w-[17rem] text-center text-[0.95rem]" data-testid="socket-bubble">
              {poke.text}
            </p>
          )}
        </div>
        <button type="button" onClick={onPoke} className="mx-auto mt-6 block rounded-[2.2rem]" aria-label="Steckdose anstupsen" data-testid="socket">
          <SocketFace mood={mood} poked={!!poke} key={poke?.n ?? 'idle'} />
        </button>
      </div>

      <h1 id="hero-title" className="mt-3 text-center font-cond leading-none">
        <span className="block text-[1.3rem] font-semibold text-ink-2">Das Stromnetz ist gerade</span>
        <span className="mt-1 block text-[clamp(2.6rem,12vw,3.4rem)] font-extrabold tracking-tight" data-testid="verdict">
          {verdict}
        </span>
      </h1>
      <p className="mx-auto mt-2 max-w-[24rem] text-center text-[1.05rem] leading-snug">{line}</p>

      {panic && (
        <div className="mt-5" data-testid="panic">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="font-cond text-[1.15rem] font-bold">Panik-Index</span>
            <span className="font-cond text-[1.5rem] font-extrabold leading-none" data-testid="panic-score">
              {panic.score}
              <span className="text-[1rem] font-semibold text-ink-2"> von 100</span>
            </span>
          </div>
          <div className="bargraph" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={panic.score} aria-label="Panik-Index">
            {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
              <span key={i} data-on={i < lit ? barColor(i) : undefined} />
            ))}
          </div>
          <details className="mt-2 text-[0.875rem] text-ink-2">
            <summary className="cursor-pointer select-none font-semibold text-ink">Wie wird das berechnet?</summary>
            <p className="mt-1.5">
              Ein Spaß-Index aus drei echten Messwerten: wie stark die Frequenz von 50 Hz abweicht, wie teuer der Börsenstrom ist und wie wenig Wind und Sonne
              gerade liefern. Keine offizielle Kennzahl.
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

      {status === 'error' && !panic && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-yellow" onClick={onRetry} data-testid="retry">
            Nochmal versuchen
          </button>
          <button type="button" className="btn" onClick={onDemo} data-testid="demo-on">
            Beispieldaten zeigen
          </button>
        </div>
      )}

      {view.frequency && (
        <p className="fine mt-3 text-center">
          Frequenz gemessen um {formatBerlinTime(view.frequency.t, true)} Uhr
          {view.frequency.stale ? ' (älter als 20 Minuten, zählt nicht mit)' : ''}
        </p>
      )}
    </section>
  );
}

const FACTOR_LABEL = { frequency: 'Frequenz-Zittern', price: 'Preis-Puls', flaute: 'Flaute-Faktor' } as const;
