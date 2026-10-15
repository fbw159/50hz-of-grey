import { useEffect, useMemo } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { KpiCard } from '@/components/cards/KpiCard';
import { SatireTag } from '@/components/ui/Tags';
import { KpiSkeleton } from '@/components/ui/Skeleton';
import { GenerationChart, GenerationLegend } from '@/components/charts/GenerationChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { FrequencyHero } from '@/features/frequency/FrequencyHero';
import { PanicGauge } from '@/features/panic/PanicGauge';
import { usePanicIndex } from '@/features/panic/usePanicIndex';
import { IncidentList, IncidentTicker } from '@/features/incidents/IncidentFeed';
import { useIncidents } from '@/features/incidents/useIncidents';
import { ManagementPanel } from '@/features/management/ManagementPanel';
import { DefconMonitor } from '@/features/dunkelflaute/DefconMonitor';
import { getPriceOverview, priceRegime } from '@/features/prices/priceMetrics';
import { getRecentGenerationRows, getGenerationStatus } from '@/features/production/productionMetrics';
import { generationComments } from '@/features/production/comments';
import { achievementStore } from '@/features/achievements/achievementStore';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/features/settings/settingsStore';
import type { RouteId } from '@/hooks/useHashRoute';
import { formatAge, formatBerlinTime } from '@/lib/dateUtils';
import { formatNumber, formatPercent, formatPower, formatPrice, formatCtPerKwh } from '@/lib/formatters';
import { engineerFactOfTheMoment, isNight, nonsenseKpiOfTheDay, pickCaption, pickMessage, rotationSlot } from '@/lib/humorEngine';
import { BUREAUCRACY_SUBTITLES } from '@/lib/bureaucracy';
import { hashString } from '@/lib/timeseries';
import { DataStatusPanel } from '@/components/layout/DataStatus';
import { errorHeadline } from '@/components/layout/errorHeadline';

interface Props {
  onNavigate: (page: RouteId, sub?: string | null) => void;
}

