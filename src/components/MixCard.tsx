import { useState } from 'react';
import type { GridView } from '@/logic/view';
import { SOURCES, sourceCaption } from '@/content/texts';
import { formatBerlinTime, zonedParts } from '@/lib/dateUtils';
import { formatNumber } from '@/lib/formatters';

const TOP = 5;

export function MixCard({ view }: { view: GridView }) {
  const [all, setAll] = useState(false);
  const g = view.generation;
  const rows = view.mix;
  if (!g || rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, TOP);

  const hour = zonedParts(g.t).hour;
  const isNight = hour < 7 || hour >= 19;
  const positive = rows.filter((r) => r.mw > 0);
  const share = g.renewableShareOfLoad;
  const trade = g.netImportMw;

  return (
    <section id="mix" className="panel scroll-mt-4 p-4" aria-labelledby="mix-title" data-testid="mix-card">
      <h2 id="mix-title" className="section-title">
        Wer liefert gerade den Strom?
      </h2>

      {share !== null && (
        <p className="mt-3 font-cond leading-none">
          <span className="text-[2.6rem] font-extrabold" data-testid="share-value">
            {formatNumber(share, 0)} %
          </span>
          <span className="ml-2 text-[1.2rem] font-bold">Öko-Strom</span>
        </p>
      )}
      <p className="fine mt-1">
        Anteil von Wind, Sonne, Biomasse und Wasser am Verbrauch, Stand {formatBerlinTime(g.t)} Uhr. Diese Daten kommen etwa ein bis zwei Stunden verzögert.
      </p>

      <div className="mt-3 flex h-7 overflow-hidden rounded-lg border border-line" role="img" aria-label="Anteile der Stromquellen an der Erzeugung">
        {positive.map((r) => (
          <span key={r.id} style={{ width: `${r.sharePct}%`, background: SOURCES[r.id].color }} title={`${SOURCES[r.id].label}: ${formatNumber(r.sharePct, 0)} %`} />
        ))}
      </div>

      <ul className="mt-3 divide-y divide-line/70" data-testid="mix-list">
        {shown.map((r) => {
          const s = SOURCES[r.id];
          return (
            <li key={r.id} className="flex gap-3 py-2.5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-[1.15rem]" style={{ background: `${s.color}33` }} aria-hidden="true">
                {s.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{s.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatNumber(r.mw / 1000, 1)} GW <span className="font-normal text-ink-2">({formatNumber(Math.max(0, r.sharePct), 0)} %)</span>
                  </span>
                </div>
                <p className="text-[0.875rem] leading-snug text-ink-2">{sourceCaption(r.id, r.mw, r.utilisation, isNight)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > TOP && (
        <button type="button" className="btn mt-1 w-full" onClick={() => setAll((v) => !v)} aria-expanded={all} data-testid="mix-more">
          {all ? 'Nur die größten fünf zeigen' : `Alle ${rows.length} Quellen zeigen`}
        </button>
      )}

      {trade !== null && Math.abs(trade) >= 100 && (
        <p className="mt-2 rounded-xl bg-panel-hi p-3 text-[0.95rem]" data-testid="trade">
          <span aria-hidden="true">{trade > 0 ? '📥 ' : '📤 '}</span>
          {trade > 0
            ? `Deutschland kauft gerade ${formatNumber(trade / 1000, 1)} GW im Ausland ein. Ganz normal im europäischen Strommarkt.`
            : `Deutschland verkauft gerade ${formatNumber(-trade / 1000, 1)} GW ins Ausland. Die Nachbarn sagen danke.`}
        </p>
      )}
      <p className="fine mt-3">Öffentliche Nettostromerzeugung in Deutschland, Daten von Energy-Charts (Fraunhofer ISE). Anteile in Klammern: an der Erzeugung.</p>
    </section>
  );
}
