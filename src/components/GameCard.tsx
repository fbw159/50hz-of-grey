import { useCallback, useEffect, useRef, useState } from 'react';
import { CALM_HZ, GAME_DURATION_S, LIMIT_HZ, adjust, isBetter, lossText, newGame, rankFor, step, type GameBest, type GameState, type Rng } from '@/logic/game';
import { seededRandom } from '@/lib/timeseries';
import { readJson, writeJson } from '@/lib/storage';
import { appUrl } from '@/lib/clipboard';
import { shareText } from '@/lib/share';
import { showToast } from '@/hooks/useToast';
import { formatNumber } from '@/lib/formatters';
import { Seg } from './Meters';
import { SocketFace, type FaceMood } from './SocketFace';

const SPAN = 0.25; // scale shows 49,75 … 50,25 Hz

function pos(f: number): number {
  return Math.min(100, Math.max(0, ((f - (50 - SPAN)) / (2 * SPAN)) * 100));
}


export function GameCard() {
  const [game, setGame] = useState<GameState | null>(null);
  const [best] = useState<GameBest | null>(() => readJson<GameBest | null>('game-best', null));
  const rng = useRef<Rng | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  const running = game?.status === 'running';

  const start = () => {
    rng.current = seededRandom(`game-${Date.now()}`);
    last.current = null;
    setGame(newGame(rng.current));
  };

  const push = useCallback((dir: 1 | -1) => {
    setGame((g) => (g ? adjust(g, dir) : g));
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        /* not supported */
      }
    }
  }, []);

  // animation loop
  useEffect(() => {
    if (!running) return;
    const tick = (ts: number) => {
      const dt = last.current === null ? 0 : (ts - last.current) / 1000;
      last.current = ts;
      setGame((g) => (g && rng.current ? step(g, dt, rng.current) : g));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
    };
  }, [running]);

  // keyboard: ↑ / ↓
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        push(1);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        push(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, push]);

  // remember the personal best when a round ends (shown next time the page opens)
  const status = game?.status;
  const seconds = game ? Math.floor(game.t) : 0;
  useEffect(() => {
    if (!status || status === 'running') return;
    const result: GameBest = { seconds, won: status === 'won' };
    if (isBetter(result, readJson<GameBest | null>('game-best', null))) writeJson('game-best', result);
  }, [status, seconds]);

  const shareResult = async (g: GameState) => {
    const rank = rankFor(g);
    const text =
      g.status === 'won'
        ? `Ich habe das Stromnetz ${GAME_DURATION_S} Sekunden lang bei 50 Hz gehalten, ohne die Kontrolle zu verlieren. Titel: ${rank.title}. Hältst du die Spannung auch so lange?`
        : `Ich habe das Stromnetz ${Math.floor(g.t)} Sekunden lang bei Laune gehalten. Titel: ${rank.title}. Kannst du das länger?`;
    const r = await shareText('Halt die 50 Hz!', text, `${appUrl()}#spiel`);
    if (r === 'copied') showToast('Ergebnis kopiert. Jetzt einfügen und ein bisschen angeben.');
    if (r === 'failed') showToast('Teilen hat nicht geklappt.');
  };

  return (
    <section id="spiel" className="panel scroll-mt-4 p-4" aria-labelledby="game-title" data-testid="game-card">
      <h2 id="game-title" className="section-title">
        Halt die 50 Hz!
      </h2>

      {!game && (
        <>
          <p className="mt-2 text-[1.05rem]">
            Jetzt hast du die Kontrolle. Mr. Grey mag das. Halbzeitpausen, Kuschelabende und Sturmtiefs bringen das Netz aus dem Takt. Gleiche mit deinem
            Kraftwerk aus und halte {GAME_DURATION_S} Sekunden durch.
          </p>
          <ul className="mt-3 space-y-1 text-[0.95rem]">
            <li>
              <span aria-hidden="true">⬇️ </span>Frequenz fällt: <strong>Kraftwerk hoch</strong>
            </li>
            <li>
              <span aria-hidden="true">⬆️ </span>Frequenz steigt: <strong>Kraftwerk runter</strong>
            </li>
            <li>
              <span aria-hidden="true">🚫 </span>Unter 49,8 oder über 50,2 Hz ist Schluss.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-yellow min-h-12 px-6 text-[1.1rem]" onClick={start} data-testid="game-start">
              Spiel starten
            </button>
            {best && (
              <span className="fine" data-testid="game-best">
                Dein Rekord: {best.won ? 'geschafft' : `${best.seconds} Sekunden`}
              </span>
            )}
          </div>
          <p className="fine mt-3">Ein Spiel mit vereinfachter Physik, keine echten Daten.</p>
        </>
      )}

      {game && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0" data-testid="game-face">
              <SocketFace mood={gameMood(game)} size={62} />
            </span>
            <span className="lcd inline-flex items-baseline gap-1.5 px-3 py-2">
              <Seg text={game.f.toFixed(3)} className="text-[1.45rem] leading-none" />
              <span className="text-[0.9rem] font-semibold">Hz</span>
            </span>
            <span className="text-right font-cond leading-tight">
              <span className="block text-[1.6rem] font-extrabold tabular-nums" data-testid="game-time">
                {Math.max(0, Math.ceil(GAME_DURATION_S - game.t))} s
              </span>
              <span className="text-[0.85rem] font-semibold text-ink-2">noch</span>
            </span>
          </div>

          {/* scale with needle */}
          <div className="relative mt-4 h-10" aria-hidden="true">
            <div className="absolute inset-x-0 top-3 h-4 overflow-hidden rounded-full border border-line">
              <div className="absolute inset-y-0" style={{ left: 0, width: `${pos(50 - LIMIT_HZ)}%`, background: '#c8392b' }} />
              <div className="absolute inset-y-0" style={{ left: `${pos(50 - LIMIT_HZ)}%`, width: `${pos(50 - CALM_HZ) - pos(50 - LIMIT_HZ)}%`, background: '#f2a900' }} />
              <div className="absolute inset-y-0" style={{ left: `${pos(50 - CALM_HZ)}%`, width: `${pos(50 + CALM_HZ) - pos(50 - CALM_HZ)}%`, background: '#3f9b55' }} />
              <div className="absolute inset-y-0" style={{ left: `${pos(50 + CALM_HZ)}%`, width: `${pos(50 + LIMIT_HZ) - pos(50 + CALM_HZ)}%`, background: '#f2a900' }} />
              <div className="absolute inset-y-0 right-0" style={{ left: `${pos(50 + LIMIT_HZ)}%`, background: '#c8392b' }} />
            </div>
            <div className="absolute top-0 h-10 w-1.5 -translate-x-1/2 rounded-full bg-ink shadow" style={{ left: `${pos(game.f)}%` }} />
          </div>
          <div className="relative h-4 text-[0.75rem] text-ink-2" aria-hidden="true">
            <span className="absolute -translate-x-1/2" style={{ left: `${pos(50 - LIMIT_HZ)}%` }}>
              49,8
            </span>
            <span className="absolute -translate-x-1/2" style={{ left: '50%' }}>
              50,0 Hz
            </span>
            <span className="absolute -translate-x-1/2" style={{ left: `${pos(50 + LIMIT_HZ)}%` }}>
              50,2
            </span>
          </div>

          <p className="mt-3 min-h-[3.4rem] rounded-xl bg-panel-hi p-3 text-[0.95rem] leading-snug" aria-live="polite" data-testid="game-event">
            {game.event ? (
              <>
                <span aria-hidden="true">{game.event.emoji} </span>
                {game.event.text}{' '}
                <strong className="whitespace-nowrap">
                  {game.event.gwScaled > 0 ? `Es fehlen ${game.event.gwScaled} GW.` : `${Math.abs(game.event.gwScaled)} GW zu viel.`}
                </strong>
              </>
            ) : (
              'Alles ruhig. Noch.'
            )}
          </p>

          {running ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-dark min-h-16 flex-col gap-0 text-[1.05rem]" onClick={() => push(-1)} data-testid="game-down">
                <span aria-hidden="true">▼</span> Kraftwerk runter
              </button>
              <button type="button" className="btn btn-yellow min-h-16 flex-col gap-0 text-[1.05rem]" onClick={() => push(1)} data-testid="game-up">
                <span aria-hidden="true">▲</span> Kraftwerk hoch
              </button>
            </div>
          ) : (
            <Result game={game} onAgain={start} onShare={() => shareResult(game)} />
          )}
        </div>
      )}
    </section>
  );
}

