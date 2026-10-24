import type { GridView } from '@/logic/view';
import { blockLabel } from '@/logic/weather';
import { WEATHER_EMOJI, weatherLine } from '@/content/texts';
import { formatNumber, MINUS } from '@/lib/formatters';

function ct(v: number): string {
  return `${v < 0 ? MINUS : ''}${formatNumber(Math.abs(v), 1)} ct`;
}

/** The grid weather report: real day-ahead forecasts, presented like TV weather. */
export function WeatherCard({ view, now }: { view: GridView; now: number }) {
  const forecast = view.weather.filter((b) => b.kind !== 'unknown');
  const priceOnly = view.weather.filter((b) => b.kind === 'unknown' && b.priceCt !== null);
  if (forecast.length === 0 && priceOnly.length === 0) return null;
  return (
    <section id="wetter" className="panel scroll-mt-4 p-4" aria-labelledby="weather-title" data-testid="weather-card">
      <h2 id="weather-title" className="section-title">
        Netz-Wetter mit Mr. Grey
      </h2>
      <p className="mt-1 text-ink-2">Die Prognosen für Wind- und Solarstrom und die Börsenpreise der nächsten Stunden. Ohne Gewähr, wie jeder Wetterbericht.</p>

      {forecast.length > 0 && (
        <ul className="mt-3 space-y-2" data-testid="weather-list">
          {forecast.map((b) => {
            const label = blockLabel(b, now);
            return (
              <li key={b.key} className="flex gap-3 rounded-xl bg-panel-hi p-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-[1.7rem] shadow-sm" aria-hidden="true">
                  {WEATHER_EMOJI[b.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-cond text-[1.2rem] font-bold leading-tight">{label.title}</span>
                    <span className="shrink-0 text-[0.8125rem] text-ink-2">{label.hours}</span>
                  </p>
                  <p className="text-[0.95rem] leading-snug">{weatherLine(b)}</p>
                  <p className="mt-0.5 text-[0.875rem] text-ink-2">
                    {b.priceCt !== null ? (
                      <>
                        Börsenstrom im Schnitt <strong className="text-ink">{ct(b.priceCt)}/kWh</strong>
                      </>
                    ) : (
                      'Börsenpreise kommen ab etwa 13 Uhr.'
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {priceOnly.length > 0 && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-line p-3" data-testid="weather-price-only">
          <p className="text-[0.95rem] leading-snug">
            <span aria-hidden="true">🔮 </span>
            {forecast.length > 0 ? 'Danach' : 'Für die nächsten Stunden'} ist der Wetterfrosch noch im Urlaub: Die Wind- und Solarprognose kommt später. Die Börsenpreise
            stehen aber schon fest:
          </p>
          <ul className="mt-2 divide-y divide-line/70 text-[0.95rem]">
            {priceOnly.map((b) => {
              const label = blockLabel(b, now);
              return (
                <li key={b.key} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span>
                    <strong>{label.title}</strong> <span className="text-ink-2">{label.hours}</span>
                  </span>
                  <span className="shrink-0">
                    Ø <strong>{ct(b.priceCt as number)}/kWh</strong>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="fine mt-3">Day-Ahead-Prognosen und Day-Ahead-Preise, über Energy-Charts (Fraunhofer ISE).</p>
    </section>
  );
}
