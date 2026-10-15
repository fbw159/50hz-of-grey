import { useState } from 'react';
import { Briefcase, ClipboardCopy, Leaf, Presentation, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { SatireTag } from '@/components/ui/Tags';
import { settingsStore, useSettings } from '@/features/settings/settingsStore';
import { achievementStore } from '@/features/achievements/achievementStore';
import { showSnack } from '@/hooks/useSnackbar';
import { copyText } from '@/lib/clipboard';
import { buildMeetingProtocol } from './meetingProtocol';

const MGMT_KPIS: { label: string; value: string }[] = [
  { label: 'Stakeholder Alignment', value: '98 %' },
  { label: 'Synergy Utilization', value: '143 %' },
  { label: 'Strategic Electron Engagement', value: '87 %' },
  { label: 'Disruption Readiness', value: '100 %' },
  { label: 'Budget Compliance', value: 'In Prüfung' },
  { label: 'PowerPoint Confidence Level', value: 'Excellent' },
  { label: 'Transformation Maturity Score', value: 'Slide 17/184' },
];

export function ManagementPanel() {
  const settings = useSettings();
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [greenMessage, setGreenMessage] = useState<string | null>(null);

  const moreGreen = () => {
    const next = !settings.moreGreen;
    settingsStore.set('moreGreen', next);
    setGreenMessage(next ? 'Die Situation wurde durch die Anpassung der Farbsättigung erheblich verbessert.' : 'Farbsättigung zurückgesetzt. Die Situation ist unverändert – war sie vorher auch.');
    showSnack(next ? 'Problem erfolgreich durch Visualisierung gelöst.' : 'Charts wieder physikalisch korrekt eingefärbt.', { tone: next ? 'success' : 'info' });
  };

  const crisisMeeting = () => {
    setMeetingOpen(true);
    achievementStore.track('crisis-meeting');
  };

  const copyProtocol = async () => {
    const ok = await copyText(buildMeetingProtocol(Date.now()));
    showSnack(ok ? 'Meeting-Protokoll kopiert. Bitte an alle 27 Teilnehmer weiterleiten.' : 'Kopieren nicht möglich.', { tone: ok ? 'success' : 'warning' });
  };

  if (!settings.managementMode) return null;

  return (
    <Card className="border-purple/40" data-testid="management-panel">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Briefcase size={16} className="text-purple" aria-hidden="true" /> MANAGEMENT MODE™
          </span>
        }
        subtitle="Less engineering. More PowerPoint. Die echten Messwerte bleiben unverändert."
        right={<SatireTag>Satire</SatireTag>}
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {MGMT_KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-purple/30 bg-purple/8 px-3 py-2">
            <div className="truncate text-[11px] text-text-2">{k.label}</div>
            <div className="readout text-lg font-semibold text-purple">{k.value}</div>
          </div>
        ))}
        <div className="rounded-lg border border-purple/30 bg-purple/8 px-3 py-2">
          <div className="truncate text-[11px] text-text-2">Green Chart Saturation</div>
          <div className="readout text-lg font-semibold text-purple">{settings.moreGreen ? 'Maximal' : 'Ausbaufähig'}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" className={`btn flex-1 ${settings.moreGreen ? 'btn-success' : 'btn-primary'}`} onClick={moreGreen} data-testid="more-green">
          <Leaf size={16} aria-hidden="true" />
          {settings.moreGreen ? 'Grün wieder reduzieren' : 'MEHR GRÜN IN DEN CHARTS'}
        </button>
        <button type="button" className="btn flex-1" onClick={crisisMeeting} data-testid="crisis-meeting">
          <Presentation size={16} aria-hidden="true" />
          KRISENMEETING EINBERUFEN
        </button>
      </div>
      {greenMessage && <p className="mt-3 text-sm text-green">{greenMessage}</p>}
      {settings.moreGreen && (
        <div className="mt-3 space-y-1.5" aria-hidden="true">
          {['Strategische Zielerreichung', 'Transformationsfortschritt', 'Stakeholder-Zufriedenheit'].map((l, i) => (
            <div key={l} className="flex items-center gap-2 text-[11px] text-text-2">
              <span className="w-40 truncate">{l}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                <span className="block h-full rounded-full bg-green" style={{ width: `${92 + i * 3}%` }} />
              </span>
              <span className="readout text-green">{92 + i * 3} %</span>
            </div>
          ))}
          <p className="text-[11px] text-text-3">Dekorative Fortschrittsindikatoren. Sie bedeuten nichts. Das ist der Punkt.</p>
        </div>
      )}
      <Sheet open={meetingOpen} onClose={() => setMeetingOpen(false)} title="Meeting-Einladung" size="sm">
        <div className="space-y-2 text-sm" data-testid="meeting-invite">
          <div className="flex items-center gap-2 text-purple">
            <Users size={16} aria-hidden="true" /> <SatireTag>Fiktive Einladung</SatireTag>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-text-2 [&_dt]:text-text-3">
            <dt>Betreff</dt>
            <dd className="text-text">„Strategische Abstimmung zur netzseitigen Gesamtsituation“</dd>
            <dt>Teilnehmer</dt>
            <dd className="text-text">27</dd>
            <dt>Dauer</dt>
            <dd className="text-text">120 Minuten</dd>
            <dt>Agenda</dt>
            <dd className="text-text">„Erstellung der eigentlichen Agenda“</dd>
            <dt>Ergebnis</dt>
            <dd className="text-text">„Folgetermin erforderlich“</dd>
          </dl>
          <button type="button" className="btn mt-2 w-full" onClick={copyProtocol}>
            <ClipboardCopy size={16} aria-hidden="true" /> Meeting-Protokoll kopieren
          </button>
        </div>
      </Sheet>
    </Card>
  );
}
