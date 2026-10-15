import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Sidebar } from '@/components/navigation/Sidebar';
import { SnackbarHost } from '@/components/ui/Snackbar';
import { Confetti } from '@/components/animations/Confetti';
import { Intro } from '@/components/animations/Intro';
import { KpiSkeleton } from '@/components/ui/Skeleton';
import { ManagementTransition } from '@/features/management/ManagementTransition';
import { ShareSheet } from '@/features/share/ShareSheet';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useConfettiBurst } from '@/hooks/useConfetti';
import { useKonami } from '@/hooks/useKonami';
import { showSnack } from '@/hooks/useSnackbar';
import { useSettings, settingsStore, prefersReducedMotion, animationsEnabled } from '@/features/settings/settingsStore';
import { achievementStore } from '@/features/achievements/achievementStore';
import { usePanicIndex } from '@/features/panic/usePanicIndex';
import { playSound } from '@/lib/sounds';

const ControlRoom = lazy(() => import('@/pages/ControlRoom'));
const Market = lazy(() => import('@/pages/Market'));
const Generation = lazy(() => import('@/pages/Generation'));
const EngineeringLab = lazy(() => import('@/pages/EngineeringLab'));
const More = lazy(() => import('@/pages/More'));

function PageFallback() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Lädt">
      <KpiSkeleton />
      <KpiSkeleton />
      <KpiSkeleton />
    </div>
  );
}

export default function App() {
  const settings = useSettings();
  const { route, navigate } = useHashRoute();
  const burst = useConfettiBurst();
  const { panic } = usePanicIndex();
  const [shareOpen, setShareOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !settings.introSeen && !prefersReducedMotion(settingsStore.getState()));
  const [transition, setTransition] = useState(false);

  // theme + motion classes on <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-dark', 'theme-light', 'theme-retro');
    html.classList.add(settings.retroScada ? 'theme-retro' : settings.theme === 'light' ? 'theme-light' : 'theme-dark');
    html.classList.toggle('no-motion', !animationsEnabled(settings));
    html.classList.toggle('force-motion', settings.motion === 'full' && settings.animations);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.retroScada ? '#020804' : settings.theme === 'light' ? '#eef2f7' : '#090D14');
  }, [settings]);

  // achievements → snackbars
  useEffect(() => {
    const off = achievementStore.onUnlock((def) => {
      showSnack(`${def.title} – ${def.description}`, { tone: 'success', label: 'Achievement', durationMs: 5000 });
      if (settingsStore.getState().sounds) playSound('success');
    });
    achievementStore.track('app-open');
    return off;
  }, []);

  // scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.page]);

  const toggleRetro = useCallback(() => {
    const next = !settingsStore.getState().retroScada;
    settingsStore.set('retroScada', next);
    if (next) achievementStore.track('retro');
    achievementStore.track('konami');
    showSnack(next ? 'RETRO-SCADA-MODUS AKTIVIERT. BITTE MONITOR ENTSTAUBEN.' : 'Retro-SCADA-Modus beendet. Willkommen zurück in der Gegenwart.', { tone: 'info' });
  }, []);
  useKonami(toggleRetro);

  const toggleManagement = useCallback(() => {
    const next = !settingsStore.getState().managementMode;
    if (next) {
      setTransition(true);
      achievementStore.track('management-on');
      if (settingsStore.getState().sounds) playSound('alert');
    } else {
      settingsStore.update({ managementMode: false, moreGreen: false });
      showSnack('Management Mode™ beendet. Die Physik hat wieder das Wort.', { tone: 'info' });
    }
  }, []);

  const finishTransition = useCallback(() => {
    settingsStore.set('managementMode', true);
    setTransition(false);
  }, []);

  const finishIntro = useCallback(() => {
    settingsStore.set('introSeen', true);
    setShowIntro(false);
  }, []);

  let page;
  switch (route.page) {
    case 'market':
      page = <Market />;
      break;
    case 'generation':
      page = <Generation />;
      break;
    case 'lab':
      page = <EngineeringLab sub={route.sub} />;
      break;
    case 'more':
      page = <More sub={route.sub} onNavigate={navigate} />;
      break;
    default:
      page = <ControlRoom onNavigate={navigate} />;
  }

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      {animationsEnabled(settings) && !settings.retroScada && <div className="scanline hidden md:block" aria-hidden="true" />}
      <div className="relative z-10 flex min-h-dvh">
        <Sidebar active={route.page} onNavigate={navigate} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onShare={() => setShareOpen(true)} onToggleManagement={toggleManagement} />
          <main className="pb-nav mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 md:pb-10" id="main">
            <Suspense fallback={<PageFallback />}>{page}</Suspense>
          </main>
        </div>
      </div>
      <BottomNav active={route.page} onNavigate={navigate} />
      <SnackbarHost />
      <Confetti burst={burst} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} panicValue={panic?.value ?? null} />
      <ManagementTransition active={transition} onDone={finishTransition} />
      {showIntro && <Intro onDone={finishIntro} />}
    </>
  );
}
