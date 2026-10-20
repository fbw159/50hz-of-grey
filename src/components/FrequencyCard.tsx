import type { GridView } from '@/logic/view';
import { frequencyMood } from '@/logic/panic';
import { FREQUENCY_LINES, pick } from '@/content/texts';
import { formatBerlinTime } from '@/lib/dateUtils';
import { formatNumber, MINUS } from '@/lib/formatters';
import type { Sample } from '@/lib/timeseries';

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

export function FrequencyCard({ view, slot }: { view: GridView; slot: string }) {
  const f = view.frequency;
  const ekg = view.ekg;
  const hour = view.hour;
  if (!f || !ekg || ekg.samples.length < 2) return null;

  const maxDev = Math.max(...ekg.samples.map((s) => Math.abs(s.v - 50)));
  const half = Math.max(0.06, Math.ceil((maxDev * 1.15) / 0.02) * 0.02);
  const mood = frequencyMood(f.deviationMilliHz);
  const bandY = (H / 2 - 6) * (0.05 / half);
  const dev = Math.round(f.deviationMilliHz);
  const devText = `${dev > 0 ? '+' : dev < 0 ? MINUS : '±'}${Math.abs(dev)} mHz`;

  return (
    <section id="ekg" className="panel scroll-mt-4 p-4" aria-labelledby="ekg-title" data-testid="ekg-card">
      <h2 id="ekg-title" className="section-title">
        Der Puls des Netzes
      </h2>
      <p className="mt-1 text-ink-2">Soll sind genau 50 Hertz. Zwischen 49,95 und 50,05 Hz ist Alltag, darüber hinaus wird es aufregend.</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-cond leading-none">
          <span className="text-[2.6rem] font-extrabold" data-testid="frequency-value">
            {formatNumber(f.value, 3)}
          </span>
          <span className="ml-1 text-[1.3rem] font-bold">Hz</span>
        </p>
        <span className={`chip mb-1 ${Math.abs(dev) < 50 ? 'bg-ok-soft text-ok' : Math.abs(dev) < 100 ? 'bg-signal-soft text-[#7a5500]' : 'bg-alarm-soft text-alarm'}`}>{devText}</span>
      </div>

      <div className="ekg relative mt-3 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[132px] w-full" role="img" aria-label={`Verlauf der Netzfrequenz der letzten ${ekg.windowMinutes} Minuten`}>
          <rect x="0" y={H / 2 - bandY} width={W} height={bandY * 2} fill="#d9ecd9" fillOpacity="0.85" />
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#c98f84" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={ekgPath(ekg.samples, ekg.from, ekg.to, half)} fill="none" stroke="var(--c-ekg-line)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute left-2 top-1 text-[0.75rem] font-semibold text-[#8f1d14]">{formatNumber(50 + half, 2)} Hz</span>
        <span className="absolute bottom-1 left-2 text-[0.75rem] font-semibold text-[#8f1d14]">{formatNumber(50 - half, 2)} Hz</span>
        <span className="absolute bottom-1 right-2 text-[0.75rem] font-semibold text-[#8f1d14]">{formatBerlinTime(f.t)}</span>
      </div>
      <p className="fine mt-1">Die letzten {ekg.windowMinutes} Minuten, Sekundenwerte. Grün: der ganz normale Bereich.</p>

      <p className="mt-3 text-[1.05rem]">{pick(FREQUENCY_LINES[mood], slot)}</p>

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
      <p className="fine mt-3">
        Gemessen vom Fraunhofer ISE in Freiburg, gilt für ganz Kontinentaleuropa. Letzter Wert von {formatBerlinTime(f.t, true)} Uhr.
      </p>
    </section>
  );
}
