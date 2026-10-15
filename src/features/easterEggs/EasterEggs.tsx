import { useState } from 'react';
import { OctagonAlert, Table2, Users, MessageSquareQuote, Copy, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { SatireTag } from '@/components/ui/Tags';
import { achievementStore } from '@/features/achievements/achievementStore';
import { useSettings } from '@/features/settings/settingsStore';
import { showSnack } from '@/hooks/useSnackbar';
import { copyText } from '@/lib/clipboard';
import { randomMessage } from '@/lib/humorEngine';
import { playSound } from '@/lib/sounds';
import { formatNumber } from '@/lib/formatters';

/** Easter Egg 1: the big red button. Does nothing. That is the point. */
export function DoNotPress() {
  const settings = useSettings();
  const [msg, setMsg] = useState<{ title: string; description?: string } | null>(null);
  const [lastId, setLastId] = useState<string | undefined>();
  const [presses, setPresses] = useState(0);
  const press = () => {
    const m = randomMessage('doNotPress', lastId);
    setMsg(m ? { title: m.title, description: m.description } : { title: 'Sie haben soeben versucht, das europäische Verbundnetz neu zu starten.', description: 'Zugriff verweigert. Zum Glück.' });
    setLastId(m?.id);
    setPresses((p) => p + 1);
    achievementStore.track('do-not-press');
    if (settings.sounds) playSound('alert');
  };
  return (
    <Card className="flex flex-col items-center text-center" data-testid="do-not-press-card">
      <button
        type="button"
        onClick={press}
        className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-red/70 bg-red/20 font-display text-sm font-bold uppercase tracking-[0.12em] text-red shadow-[0_0_40px_-8px_var(--c-red)] transition-transform active:scale-95"
        aria-label="DO NOT PRESS"
        data-testid="do-not-press"
      >
        <span className="absolute inset-2 rounded-full border border-red/40" aria-hidden="true" />
        DO NOT PRESS
      </button>
      {msg ? (
        <div className="mt-4 space-y-1" data-testid="do-not-press-message">
          <p className="font-display text-sm font-semibold text-text">{msg.title}</p>
          {msg.description && <p className="text-xs text-text-2">{msg.description}</p>}
          <p className="text-[11px] text-text-3">Versuche: {presses}. Keine echte Aktion ausgelöst.</p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-text-3">Ernsthaft. Nicht drücken.</p>
      )}
    </Card>
  );
}

/** Easter Egg 3: Excel solves everything. */
export function ExcelButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | undefined>();
  const solve = () => {
    const m = randomMessage('excel', lastId);
    setMsg(m?.title ?? 'Problem erfolgreich in eine neue Tabelle verschoben.');
    setLastId(m?.id);
    achievementStore.track('excel');
  };
  return (
    <Card data-testid="excel-card">
      <CardHeader title="Excel ist die Antwort" subtitle="Unabhängig von der Frage." right={<SatireTag />} />
      <button type="button" className="btn btn-success mt-3 w-full" onClick={solve} data-testid="excel-button">
        <Table2 size={16} aria-hidden="true" /> PROBLEM MIT EXCEL LÖSEN
      </button>
      {msg && <p className="mt-3 text-sm text-green" data-testid="excel-message">{msg}</p>}
    </Card>
  );
}

/** Easter Egg 4: meeting efficiency. */
export function MeetingSimulator() {
  const [participants, setParticipants] = useState(3);
  // efficiency decays with every participant; three people are the sweet spot (100 %)
  const efficiency = Math.max(0.3, 100 / Math.pow(Math.max(1, participants - 2), 1.6));
  const add = () => {
    const next = participants + 1;
    setParticipants(next);
    achievementStore.trackMax('meeting-participants', next);
  };
  return (
    <Card data-testid="meeting-card">
      <CardHeader title="Meeting-Simulator" subtitle="Effizienz als Funktion der Teilnehmerzahl" right={<SatireTag />} />
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-text-2">Meeting-Effizienz</span>
        <span className="readout text-text" data-testid="meeting-efficiency">
          {formatNumber(efficiency, efficiency < 10 ? 1 : 0)} %
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-amber transition-[width] duration-300" style={{ width: `${Math.min(100, efficiency)}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-text-3">
          {participants} Teilnehmer · Formel: 100 % / (n − 2)<sup>1,6</sup>
        </span>
        <div className="flex gap-1">
          <button type="button" className="btn btn-sm" onClick={() => setParticipants(3)}>
            Reset
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={add} data-testid="meeting-add">
            <Users size={14} aria-hidden="true" /> Weitere Teilnehmer hinzufügen
          </button>
        </div>
      </div>
      {participants >= 12 && <p className="mt-2 text-xs text-amber">Ab 12 Teilnehmern spricht die Norm von einem Townhall.</p>}
    </Card>
  );
}

/** Easter Egg 6: Engineer's Excuse Generator. */
export function ExcuseGenerator() {
  const [excuse, setExcuse] = useState<string>('Das liegt am Netz.');
  const [lastId, setLastId] = useState<string | undefined>();
  const generate = () => {
    const m = randomMessage('excuse', lastId);
    setExcuse(m?.title ?? 'Das ist historisch gewachsen.');
    setLastId(m?.id);
    achievementStore.track('excuse');
  };
  const copy = async () => {
    const ok = await copyText(excuse);
    showSnack(ok ? 'Ausrede kopiert. Viel Erfolg im Meeting.' : 'Kopieren nicht möglich.', { tone: ok ? 'success' : 'warning' });
  };
  return (
    <Card data-testid="excuse-card">
      <CardHeader title="Engineer’s Excuse Generator" subtitle="Für Meetings, in denen die Messung leider plausibel war" right={<SatireTag />} />
      <blockquote className="mt-3 rounded-lg border border-border bg-bg-deep/40 px-4 py-3 font-display text-base italic text-text" data-testid="excuse-text">
        <MessageSquareQuote size={16} className="mb-1 text-cyan" aria-hidden="true" />
        <div>„{excuse}“</div>
      </blockquote>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary flex-1" onClick={generate} data-testid="excuse-generate">
          <RefreshCw size={16} aria-hidden="true" /> NEUE AUSREDE GENERIEREN
        </button>
        <button type="button" className="btn" onClick={copy} aria-label="Ausrede kopieren">
          <Copy size={16} aria-hidden="true" />
        </button>
      </div>
    </Card>
  );
}

export function EasterEggIcon() {
  return <OctagonAlert size={16} aria-hidden="true" />;
}