export default function ControlRoom({ onNavigate }: Props) {
  const data = useGridData();
  const now = useNow(30_000);
  const settings = useSettings();
  const { panic, bureaucracy } = usePanicIndex();
  const incidents = useIncidents();
  const intensity = settings.humor;
  const mgmt = settings.managementMode;
  const slot = rotationSlot(now, 10);

  const price = useMemo(() => getPriceOverview(data.datasets.price, now), [data.datasets.price, now]);
  const gen = useMemo(() => getGenerationStatus(data.datasets.publicPower, now), [data.datasets.publicPower, now]);
  const recentRows = useMemo(() => getRecentGenerationRows(data.datasets.publicPower, 24), [data.datasets.publicPower]);
  const comments = useMemo(() => generationComments(gen, now, intensity), [gen, now, intensity]);
  const fact = engineerFactOfTheMoment(now);
  const nonsense = nonsenseKpiOfTheDay(now);
  const isDemo = Object.values(data.datasets).some((d) => d?.origin === 'demo');

  useEffect(() => {
    if (price?.negativeNow || (price && price.today.negativeCount > 0)) achievementStore.track('negative-price-seen');
  }, [price]);

  const regime = priceRegime(price?.current?.value ?? null);
  const priceCaption =
    regime === 'negative'
      ? pickMessage('priceNegative', { seed: `p-${slot}`, intensity: intensity === 'professional' ? 'engineer' : intensity })
      : regime === 'high'
        ? pickCaption('priceHigh', 'priceNeutral', { seed: `p-${slot}`, intensity })
        : regime === 'low'
          ? pickCaption('priceLow', 'priceNeutral', { seed: `p-${slot}`, intensity })
          : pickCaption('price', 'priceNeutral', { seed: `p-${slot}`, intensity });
  const eeCaption = pickCaption('renewables', 'renewablesNeutral', { seed: `ee-${slot}`, intensity });
  const pvNight = gen ? isNight(gen.t) && (gen.solarMw ?? 0) <= 50 : isNight(now);
  const pvCaption = pvNight ? pickMessage('solarNight', { seed: `pv-${slot}`, intensity: intensity === 'professional' ? 'professional' : intensity }) : pickCaption('solarDay', 'solarNeutral', { seed: `pv-${slot}`, intensity });
  const windCaption = gen && gen.windTotalMw !== null && gen.windTotalMw < 5000 ? pickCaption('windLow', 'windNeutral', { seed: `w-${slot}`, intensity }) : pickCaption('windHigh', 'windNeutral', { seed: `w-${slot}`, intensity });
  const bureaucracySubtitle = BUREAUCRACY_SUBTITLES[hashString(`b-${bureaucracy.dayKey}`) % BUREAUCRACY_SUBTITLES.length];
  const todayPriceSpark = price?.today.points.filter((p) => p.value !== null).map((p) => ({ t: p.t, v: p.value as number })) ?? [];

  const loading = data.status === 'loading' || data.status === 'idle';
  const noData = data.status === 'error' && !Object.keys(data.datasets).length;

  return (
    <div className="space-y-4">
      <SectionTitle title="Leitwarte" subtitle={mgmt ? 'Strategic Grid Intelligence Overview' : 'German Grid Emotional Support System'} />

      {noData && (
        <Card className="border-amber/40">
          <CardHeader title={errorHeadline(data.errors[0]?.status, data.offline)} subtitle="Aktuelle Daten konnten nicht geladen werden." />
          <div className="mt-3">
            <DataStatusPanel />
          </div>
          <p className="mt-3 text-xs text-text-3">Alternativ kann in den Einstellungen der Demo-Modus mit klar gekennzeichneten Beispieldaten aktiviert werden.</p>
          <button type="button" className="btn btn-sm mt-2" onClick={() => onNavigate('more', 'settings')}>
            Zu den Einstellungen <ArrowRight size={14} aria-hidden="true" />
          </button>
        </Card>
      )}

      {loading && !Object.keys(data.datasets).length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <FrequencyHero onOpenMonitor={() => onNavigate('lab', 'frequency')} />
            <PanicGauge panic={panic} />
          </div>

          <ManagementPanel />

          <IncidentTicker incidents={incidents} />

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Day-Ahead-Preis"
              managementLabel={mgmt ? 'Dynamic Market Opportunity Index' : undefined}
              value={price?.current?.value ?? null}
              format={(v) => formatPrice(v)}
              accent={regime === 'negative' ? 'green' : regime === 'high' ? 'amber' : 'text'}
              highlight={regime === 'negative'}
              caption={priceCaption?.title}
              demo={isDemo}
              meta={price?.current ? `Intervall ${formatBerlinTime(price.current.start)}–${formatBerlinTime(price.current.end)} Uhr · DE-LU · ${formatCtPerKwh(price.current.value)}` : 'Kein Preis für das aktuelle Intervall'}
              info={{
                title: 'Was bedeutet der Day-Ahead-Preis?',
                body: (
                  <>
                    <p>Der Day-Ahead-Preis ist der Großhandelspreis, der am Vortag in der Strombörsen-Auktion für jedes Viertelstunden-Intervall des Folgetages ermittelt wird (Gebotszone Deutschland/Luxemburg).</p>
                    <p>Er ist <strong>nicht</strong> der Haushaltsstrompreis: Dort kommen Netzentgelte, Steuern, Abgaben und die Marge des Versorgers hinzu. 1 €/MWh entspricht 0,1 ct/kWh.</p>
                    <p>Negative Preise bedeuten, dass Erzeuger dafür zahlen, einspeisen zu dürfen – Haushaltsstrom wird dadurch nicht kostenlos.</p>
                  </>
                ),
              }}
              testId="kpi-price"
            >
              {todayPriceSpark.length > 2 && <Sparkline points={todayPriceSpark} width={200} height={34} reference={0} stroke={regime === 'negative' ? 'var(--c-green)' : 'var(--c-cyan)'} className="w-full" />}
            </KpiCard>

            <KpiCard
              label="Erneuerbaren-Anteil"
              managementLabel={mgmt ? 'Green Transformation Success Indicator' : undefined}
              value={gen?.renewableShareOfLoad ?? null}
              format={(v) => formatPercent(v)}
              accent={gen && gen.renewableShareOfLoad !== null && gen.renewableShareOfLoad >= 65 ? 'green' : 'text'}
              caption={eeCaption?.title}
              demo={isDemo}
              meta={gen ? `Anteil an der Last · Stand ${formatBerlinTime(gen.t)} Uhr (${formatAge(gen.ageMs)})` : 'Keine Erzeugungsdaten'}
              info={{
                title: 'Erneuerbaren-Anteil an der Last',
                body: (
                  <>
                    <p>Anteil der erneuerbaren öffentlichen Nettostromerzeugung (Wind, PV, Wasserkraft, Biomasse, Geothermie) an der Last (Stromverbrauch) in Deutschland, wie von Energy-Charts berechnet.</p>
                    <p>Die Bezugsgröße ist entscheidend: Ein Anteil an der <strong>Erzeugung</strong> wäre eine andere Zahl, weil Importe, Exporte und Speicherladung die Last von der Erzeugung unterscheiden.</p>
                  </>
                ),
              }}
              testId="kpi-renewables"
            />

            <KpiCard
              label="Photovoltaik"
              managementLabel={mgmt ? 'Solar Value Stream' : undefined}
              value={gen?.solarMw ?? null}
              format={(v) => formatPower(v)}
              accent={gen && (gen.solarMw ?? 0) > 15_000 ? 'amber' : 'text'}
              caption={pvCaption?.title}
              demo={isDemo}
              meta={gen ? `Öffentliche Nettoerzeugung · ${formatBerlinTime(gen.t)} Uhr` : 'Keine Erzeugungsdaten'}
              info={{
                title: 'Photovoltaik-Erzeugung',
                body: (
                  <>
                    <p>Öffentliche Nettoerzeugung aus Photovoltaik in Deutschland, 15-Minuten-Mittelwert. Nachts ist der Wert tatsächlich 0 – das ist eine Messung, kein fehlender Wert.</p>
                    <p>Die Erzeugungsdaten werden mit etwa ein bis zwei Stunden Verzögerung veröffentlicht; der Zeitstempel zeigt den Stand der Daten.</p>
                  </>
                ),
              }}
              testId="kpi-solar"
            />

            <KpiCard
              label="Windenergie"
              managementLabel={mgmt ? 'Atmospheric Synergy Output' : undefined}
              value={gen?.windTotalMw ?? null}
              format={(v) => formatPower(v)}
              accent="cyan"
              caption={windCaption?.title}
              demo={isDemo}
              meta={gen ? `Onshore ${formatPower(gen.windOnshoreMw)} · Offshore ${formatPower(gen.windOffshoreMw)} · ${formatBerlinTime(gen.t)} Uhr` : 'Keine Erzeugungsdaten'}
              info={{
                title: 'Windenergie',
                body: (
                  <>
                    <p>Summe der öffentlichen Nettoerzeugung aus Wind Onshore und Wind Offshore. Die Aufteilung steht in der Metazeile.</p>
                    <p>Windprognosen und Realität weichen regelmäßig voneinander ab – deshalb gibt es Intraday-Handel und Regelenergie.</p>
                  </>
                ),
              }}
              testId="kpi-wind"
            />

            <KpiCard
              label="Bürokratie-Index"
              managementLabel={mgmt ? 'Governance Maturity Level' : undefined}
              value={bureaucracy.value}
              format={(v) => `${formatNumber(v, 0)} / 100`}
              accent="purple"
              satire
              caption={bureaucracySubtitle}
              meta="Deterministisch aus Kalender und Uhrzeit berechnet. Bedeutet nichts."
              info={{
                title: 'Bürokratie-Index',
                body: (
                  <>
                    <p>Ein ausdrücklich satirischer Wert von 0 bis 100 – aus Wochentag, Uhrzeit und Datum deterministisch „berechnet“. Er hat keinerlei Bezug zu Messwerten.</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {bureaucracy.factors.map((f) => (
                        <li key={f.label}>
                          {f.label}: {f.delta > 0 ? '+' : ''}
                          {f.delta}
                        </li>
                      ))}
                    </ul>
                  </>
                ),
              }}
              testId="kpi-bureaucracy"
            />

            <Card className="flex min-h-[150px] flex-col" data-testid="kpi-nonsense">
              <div className="flex items-start justify-between gap-2">
                <div className="label-caps">Quatsch-KPI des Tages</div>
                <SatireTag />
              </div>
              <div className="mt-2 font-display text-sm font-semibold text-text">{nonsense.label}</div>
              <div className="readout mt-1 text-[1.75rem] font-semibold leading-none text-purple">
                {formatNumber(nonsense.value, 0)} <span className="text-base text-text-3">{nonsense.unit}</span>
              </div>
              <p className="mt-auto pt-2 text-xs text-text-2">{nonsense.note}</p>
            </Card>
          </div>

          <Card data-testid="main-chart">
            <CardHeader
              title={mgmt ? 'Generation Portfolio Performance' : 'Erzeugungsmix – letzte 24 h'}
              subtitle={gen ? `Öffentliche Nettoerzeugung nach Energieträgern in GW, Stand ${formatBerlinTime(gen.t)} Uhr` : 'Öffentliche Nettoerzeugung nach Energieträgern'}
              right={
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('generation')}>
                  Details <ArrowRight size={14} aria-hidden="true" />
                </button>
              }
            />
            <div className="mt-3 -ml-2">
              <GenerationChart rows={recentRows} height={240} moreGreen={settings.moreGreen} />
            </div>
            <div className="mt-2">
              <GenerationLegend moreGreen={settings.moreGreen} />
            </div>
            {comments.length > 0 && settings.humor !== 'professional' && (
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-text-2">
                {comments.slice(0, 2).map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" aria-hidden="true" />
                    {c.message.title}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <IncidentList incidents={incidents} limit={6} />
            <div className="space-y-3">
              <DefconMonitor compact />
              <Card data-testid="engineer-fact">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan/40 bg-cyan/10 text-cyan">
                    <Lightbulb size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="label-caps">Ingenieur-Fakt · {fact.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-text-2">{fact.text}</p>
                  </div>
                </div>
              </Card>
              <DailySummary />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Automatically generated satirical situation report for the day – based on real values. */
function DailySummary() {
  const data = useGridData();
  const now = useNow(60_000);
  const settings = useSettings();
  const price = useMemo(() => getPriceOverview(data.datasets.price, now), [data.datasets.price, now]);
  const gen = useMemo(() => getGenerationStatus(data.datasets.publicPower, now), [data.datasets.publicPower, now]);
  const quote = pickMessage('dailySummary', { seed: `summary-${rotationSlot(now, 60)}`, intensity: settings.humor === 'professional' ? 'engineer' : settings.humor });
  const parts: string[] = [];
  if (price?.today.avg !== null && price?.today.avg !== undefined) parts.push(`Day-Ahead heute im Mittel ${formatPrice(price.today.avg, 0)} (${formatPrice(price.today.min, 0)} bis ${formatPrice(price.today.max, 0)})`);
  if (price && price.today.negativeCount > 0) parts.push(`${price.today.negativeCount} negative Intervalle`);
  if (gen?.renewableShareOfLoad !== null && gen?.renewableShareOfLoad !== undefined) parts.push(`EE-Anteil an der Last zuletzt ${formatPercent(gen.renewableShareOfLoad, 0)}`);
  if (gen?.windTotalMw !== null && gen?.windTotalMw !== undefined) parts.push(`Wind ${formatPower(gen.windTotalMw)}`);
  return (
    <Card data-testid="daily-summary">
      <div className="label-caps">Tageszusammenfassung</div>
      <p className="mt-1 text-sm text-text-2">{parts.length ? `${parts.join(', ')}.` : 'Noch keine Daten für eine Zusammenfassung.'}</p>
      {settings.humor !== 'professional' && quote && (
        <p className="mt-2 flex items-start gap-2 font-display text-sm italic text-text">
          <SatireTag />
          „{quote.title}“
        </p>
      )}
    </Card>
  );
}
