import { useEffect, useState } from 'react';
import type { GridView } from '@/logic/view';
import { frequencyMood } from '@/logic/panic';
import { HAMBURG_MUNICH_KM, precisionMeters } from '@/logic/convert';
import { CULPRITS_HIGH, CULPRITS_LOW, FREQUENCY_LINES, blameTruth, pick } from '@/content/texts';
import { formatBerlinTime } from '@/lib/dateUtils';
import { formatNumber, MINUS } from '@/lib/formatters';
import { hashString, type Sample } from '@/lib/timeseries';

const W = 320;
const H = 132;

function ekgPath(samples: Sample[], from: number, to: number, half: number): string {
  const x = (t: number) => ((t - from) / (to - from)) * W;
  const y = (v: number) => H / 2 - ((v - 50) / half) * (H / 2 - 6);
  let d = '';
  let prevT = -Infinity;
  for (const s of samples) {
    // gaps longer than 10 s are drawn as gaps, not bridged
    d += `${s.t - prevT > 10_000 ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(s.v).toFixed(1)}`;
    prevT = s.t;
  }
  return d;
}

function devText(mhz: number): string {
  const d = Math.round(mhz);
  return `${d > 0 ? '+' : d < 0 ? MINUS : '±'}${Math.abs(d)} mHz`;
}

/** Replays the last ten minutes of real 1-second measurements in real time. */
function useReplay(length: number): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % length), 1000);
    return () => clearInterval(id);
  }, [length]);
  return length ? i % length : 0;
}

