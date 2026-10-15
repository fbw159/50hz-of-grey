import { RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { DEFAULT_SETTINGS, settingsStore, useSettings, type MotionPreference } from './settingsStore';
import type { HumorIntensity } from '@/data/jokes';
import { achievementStore } from '@/features/achievements/achievementStore';
import { clearCachedDatasets } from '@/services/dataCache';
import { showSnack } from '@/hooks/useSnackbar';

const HUMOR_LEVELS: { id: HumorIntensity; label: string; description: string }[] = [
  { id: 'professional', label: 'Professional', description: 'Überwiegend seriöse technische Beschriftungen, wenige Witze.' },
  { id: 'engineer', label: 'Engineer', description: 'Ausgewogene Mischung aus echten Daten und trockenem Ingenieurhumor.' },
  { id: 'unhinged', label: 'Completely Unhinged', description: 'Maximal überdramatische Kommentare und satirische Zusatzanzeigen.' },
];

const MOTION: { id: MotionPreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'reduce', label: 'Reduziert' },
  { id: 'full', label: 'Voll' },
];

export function SettingsPanel() {
  const s = useSettings();
  return (
    <div className="space-y-3" data-testid="settings-panel">
      <Card>
        <CardHeader title="Darstellung" />
        <div className="mt-2 divide-y divide-border">
          <Switch id="set-light" label="Light Mode" description="Standard ist das dunkle Leitwarten-Theme." checked={s.theme === 'light'} onChange={(v) => settingsStore.set('theme', v ? 'light' : 'dark')} disabled={s.retroScada} />
          <Switch id="set-retro" label="Retro-SCADA-Modus" description="Grüne Monospace-Schrift, Terminal-Optik. Auch per Konami-Code." checked={s.retroScada} onChange={(v) => { settingsStore.set('retroScada', v); if (v) achievementStore.track('retro'); }} />
          <Switch id="set-mgmt" label="Management-Modus" description="Less engineering. More PowerPoint." checked={s.managementMode} onChange={(v) => { settingsStore.update({ managementMode: v, moreGreen: v ? s.moreGreen : false }); if (v) achievementStore.track('management-on'); }} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Bewegung & Ton" />
        <div className="mt-2 divide-y divide-border">
          <Switch id="set-anim" label="Animationen" description="Zähler, Ticker, Übergänge, Konfetti." checked={s.animations} onChange={(v) => settingsStore.set('animations', v)} />
          <div className="py-3">
            <div className="text-sm font-medium text-text">Reduzierte Bewegung</div>
            <div className="mb-2 text-xs text-text-2">„System“ folgt der Einstellung des Betriebssystems (prefers-reduced-motion).</div>
            <div className="flex gap-1" role="radiogroup" aria-label="Reduzierte Bewegung">
              {MOTION.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={s.motion === m.id} className="chip flex-1 justify-center" onClick={() => settingsStore.set('motion', m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Switch id="set-sound" label="Sounds" description="Kurze, leise Signaltöne bei Achievements und Aktionen. Niemals automatisch." checked={s.sounds} onChange={(v) => settingsStore.set('sounds', v)} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Humor-Intensität" subtitle="Die echten Messwerte ändern sich zwischen den Stufen niemals." />
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Humor-Intensität">
          {HUMOR_LEVELS.map((h) => (
            <button key={h.id} type="button" role="radio" aria-checked={s.humor === h.id} onClick={() => settingsStore.set('humor', h.id)} className={`block w-full rounded-lg border px-3 py-2 text-left transition-colors ${s.humor === h.id ? 'border-cyan/60 bg-cyan/10' : 'border-border hover:bg-elevated'}`} data-testid={`humor-${h.id}`}>
              <div className="text-sm font-medium text-text">{h.label}</div>
              <div className="text-xs text-text-2">{h.description}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Daten" />
        <div className="mt-2 divide-y divide-border">
          <Switch id="set-demo" label="Demo-Modus (simulierte Daten)" description="Plausible Beispieldaten, überall als DEMO gekennzeichnet. Echte Daten werden nie stillschweigend ersetzt." checked={s.demoMode} onChange={(v) => settingsStore.set('demoMode', v)} />
          <div className="flex flex-wrap gap-2 py-3">
            <button type="button" className="btn btn-sm" onClick={() => { clearCachedDatasets(); showSnack('Lokaler Daten-Cache gelöscht.', { tone: 'success' }); }}>
              <Trash2 size={14} aria-hidden="true" /> Daten-Cache löschen
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { achievementStore.reset(); showSnack('Achievements zurückgesetzt. Die Elektronen haben nichts gesehen.', { tone: 'info' }); }}>
              <Trash2 size={14} aria-hidden="true" /> Achievements zurücksetzen
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { settingsStore.update({ ...DEFAULT_SETTINGS, introSeen: true }); showSnack('Einstellungen zurückgesetzt.', { tone: 'info' }); }}>
              <RotateCcw size={14} aria-hidden="true" /> Einstellungen zurücksetzen
            </button>
          </div>
        </div>
        <p className="text-[11px] text-text-3">Alle Einstellungen bleiben nur lokal im Browser (localStorage). Kein Konto, keine Übertragung.</p>
      </Card>
    </div>
  );
}
