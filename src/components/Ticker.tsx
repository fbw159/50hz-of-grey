import type { GridView } from '@/logic/view';
import { INDEX_NAME, TICKER_FREQUENCY, TICKER_SATIRE } from '@/content/texts';
import { eurPerMwhToCtPerKwh, formatNumber } from '@/lib/formatters';
import { hashString } from '@/lib/timeseries';
import { frequencyMood } from '@/logic/panic';

/** Breaking-news ticker: real numbers, absurd headlines. */
export function Ticker({ view, slot }: { view: GridView; slot: string }) {
  const items: string[] = [];
  if (view.frequency) items.push(`Netzfrequenz ${formatNumber(view.frequency.value, 3)} Hz: ${TICKER_FREQUENCY[frequencyMood(view.frequency.deviationMilliHz)]}`);
  const price = view.price?.current?.value;
  if (price !== undefined) {
    const ct = formatNumber(eurPerMwhToCtPerKwh(price), 1);
    items.push(price < 0 ? `Börsenstrom ${ct} ct/kWh: Strom kostet weniger als nichts, Ökonomen ratlos` : `Börsenstrom ${ct} ct/kWh${price > 200 ? ': Toaster offiziell Luxusgut' : ''}`);
  }
  const share = view.generation?.renewableShareOfLoad;
  if (share != null) items.push(`${formatNumber(share, 0)} % Öko-Strom${share >= 70 ? ': Kohlekraftwerk bucht Wellness-Wochenende' : share < 30 ? ': Windräder melden sich krank' : ''}`);
  if (view.panic) items.push(`${INDEX_NAME} ${view.panic.score} von 100`);
  // four absurd headlines, changing every few minutes
  const start = hashString(slot) % TICKER_SATIRE.length;
  for (let i = 0; i < 4; i++) items.push(TICKER_SATIRE[(start + i * 3) % TICKER_SATIRE.length]);

  const text = items.map((t) => `+++ ${t} `).join('') + '+++';
  const seconds = Math.max(20, Math.round(text.length * 0.14));

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl bg-ink text-panel-hi" aria-label="Eilmeldungen" data-testid="ticker">
      <span className="hazard flex shrink-0 items-center px-1">
        <span className="rounded-md bg-signal px-2 py-1 font-cond text-[0.95rem] font-extrabold leading-none text-[#1f1a0a]">Eilmeldung</span>
      </span>
      <div className="ticker-window relative min-w-0 flex-1 overflow-hidden py-2">
        <div className="ticker-track" style={{ animationDuration: `${seconds}s` }}>
          <span className="pl-3 pr-6">{text}</span>
          <span className="ticker-dup pr-6" aria-hidden="true">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
