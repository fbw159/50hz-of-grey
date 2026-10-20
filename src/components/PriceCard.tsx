import { useState } from 'react';
import type { DayView, GridView } from '@/logic/view';
import { kwhPerEuro, type HourPrice } from '@/logic/price';
import { PRICE_TEXT, pick, priceMood } from '@/content/texts';
import { formatBerlinTime, formatBerlinShortDate } from '@/lib/dateUtils';
import { eurPerMwhToCtPerKwh, formatNumber, MINUS } from '@/lib/formatters';

const W = 320;
const H = 140;
const TOP = 16;

function ct(eurMwh: number, digits = 1): string {
  return `${formatNumber(eurPerMwhToCtPerKwh(eurMwh), digits)} ct`;
}

function hourLabel(h: HourPrice): string {
  const end = formatBerlinTime(h.end).slice(0, 2);
  return `${formatBerlinTime(h.start).slice(0, 2)}–${end === '00' ? '24' : end} Uhr`;
}

function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function Bars({ day, now }: { day: DayView; now: number }) {
  const values = day.hours.map((h) => h.avg);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const sorted = [...values].sort((a, b) => a - b);
  const low = quantile(sorted, 0.25);
  const high = quantile(sorted, 0.75);
  const y = (v: number) => TOP + ((max - v) / (max - min)) * (H - TOP);
  const n = day.hours.length;
  const slot = W / n;
  const zero = y(0);
  const labels = day.hours.filter((_, i) => i % 6 === 0);
  const nowIndex = day.hours.findIndex((h) => now >= h.start && now < h.end);

  return (
    <div className="relative mt-3 pt-5">
      {nowIndex >= 0 && (
        <span
          className="absolute top-0 -translate-x-1/2 rounded-md bg-ink px-1.5 text-[0.7rem] font-semibold leading-[1.2rem] text-panel-hi"
          style={{ left: `${((nowIndex + 0.5) / n) * 100}%` }}
        >
          jetzt
        </span>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[140px] w-full" role="img" aria-label="Börsenstrompreis je Stunde">
        {day.hours.map((h, i) => {
          const isNow = now >= h.start && now < h.end;
          const fill = h.avg <= low ? '#3f9b55' : h.avg >= high ? '#c8392b' : '#9aa09b';
          const top = Math.min(y(h.avg), zero);
          const height = Math.max(1.5, Math.abs(zero - y(h.avg)));
          return (
            <g key={h.start}>
              {isNow && <rect x={i * slot} y={0} width={slot} height={H} fill="rgba(242,169,0,0.3)" />}
              <rect x={i * slot + slot * 0.14} y={top} width={slot * 0.72} height={height} rx={1.5} fill={fill} stroke={isNow ? '#293133' : 'none'} strokeWidth={isNow ? 1.5 : 0} vectorEffect="non-scaling-stroke">
                <title>{`${hourLabel(h)}: ${ct(h.avg)}/kWh`}</title>
              </rect>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={zero} y2={zero} stroke="#293133" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative mt-1 h-4 text-[0.75rem] text-ink-2">
        {labels.map((h) => (
          <span key={h.start} className="absolute -translate-x-0" style={{ left: `${(day.hours.indexOf(h) / n) * 100}%` }}>
            {formatBerlinTime(h.start).slice(0, 2)} Uhr
          </span>
        ))}
      </div>
      <p className="fine mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-[#3f9b55] align-middle" />
          billigste Stunden
        </span>
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-[#c8392b] align-middle" />
          teuerste Stunden
        </span>
        <span>Mittelwert je Stunde</span>
      </p>
    </div>
  );
}

export function PriceCard({ view, now, slot }: { view: GridView; now: number; slot: string }) {
  const [which, setWhich] = useState<'today' | 'tomorrow'>('today');
  const price = view.price;
  const current = price?.current ?? null;
  const day = which === 'tomorrow' && view.tomorrow ? view.tomorrow : view.today;
  if (!price || (!current && !day)) return null;

  const mood = current ? priceMood(current.value) : null;
  const perEuro = current ? kwhPerEuro(current.value) : null;

  return (
    <section id="preis" className="panel scroll-mt-4 p-4" aria-labelledby="price-title" data-testid="price-card">
      <h2 id="price-title" className="section-title">
        Was kostet Strom gerade?
      </h2>

      {current && mood && (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="font-cond leading-none">
              <span className="text-[2.6rem] font-extrabold" data-testid="price-value">
                {formatNumber(eurPerMwhToCtPerKwh(current.value), 1)}
              </span>
              <span className="ml-1 text-[1.3rem] font-bold">ct/kWh</span>
            </p>
            <span
              className={`chip mb-1 ${mood === 'negative' || mood === 'cheap' ? 'bg-ok-soft text-ok' : mood === 'normal' ? 'bg-panel-hi text-ink' : mood === 'pricey' ? 'bg-signal-soft text-[#7a5500]' : 'bg-alarm-soft text-alarm'}`}
            >
              {PRICE_TEXT[mood].tag}
            </span>
          </div>
          <p className="fine mt-1">
            An der Strombörse, für {formatBerlinTime(current.start)} bis {formatBerlinTime(current.end)} Uhr. Zu Hause zahlst du mit Steuern und Netzentgelten deutlich mehr.
          </p>
          <p className="mt-3 text-[1.05rem]">{pick(PRICE_TEXT[mood].lines, slot)}</p>
          <p className="mt-2 rounded-xl bg-panel-hi p-3 text-[0.95rem]" data-testid="price-euro">
            {perEuro !== null ? (
              <>
                Für 1 Euro gibt es an der Börse gerade <strong>{formatNumber(perEuro, 1)} kWh</strong>. Das reicht grob für {Math.max(1, Math.round(perEuro))}{' '}
                {Math.round(perEuro) === 1 ? 'Waschgang' : 'Waschgänge'} oder {formatNumber(Math.max(10, Math.round(perEuro / 0.02 / 10) * 10), 0)} Handyladungen.
              </>
            ) : current.value < 0 ? (
              <>
                Wer jetzt 1 kWh abnimmt, bekommt an der Börse <strong>{formatNumber(Math.abs(eurPerMwhToCtPerKwh(current.value)), 1)} ct</strong> dazu.
              </>
            ) : (
              <>Strom kostet an der Börse gerade exakt nichts. Gratis-Strom, nur nicht für dich.</>
            )}
          </p>
        </>
      )}

      {day && (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <h3 className="font-cond text-[1.2rem] font-bold">{which === 'tomorrow' && view.tomorrow ? `Morgen, ${formatBerlinShortDate(view.tomorrow.hours[0].start)}` : 'Heute'}</h3>
            {view.tomorrow && (
              <div className="flex rounded-xl border border-line bg-panel-hi p-0.5" role="tablist" aria-label="Tag wählen">
                {(['today', 'tomorrow'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={which === k}
                    onClick={() => setWhich(k)}
                    className={`min-h-9 rounded-[10px] px-3 text-[0.9rem] font-semibold ${which === k ? 'bg-ink text-panel-hi' : 'text-ink-2'}`}
                    data-testid={`day-${k}`}
                  >
                    {k === 'today' ? 'Heute' : 'Morgen'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Bars day={day} now={now} />
          {day.extremes && (
            <div className="mt-3 rounded-xl border border-dashed border-line p-3 text-[0.95rem]" data-testid="price-tip">
              <p>
                <span aria-hidden="true">🧺 </span>
                <strong>Waschmaschinen-Tipp:</strong> Am günstigsten {which === 'tomorrow' && view.tomorrow ? 'morgen' : 'heute'} {hourLabel(day.extremes.cheapest)} mit {formatPrice(day.extremes.cheapest.avg)}.
              </p>
              <p className="mt-1">
                <span aria-hidden="true">🕯️ </span>
                Am teuersten {hourLabel(day.extremes.priciest)} mit {formatPrice(day.extremes.priciest.avg)}. Perfekt für ein Candle-Light-Dinner.
              </p>
            </div>
          )}
          {!view.tomorrow && <p className="fine mt-2">Die Preise für morgen kommen jeden Tag ab etwa 13 Uhr.</p>}
        </>
      )}
      <p className="fine mt-3">Day-Ahead-Preis für Deutschland und Luxemburg, Daten über Energy-Charts.</p>
    </section>
  );
}

function formatPrice(eurMwh: number): string {
  const v = eurPerMwhToCtPerKwh(eurMwh);
  return `${v < 0 ? MINUS : ''}${formatNumber(Math.abs(v), 1)} ct/kWh`;
}