export function NetzTv({ view, slot }: { view: GridView; slot: string }) {
  const f = view.frequency;
  const ekg = view.ekg;
  const samples = ekg?.samples ?? [];
  const idx = useReplay(samples.length);
  const [blameSeed, setBlameSeed] = useState(0);
  if (!f || !ekg || samples.length < 2) return null;

  const maxDev = Math.max(...samples.map((s) => Math.abs(s.v - 50)));
  const half = Math.max(0.06, Math.ceil((maxDev * 1.15) / 0.02) * 0.02);
  const bandY = (H / 2 - 6) * (0.05 / half);
  const play = samples[idx];
  const playDev = (play.v - 50) * 1000;
  const px = ((play.t - ekg.from) / (ekg.to - ekg.from)) * W;
  const py = H / 2 - ((play.v - 50) / half) * (H / 2 - 6);

  const dev = f.deviationMilliHz;
  const meters = precisionMeters(dev);
  const culprits = dev < 0 ? CULPRITS_LOW : CULPRITS_HIGH;
  const culprit = culprits[(hashString(`blame-${slot}`) + blameSeed) % culprits.length];
  const hour = view.hour;

  return (
    <section id="ekg" className="panel scroll-mt-4 p-4" aria-labelledby="ekg-title" data-testid="ekg-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ekg-title" className="section-title">
          Netz-TV: Der Puls von Europa
        </h2>
        <span className="chip shrink-0 bg-alarm text-white" aria-hidden="true">
          <span className="rec-dot" /> Wiederholung
        </span>
      </div>
      <p className="mt-1 text-ink-2">Soll sind genau 50 Hertz. Hier läuft die echte Messung der letzten zehn Minuten noch einmal ab, Sekunde für Sekunde.</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-cond leading-none">
          <span className="text-[2.6rem] font-extrabold tabular-nums" data-testid="replay-value">
            {formatNumber(play.v, 3)}
          </span>
          <span className="ml-1 text-[1.3rem] font-bold">Hz</span>
          <span className="mt-1 block text-[0.95rem] font-semibold text-ink-2" data-testid="replay-time">
            gemessen um {formatBerlinTime(play.t, true)} Uhr
          </span>
        </p>
        <span className={`chip mb-1 ${Math.abs(playDev) < 50 ? 'bg-ok-soft text-ok' : Math.abs(playDev) < 100 ? 'bg-signal-soft text-[#7a5500]' : 'bg-alarm-soft text-alarm'}`}>{devText(playDev)}</span>
      </div>

      <div className="ekg relative mt-3 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[132px] w-full" role="img" aria-label={`Verlauf der Netzfrequenz der letzten ${ekg.windowMinutes} Minuten`}>
          <rect x="0" y={H / 2 - bandY} width={W} height={bandY * 2} fill="#d9ecd9" fillOpacity="0.85" />
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#c98f84" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={ekgPath(samples, ekg.from, ekg.to, half)} fill="none" stroke="var(--c-ekg-line)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1={px} x2={px} y1="0" y2={H} stroke="#293133" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* dot as HTML so it stays round with preserveAspectRatio="none" */}
        <span className="playhead" style={{ left: `${(px / W) * 100}%`, top: `${(py / H) * 100}%`, transition: idx === 0 ? 'none' : undefined }} aria-hidden="true" />
        <span className="absolute left-2 top-1 text-[0.75rem] font-semibold text-[#8f1d14]">{formatNumber(50 + half, 2)} Hz</span>
        <span className="absolute bottom-1 left-2 text-[0.75rem] font-semibold text-[#8f1d14]">{formatNumber(50 - half, 2)} Hz</span>
        <span className="absolute bottom-1 right-2 text-[0.75rem] font-semibold text-[#8f1d14]">{formatBerlinTime(f.t)}</span>
      </div>
      <p className="fine mt-1">Grün: der ganz normale Bereich von 49,95 bis 50,05 Hz.</p>

      <p className="mt-3 text-[1.05rem]">{pick(FREQUENCY_LINES[frequencyMood(dev)], slot)}</p>

      <div className="mt-3 rounded-xl bg-panel-hi p-3 text-[0.95rem]" data-testid="precision">
        <p className="font-cond text-[1.1rem] font-bold">Auf Deutsch</p>
        <p>
          Zuletzt lag die Frequenz {formatNumber(Math.abs(dev), 0)} mHz neben dem Soll. Das ist so genau, als würdest du von Hamburg nach München fahren (rund{' '}
          {HAMBURG_MUNICH_KM} km) und {meters < 1 ? 'auf den Meter genau parken' : `${formatNumber(meters, 0)} Meter neben dem Ziel parken`}.
        </p>
      </div>

      <div className="mt-3 rounded-xl border-2 border-dashed border-line p-3" data-testid="blame">
        <p className="font-cond text-[1.25rem] font-bold leading-tight">Wer ist schuld an den {devText(dev)}?</p>
        <p className="mt-1 text-[1.05rem]" aria-live="polite" data-testid="culprit">
          <span aria-hidden="true">🕵️ </span>
          {Math.abs(dev) < 2 ? 'Niemand. Unerhört.' : `Eindeutig ${culprit}.`}
        </p>
        <p className="fine mt-1">{blameTruth(dev)}</p>
        {Math.abs(dev) >= 2 && (
          <button type="button" className="btn mt-2" onClick={() => setBlameSeed((s) => s + 1)} data-testid="blame-next">
            Anderen Schuldigen finden
          </button>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.9rem]">
        <div className="rounded-xl bg-panel-hi p-2.5">
          <dt className="text-ink-2">Puls</dt>
          <dd className="font-semibold">3.000 Schläge pro Minute. Ausdauer hat er.</dd>
        </div>
        <div className="rounded-xl bg-panel-hi p-2.5">
          <dt className="text-ink-2">Letzte Stunde</dt>
          <dd className="font-semibold" data-testid="frequency-range">
            {hour && hour.min !== null && hour.max !== null ? `${formatNumber(hour.min, 3)} bis ${formatNumber(hour.max, 3)} Hz` : 'keine Daten'}
          </dd>
        </div>
      </dl>
      <p className="fine mt-3" data-testid="frequency-value">
        Gemessen vom Fraunhofer ISE in Freiburg, gilt für ganz Kontinentaleuropa. Letzter Wert: {formatNumber(f.value, 3)} Hz um {formatBerlinTime(f.t, true)} Uhr.
      </p>
    </section>
  );
}
