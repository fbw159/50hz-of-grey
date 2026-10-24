import { useEffect, useMemo } from 'react';
import { useGridData, refreshGridData, setDemoMode } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { showToast } from '@/hooks/useToast';
import { buildView, slotOf, type GridView } from '@/logic/view';
import { INDEX_NAME, MOODS } from '@/content/texts';
import { doomClockTime } from '@/logic/panic';
import { berlinDayKey, formatBerlinTime } from '@/lib/dateUtils';
import { eurPerMwhToCtPerKwh, formatNumber } from '@/lib/formatters';
import { appUrl } from '@/lib/clipboard';
import { shareText } from '@/lib/share';
import { Header } from '@/components/Header';
import { FrontPage } from '@/components/FrontPage';
import { Meters } from '@/components/Meters';
import { NetzTv } from '@/components/NetzTv';
import { WeatherCard } from '@/components/WeatherCard';
import { PriceCard } from '@/components/PriceCard';
import { MixCard } from '@/components/MixCard';
import { GameCard } from '@/components/GameCard';
import { FactCard } from '@/components/FactCard';
import { ProfileCard } from '@/components/ProfileCard';
import { Footer } from '@/components/Footer';
import { Toast } from '@/components/Toast';
import { Ticker } from '@/components/Ticker';
import { KillSwitch } from '@/components/KillSwitch';

function shareSummary(view: GridView): string {
  const parts: string[] = [];
  if (view.frequency) parts.push(`${formatNumber(view.frequency.value, 3)} Hz`);
  if (view.price?.current) parts.push(`Börsenstrom ${formatNumber(eurPerMwhToCtPerKwh(view.price.current.value), 1)} ct/kWh`);
  if (view.generation?.renewableShareOfLoad != null) parts.push(`${formatNumber(view.generation.renewableShareOfLoad, 0)} % Öko-Strom`);
  const head = view.headline
    ? `${view.headline.kicker}: ${view.headline.text}`
    : 'Wie erregt ist das Stromnetz gerade?';
  if (view.panic) parts.push(`Mr. Grey ist ${MOODS[view.panic.mood].verdict}, ${INDEX_NAME} ${view.panic.score} von 100, Weltuntergangsuhr ${doomClockTime(view.panic.score)} Uhr`);
  return parts.length ? `${head} ${parts.join(', ')}.` : head;
}

export default function App() {
  const data = useGridData();
  const now = useNow(30_000);
  const view = useMemo(() => buildView(data.datasets, now), [data.datasets, now]);
  const slot = slotOf(now);
  const demo = data.mode === 'demo';
  const headlineText = view.headline?.text;

  // the browser tab gets the tabloid headline, too
  useEffect(() => {
    document.title = headlineText ? `${headlineText} – 50 Hz of Grey` : "50 Hz of Grey – Wie geht's dem Stromnetz?";
  }, [headlineText]);

  const onShare = async () => {
    const result = await shareText('50 Hz of Grey', shareSummary(view), appUrl());
    if (result === 'copied') showToast('Link kopiert. Teile die Spannung.');
    if (result === 'failed') showToast('Teilen hat nicht geklappt.');
  };

  return (
    <>
      {demo && (
        <div className="hazard sticky top-0 z-40 p-1.5" data-testid="demo-banner">
          <div className="mx-auto flex max-w-[34rem] items-center justify-between gap-3 rounded-lg bg-[#1f1a0a] px-3 py-2 text-[0.9rem] text-[#fbe7a8]">
            <span className="font-semibold">Beispieldaten. Alles nur gespielt!</span>
            <button type="button" className="underline" onClick={() => setDemoMode(false)} data-testid="demo-off">
              Echte Daten laden
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-[34rem] px-4">
        <Header onShare={onShare} />
        <main className="space-y-4">
          <Ticker view={view} slot={slot} />
          <FrontPage view={view} status={data.status} slot={slot} onRetry={() => void refreshGridData()} onDemo={() => setDemoMode(true)} />
          <Meters view={view} />
          {!demo && data.snapshotFetchedAt && (
            <p className="px-1 text-center text-[0.8125rem] text-ink-2" data-testid="data-age">
              {data.offline ? 'Offline. ' : ''}Echte Messwerte, zuletzt abgeholt um {formatBerlinTime(data.snapshotFetchedAt)} Uhr.
            </p>
          )}
          <KillSwitch />
          <NetzTv view={view} slot={slot} />
          <PriceCard view={view} now={now} slot={slot} />
          <MixCard view={view} />
          <WeatherCard view={view} now={now} />
          <GameCard />
          <ProfileCard />
          <FactCard dayKey={berlinDayKey(now)} />
        </main>
        <Footer />
      </div>
      <Toast />
    </>
  );
}
