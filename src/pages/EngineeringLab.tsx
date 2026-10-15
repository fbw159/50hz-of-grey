import { Activity, Gavel, Shuffle, Waves } from 'lucide-react';
import { SectionTitle } from '@/components/ui/Card';
import { FrequencyMonitor } from '@/features/frequency/FrequencyMonitor';
import { GridChaosEngine } from '@/features/simulations/GridChaosEngine';
import { ReactivePowerAgency } from '@/features/simulations/ReactivePowerAgency';
import { RedispatchGenerator } from '@/features/simulations/RedispatchGenerator';
import { DoNotPress } from '@/features/easterEggs/EasterEggs';
import { routeHref } from '@/hooks/useHashRoute';

type Tab = 'frequency' | 'chaos' | 'reactive' | 'redispatch';

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'frequency', label: 'Frequenz-Monitor', icon: Activity },
  { id: 'chaos', label: 'Chaos Engine', icon: Waves },
  { id: 'reactive', label: 'Blindleistung', icon: Gavel },
  { id: 'redispatch', label: 'Redispatch', icon: Shuffle },
];

interface Props {
  sub: string | null;
}

export default function EngineeringLab({ sub }: Props) {
  const tab: Tab = TABS.some((t) => t.id === sub) ? (sub as Tab) : 'frequency';
  return (
    <div className="space-y-4">
      <SectionTitle title="Engineering Disaster Lab" subtitle="Simulationen, die niemand beim TÜV angemeldet hat. Alles läuft lokal im Browser." />
      <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2" role="tablist" aria-label="Labor-Bereiche">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <a key={t.id} href={routeHref('lab', t.id)} role="tab" aria-selected={tab === t.id} className="chip" data-testid={`lab-tab-${t.id}`}>
                <Icon size={14} aria-hidden="true" />
                {t.label}
              </a>
            );
          })}
        </div>
      </div>
      {tab === 'frequency' && <FrequencyMonitor />}
      {tab === 'chaos' && <GridChaosEngine />}
      {tab === 'reactive' && <ReactivePowerAgency />}
      {tab === 'redispatch' && <RedispatchGenerator />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <DoNotPress />
        <p className="text-sm text-text-3">
          Alle Simulationen sind stark vereinfachte Lehrmodelle und arbeiten vollständig lokal. Keine Aktion in diesem Labor hat Auswirkungen auf echte Netze, Messwerte oder Daten – auch nicht der rote Knopf.
        </p>
      </div>
    </div>
  );
}