function Result({ game, onAgain, onShare }: { game: GameState; onAgain: () => void; onShare: () => void }) {
  const rank = rankFor(game);
  const loss = lossText(game.status);
  const calm = game.t > 0 ? (game.calmSeconds / game.t) * 100 : 0;
  return (
    <div className="mt-3" data-testid="game-result">
      <p className="font-cond text-[1.1rem] font-semibold text-ink-2">{game.status === 'won' ? 'Geschafft! Dein Titel:' : 'Game over. Dein Titel:'}</p>
      <p className="font-cond text-[2rem] font-extrabold leading-tight">{rank.title}</p>
      <p className="mt-1">{rank.text}</p>
      {loss && <p className="fine mt-2">{loss}</p>}
      <p className="fine mt-2">
        {Math.floor(game.t)} Sekunden durchgehalten, davon {formatNumber(calm, 0)} % im grünen Bereich, {game.taps} Mal gedrückt.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-yellow" onClick={onAgain} data-testid="game-again">
          Nochmal spielen
        </button>
        <button type="button" className="btn" onClick={onShare}>
          Ergebnis teilen
        </button>
      </div>
    </div>
  );
}

/** Mr. Grey sweats along with the player. */
function gameMood(g: GameState): FaceMood {
  if (g.status === 'won') return 'chill';
  if (g.status === 'low' || g.status === 'high') return 'dead';
  const d = Math.abs(g.f - 50);
  if (d < 0.03) return 'zen';
  if (d < 0.06) return 'chill';
  if (d < 0.1) return 'nervous';
  if (d < 0.15) return 'sweaty';
  return 'panic';
}
