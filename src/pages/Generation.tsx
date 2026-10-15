import { useMemo, useState } from 'react';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { OriginTag, SatireTag } from '@/components/ui/Tags';
import { GenerationChart, GenerationLegend } from '@/components/charts/GenerationChart';
import { ForecastChart, type ForecastRow } from '@/components/charts/ForecastChart';
import { CATEGORY_COLORS } from '@/components/charts/chartTheme';
import { DefconMonitor } from '@/features/dunkelflaute/DefconMonitor';
import { GENERATION_CATEGORIES, coveredDays, dailyEnergyGwh, getGenerationRows, getGenerationStatus } from '@/features/production/productionMetrics';
import { generationComments } from '@/features/production/comments';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/features/settings/settingsStore';
import { getSeries, type Dataset } from '@/types/data';
import { berlinDayKey, formatAge, formatBerlinTime, relativeDayLabel, MINUTE } from '@/lib/dateUtils';
import { formatNumber, formatPercent, formatPower } from '@/lib/formatters';

export default function Generation() {
  const data = useGridData();
  const now = useNow(60_000);
  const settings = useSettings();
  const pp = data.datasets.publicPower;
  const gen = useMemo(() => getGenerationStatus(pp, now), [pp, now]);
  const days = useMemo(() => coveredDays(pp, berlinDayKey), [pp]);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const activeDay = dayKey && days.includes(dayKey) ? dayKey : (days[0] ?? berlinDayKey(now));
  const rows = useMemo(() => getGenerationRows(pp, activeDay), [pp, activeDay]);
  const comments = useMemo(() => generationComments(gen, now, settings.humor), [gen, now, settings.humor]);
  const intervalMs = pp?.intervalMs ?? 15 * MINUTE;
  const energyByDay = useMemo(() => days.map((d) => ({ dayKey: d, rows: getGenerationRows(pp, d) })).map((x) => ({ dayKey: x.dayKey, count: x.rows.length, energy: dailyEnergyGwh(x.rows, intervalMs) })), [days, pp, intervalMs]);

  const solarRows = useMemo(() => forecastRows(pp, data.datasets.forecastSolar, ['solar'], 'solar'), [pp, data.datasets.forecastSolar]);
  const windRows = useMemo(() => forecastRows(pp, data.datasets.forecastWindOnshore, ['wind_onshore'], 'wind_onshore', data.datasets.forecastWindOffshore, 'wind_offshore'), [pp, data.datasets.forecastWindOnshore, data.datasets.forecastWindOffshore]);

  return (
    <div className="space-y-4">
      <SectionTitle title="Generation Circus" subtitle="The show must go on. Preferably with sufficient spinning reserve." right={pp && <OriginTag origin={pp.origin} />} />

      {!gen ? (
        <Card>
          <CardHeader title="Keine Erzeugungsdaten" subtitle="Keine Messwerte vorhanden. Excel hilft hier leider auch nicht." />
        </Card>
      ) : (
        <>
          <Card data-testid="mix-card">
            <CardHeader
              title={settings.managementMode ? 'Generation Portfolio Mix' : 'Erzeugungsmix jetzt'}
              subtitle={`Öffentliche Nettoerzeugung · Stand ${formatBerlinTime(gen.t)} Uhr (${formatAge(gen.ageMs)})`}
              right={
                <InfoButton title="Öffentliche Nettoerzeugung vs. Last">
                  <p><strong>Öffentliche Nettoerzeugung:</strong> Erzeugung der Kraftwerke, die in das öffentliche Netz einspeisen, abzüglich Kraftwerkseigenbedarf. Industrielle Eigenversorgung ist nicht enthalten – die Gesamtstromerzeugung Deutschlands ist entsprechend höher.</p>
                  <p><strong>Last:</strong> Stromverbrauch (ohne Pumpspeicher-Ladung), wie von Energy-Charts ausgewiesen. Die Differenz zwischen Erzeugung und Last erklärt sich durch Import/Export und Speicher.</p>
                  <p><strong>Pumpspeicher:</strong> Erzeugung wird als Kategorie gezeigt; die Ladeleistung erscheint separat als negativer Wert.</p>
                  <p>Anteile beziehen sich immer auf die genannte Bezugsgröße (Last bzw. Erzeugung).</p>
                </InfoButton>
              }
            />
            <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full border border-border" role="img" aria-label="Anteile der Energieträger an der öffentlichen Nettoerzeugung">
              {[...GENERATION_CATEGORIES].reverse().map((c) => {
                const v = gen.categories[c.id];
                const total = gen.totalGenerationMw ?? 0;
                if (!v || total <= 0 || v <= 0) return null;
                return <span key={c.id} style={{ width: `${(v / total) * 100}%`, background: settings.moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id] }} title={`${c.label}: ${formatPower(v)}`} />;
              })}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm min-[480px]:grid-cols-2 lg:grid-cols-5">
              {[...GENERATION_CATEGORIES].reverse().map((c) => {
                const v = gen.categories[c.id];
                const total = gen.totalGenerationMw ?? 0;
                return (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: settings.moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id] }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-text-2">{c.label}</span>
                    <span className="readout text-text">{formatPower(v)}</span>
                    <span className="readout w-10 text-right text-[11px] text-text-3">{v !== null && total > 0 ? formatPercent((v / total) * 100, 0) : '–'}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <MetaStat label="Nettoerzeugung" value={formatPower(gen.totalGenerationMw)} />
              <MetaStat label="Last" value={formatPower(gen.loadMw)} sub={gen.residualLoadMw !== null ? `Residuallast ${formatPower(gen.residualLoadMw)}` : undefined} />
              <MetaStat label="EE-Anteil an der Last" value={formatPercent(gen.renewableShareOfLoad)} sub={gen.renewableShareOfGeneration !== null ? `an der Erzeugung ${formatPercent(gen.renewableShareOfGeneration, 0)}` : undefined} />
              <MetaStat label="Handel (kommerziell)" value={gen.netImportMw === null ? '–' : `${gen.netImportMw >= 0 ? 'Import' : 'Export'} ${formatPower(Math.abs(gen.netImportMw))}`} sub={gen.pumpedStorageConsumptionMw !== null ? `Pumpspeicher-Ladung ${formatPower(Math.abs(gen.pumpedStorageConsumptionMw))}` : undefined} />
            </dl>
            {comments.length > 0 && settings.humor !== 'professional' && (
              <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm text-text-2" data-testid="generation-comments">
                {comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <SatireTag />
                    <span>{c.message.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card data-testid="generation-day-chart">
            <CardHeader title="Tagesverlauf" subtitle={`${relativeDayLabel(activeDay, now)} · GW, 15-Minuten-Mittel · gestrichelt: Last`} />
            <div className="scroll-x mt-3 flex gap-1" role="tablist" aria-label="Tag wählen">
              {days.map((d) => (
                <button key={d} type="button" role="tab" aria-selected={activeDay === d} className="chip" onClick={() => setDayKey(d)}>
                  {relativeDayLabel(d, now)}
                </button>
              ))}
            </div>
            <div className="mt-3 -ml-2">
              <GenerationChart rows={rows} height={280} moreGreen={settings.moreGreen} />
            </div>
            <div className="mt-2">
              <GenerationLegend moreGreen={settings.moreGreen} />
            </div>
          </Card>

          {energyByDay.length > 1 && (
            <Card data-testid="day-comparison">
              <CardHeader title="Tagesvergleich" subtitle="Erzeugte Energie je Energieträger in GWh (Summe der 15-Minuten-Mittelwerte × Zeit)" />
              <div className="mt-3 space-y-3">
                {energyByDay.map((d) => {
                  const total = Object.values(d.energy).reduce((s, v) => s + v, 0);
                  const renewable = GENERATION_CATEGORIES.filter((c) => c.renewable).reduce((s, c) => s + d.energy[c.id], 0);
                  return (
                    <div key={d.dayKey}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-text">
                          {relativeDayLabel(d.dayKey, now)} {d.count < 96 && <span className="text-[11px] text-text-3">({d.count} von 96 Intervallen)</span>}
                        </span>
                        <span className="readout text-text-2">
                          {formatNumber(total, 0)} GWh · EE {total > 0 ? formatPercent((renewable / total) * 100, 0) : '–'}
                        </span>
                      </div>
                      <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full border border-border">
                        {[...GENERATION_CATEGORIES].reverse().map((c) => (total > 0 && d.energy[c.id] > 0 ? <span key={c.id} style={{ width: `${(d.energy[c.id] / total) * 100}%`, background: settings.moreGreen ? 'var(--c-green)' : CATEGORY_COLORS[c.id] }} title={`${c.label}: ${formatNumber(d.energy[c.id], 0)} GWh`} /> : null))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-text-3">Unvollständige Tage (heute, Datenverzögerung) enthalten nur die bereits veröffentlichten Intervalle.</p>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card data-testid="forecast-solar">
              <CardHeader title="PV: Prognose vs. Ist" subtitle="Day-Ahead-Prognose (gestrichelt) gegen öffentliche Nettoerzeugung" right={data.datasets.forecastSolar && <OriginTag origin={data.datasets.forecastSolar.origin} />} />
              <div className="mt-3 -ml-2">
                <ForecastChart rows={solarRows} color={CATEGORY_COLORS.solar} label="PV" showDate />
              </div>
              <ForecastDeviation rows={solarRows} />
            </Card>
            <Card data-testid="forecast-wind">
              <CardHeader title="Wind: Prognose vs. Ist" subtitle="Onshore + Offshore, Day-Ahead-Prognose gegen Nettoerzeugung" right={data.datasets.forecastWindOnshore && <OriginTag origin={data.datasets.forecastWindOnshore.origin} />} />
              <div className="mt-3 -ml-2">
                <ForecastChart rows={windRows} color={CATEGORY_COLORS.windOnshore} label="Wind" showDate />
              </div>
              <ForecastDeviation rows={windRows} />
            </Card>
          </div>

          <DefconMonitor />
          <p className="text-[11px] text-text-3">Quelle: Energy-Charts (Fraunhofer ISE), {pp?.license ?? 'CC BY 4.0'}. Erzeugung = öffentliche Nettostromerzeugung Deutschland; Prognosen = Day-Ahead-Prognosen laut Energy-Charts.</p>
        </>
      )}
    </div>
  );
}

function MetaStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-[11px] text-text-3">{label}</dt>
      <dd className="readout text-base font-semibold text-text">{value}</dd>
      {sub && <dd className="text-[11px] text-text-3">{sub}</dd>}
    </div>
  );
}

/** Mean absolute deviation for intervals where both forecast and actual exist. */
function ForecastDeviation({ rows }: { rows: ForecastRow[] }) {
  const both = rows.filter((r) => r.forecast !== null && r.actual !== null);
  if (both.length < 4) return <p className="mt-2 text-[11px] text-text-3">Prognoseabweichung wird berechnet, sobald genügend Ist-Werte vorliegen.</p>;
  const mad = both.reduce((s, r) => s + Math.abs((r.forecast as number) - (r.actual as number)), 0) / both.length;
  const bias = both.reduce((s, r) => s + ((r.actual as number) - (r.forecast as number)), 0) / both.length;
  return (
    <p className="mt-2 text-[11px] text-text-3">
      Mittlere absolute Abweichung über {both.length} Intervalle: {formatPower(mad)} · Ist − Prognose im Mittel {bias >= 0 ? '+' : '−'}
      {formatPower(Math.abs(bias))}
    </p>
  );
}

/** Merge forecast series (one or two) with the measured series on the forecast time grid. */
function forecastRows(actualDs: Dataset | undefined, fcA: Dataset | undefined, actualIds: string[], fcIdA: string, fcB?: Dataset, fcIdB?: string): ForecastRow[] {
  if (!fcA) return [];
  const sA = getSeries(fcA, fcIdA);
  const sB = fcB && fcIdB ? getSeries(fcB, fcIdB) : undefined;
  const actualIndex = new Map<number, number>();
  actualDs?.timestamps.forEach((t, i) => actualIndex.set(t, i));
  const actualSeries = actualIds.map((id) => getSeries(actualDs, id));
  const extraActual = fcIdB === 'wind_offshore' ? getSeries(actualDs, 'wind_offshore') : undefined;
  const bIndex = new Map<number, number>();
  fcB?.timestamps.forEach((t, i) => bIndex.set(t, i));
  return fcA.timestamps.map((t, i) => {
    let forecast = sA?.values[i] ?? null;
    if (sB) {
      const j = bIndex.get(t);
      const vb = j !== undefined ? (sB.values[j] ?? null) : null;
      if (vb !== null) forecast = (forecast ?? 0) + vb;
    }
    const ai = actualIndex.get(t);
    let actual: number | null = null;
    if (ai !== undefined) {
      for (const s of [...actualSeries, extraActual]) {
        const v = s?.values[ai];
        if (v !== null && v !== undefined) actual = (actual ?? 0) + v;
      }
    }
    return { t, forecast, actual };
  });
}
