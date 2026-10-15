import { useEffect, useMemo, useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { OriginTag, SatireTag, DemoTag } from '@/components/ui/Tags';
import { NumberTicker } from '@/components/animations/NumberTicker';
import { PriceChart } from '@/components/charts/PriceChart';
import { MeritOrderExplainer } from '@/features/prices/MeritOrderExplainer';
import { getPriceOverview, priceRegime, HIGH_PRICE_THRESHOLD, type DayPriceStats } from '@/features/prices/priceMetrics';
import { achievementStore } from '@/features/achievements/achievementStore';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { fireConfetti } from '@/hooks/useConfetti';
import { showSnack } from '@/hooks/useSnackbar';
import { useSettings, animationsEnabled } from '@/features/settings/settingsStore';
import { addDaysToKey, berlinDayKey, formatAge, formatBerlinTime, relativeDayLabel } from '@/lib/dateUtils';
import { formatCtPerKwh, formatDurationMinutes, formatPrice } from '@/lib/formatters';
import { pickMessage, rotationSlot } from '@/lib/humorEngine';
import { playSound } from '@/lib/sounds';

type DayChoice = 'yesterday' | 'today' | 'tomorrow';

export default function Market() {
  const data = useGridData();
  const now = useNow(30_000);
  const settings = useSettings();
  const price = useMemo(() => getPriceOverview(data.datasets.price, now), [data.datasets.price, now]);
  const [day, setDay] = useState<DayChoice>('today');
  const [party, setParty] = useState(false);
  const todayKey = berlinDayKey(now);
  const isDemo = data.datasets.price?.origin === 'demo';
  const slot = rotationSlot(now, 10);

  useEffect(() => {
    if (price?.negativeNow || (price && price.today.negativeCount > 0)) achievementStore.track('negative-price-seen');
  }, [price]);

  const stats: DayPriceStats | null = !price ? null : day === 'today' ? price.today : day === 'yesterday' ? price.yesterday : price.tomorrow;
  const dayKey = day === 'today' ? todayKey : day === 'yesterday' ? addDaysToKey(todayKey, -1) : addDaysToKey(todayKey, 1);
  const regime = priceRegime(price?.current?.value ?? null);
  const negativeCaption = pickMessage('priceNegative', { seed: `neg-${slot}`, intensity: 'unhinged' });
  const oracleCategory = regime === 'high' ? 'oracleHigh' : regime === 'negative' ? 'oracleNegative' : regime === 'low' ? 'oracleLow' : 'oracleNormal';
  const oracle = pickMessage(oracleCategory, { seed: `oracle-${slot}`, intensity: 'unhinged' });

  const startParty = () => {
    setParty(true);
    fireConfetti();
    achievementStore.track('party');
    if (settings.sounds) playSound('party');
    showSnack('HERZLICHEN GLÜCKWUNSCH! DER STROMPREIS HAT DIE NULL DURCHBROCHEN!', { tone: 'success', durationMs: 5000 });
    setTimeout(() => setParty(false), 6000);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Merit Order of Madness" subtitle="Where electricity meets questionable economics." right={price && <OriginTag origin={price.origin} />} />

      {!price ? (
        <Card>
          <CardHeader title="Keine Preisdaten geladen" subtitle="Die Datenquelle ist kurz in die Dunkelflaute geraten." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card elevated glow={regime === 'negative'} className={`${party && animationsEnabled(settings) ? 'wobble' : ''}`} data-testid="current-price-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {settings.managementMode && <div className="font-display text-xs font-semibold text-purple">Dynamic Market Opportunity Index</div>}
                  <div className="label-caps">Day-Ahead-Preis · aktuelles Intervall</div>
                </div>
                <div className="flex items-center gap-1">
                  {isDemo && <DemoTag />}
                  <InfoButton title="Day-Ahead-Preis (DE-LU)">
                    <p>Großhandelspreis der Day-Ahead-Auktion für die Gebotszone Deutschland/Luxemburg, in {price.intervalMs === 15 * 60_000 ? '15-Minuten' : `${Math.round(price.intervalMs / 60_000)}-Minuten`}-Intervallen. Datenquelle: Energy-Charts (Bundesnetzagentur | SMARD.de), {price.license ?? 'CC BY 4.0'}.</p>
                    <p>Der Wert ist kein Haushaltsstrompreis. 1 €/MWh = 0,1 ct/kWh.</p>
                  </InfoButton>
                </div>
              </div>
              <div className={`mt-3 text-[2.75rem] font-bold leading-none sm:text-6xl ${regime === 'negative' ? 'glow-text text-green' : regime === 'high' ? 'text-amber' : 'text-text'}`} data-testid="current-price">
                <NumberTicker value={price.current?.value ?? null} format={(v) => formatPrice(v)} />
              </div>
              <div className="readout mt-2 text-sm text-text-2">
                {price.current ? `${formatBerlinTime(price.current.start)}–${formatBerlinTime(price.current.end)} Uhr · ${formatCtPerKwh(price.current.value)}` : 'Für das aktuelle Intervall liegt kein Preis vor.'}
              </div>
              {regime === 'negative' && settings.humor !== 'professional' && (
                <p className="mt-3 flex items-start gap-2 text-sm text-green">
                  <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {negativeCaption?.title}
                </p>
              )}
              {regime === 'high' && <p className="mt-3 text-sm text-amber">Über der selbst gewählten Schwelle von {HIGH_PRICE_THRESHOLD} €/MWh.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={`btn ${regime === 'negative' ? 'btn-success' : ''}`} onClick={startParty} data-testid="party-button">
                  <PartyPopper size={16} aria-hidden="true" /> NEGATIVE PRICE PARTY STARTEN
                </button>
              </div>
              {party && <p className="mt-2 text-xs text-text-2">Die Elektronen haben jetzt einen negativen Marktwert. Bitte informieren Sie das Controlling, dass negative Zahlen erlaubt sind.</p>}
              <p className="mt-3 font-mono text-[10px] text-text-3">Datenstand {price.availableUntil ? `bis ${formatBerlinTime(price.availableUntil)} Uhr` : '–'} · abgerufen {formatAge(now - (data.datasets.price?.fetchedAt ?? now))}</p>
            </Card>

            <Card data-testid="price-oracle">
              <CardHeader title="Strompreis-Orakel" subtitle="Managementempfehlungen aus tatsächlichen Preiswerten" right={<SatireTag />} />
              <div className="mt-3 rounded-lg border border-purple/30 bg-purple/8 p-3">
                <div className="label-caps text-purple">Preisregime: {regime === 'negative' ? 'negativ' : regime === 'high' ? 'hoch' : regime === 'low' ? 'niedrig' : regime === 'normal' ? 'normal' : 'unbekannt'}</div>
                <p className="mt-1 font-display text-base font-semibold text-text">{oracle?.title ?? 'Empfehlung: Arbeitsgruppe gründen.'}</p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Stat label="Tagesminimum" value={formatPrice(price.today.min)} sub={price.today.minT ? `${formatBerlinTime(price.today.minT)} Uhr` : ''} />
                <Stat label="Tagesmaximum" value={formatPrice(price.today.max)} sub={price.today.maxT ? `${formatBerlinTime(price.today.maxT)} Uhr` : ''} />
                <Stat label="Tagesdurchschnitt" value={formatPrice(price.today.avg)} sub={`${price.today.count} von ${price.today.expectedCount} Intervallen`} />
                <Stat label="Negative Intervalle" value={`${price.today.negativeCount}`} sub={price.today.negativeCount ? formatDurationMinutes(price.today.negativeMinutes) : 'keine'} accent={price.today.negativeCount > 0 ? 'text-green' : ''} />
              </dl>
              {price.tomorrowPublished ? (
                <p className="mt-3 text-xs text-text-2">Morgen: Ø {formatPrice(price.tomorrow?.avg, 0)}, {formatPrice(price.tomorrow?.min, 0)} bis {formatPrice(price.tomorrow?.max, 0)}, {price.tomorrow?.negativeCount ?? 0} negative Intervalle.</p>
              ) : (
                <p className="mt-3 text-xs text-text-3">Der Markt hat die morgigen Preise noch nicht verraten. (Veröffentlichung meist gegen 13 Uhr.)</p>
              )}
            </Card>
          </div>

          <Card data-testid="price-chart-card">
            <CardHeader title="Preisverlauf" subtitle={`${relativeDayLabel(dayKey, now)} · ${price.intervalMs === 15 * 60_000 ? '15-Minuten-Intervalle' : 'Stundenintervalle'} · EUR/MWh`} />
            <div className="scroll-x mt-3 flex gap-1" role="tablist" aria-label="Tag wählen">
              {(['yesterday', 'today', 'tomorrow'] as DayChoice[]).map((d) => {
                const disabled = d === 'tomorrow' && !price.tomorrowPublished;
                return (
                  <button key={d} type="button" role="tab" aria-selected={day === d} className="chip" disabled={disabled} onClick={() => !disabled && setDay(d)} title={disabled ? 'Der Markt hat die morgigen Preise noch nicht verraten.' : undefined} data-testid={`day-${d}`}>
                    {d === 'yesterday' ? 'Gestern' : d === 'today' ? 'Heute' : 'Morgen'}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 -ml-2">
              {stats ? <PriceChart points={stats.points} currentStart={day === 'today' ? (price.current?.start ?? null) : null} dayLabel={relativeDayLabel(dayKey, now)} moreGreen={settings.moreGreen} /> : <div className="flex h-[220px] items-center justify-center text-sm text-text-3">Der Markt hat die morgigen Preise noch nicht verraten.</div>}
            </div>
            {stats && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Minimum" value={formatPrice(stats.min)} sub={stats.minT ? `${formatBerlinTime(stats.minT)} Uhr` : ''} />
                <Stat label="Maximum" value={formatPrice(stats.max)} sub={stats.maxT ? `${formatBerlinTime(stats.maxT)} Uhr` : ''} />
                <Stat label="Durchschnitt" value={formatPrice(stats.avg)} sub={`${stats.count}/${stats.expectedCount} Intervalle`} />
                <Stat label="Negativ" value={`${stats.negativeCount} Intervalle`} sub={stats.negativeCount ? `${formatDurationMinutes(stats.negativeMinutes)} · min. ${formatPrice(stats.min)}` : 'keine'} accent={stats.negativeCount > 0 ? 'text-green' : ''} />
              </div>
            )}
            {stats && stats.negativeRuns.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-text-2">
                {stats.negativeRuns.map((r) => (
                  <li key={r.start} className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
                    Negative Phase {formatBerlinTime(r.start)}–{formatBerlinTime(r.end)} Uhr ({formatDurationMinutes((r.count * price.intervalMs) / 60_000)}, Minimum {formatPrice(r.minValue)})
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-text-3">Quelle: Energy-Charts (Fraunhofer ISE) – {price.license ?? 'CC BY 4.0'}. Day-Ahead-Großhandelspreise, Gebotszone DE-LU. Grün = negativ, Bernstein = über {HIGH_PRICE_THRESHOLD} €/MWh, Weiß = aktuelles Intervall.</p>
          </Card>

          <MeritOrderExplainer />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, accent = '' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-[11px] text-text-3">{label}</dt>
      <dd className={`readout text-base font-semibold ${accent || 'text-text'}`}>{value}</dd>
      {sub && <dd className="text-[11px] text-text-3">{sub}</dd>}
    </div>
  );
}
