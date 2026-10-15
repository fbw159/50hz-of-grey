import { useMemo, useState } from 'react';
import { Wind, Factory, Scissors, Shuffle, AlertTriangle, RotateCcw, Zap } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { SatireTag } from '@/components/ui/Tags';
import { useSettings } from '@/features/settings/settingsStore';
import { randomMessage } from '@/lib/humorEngine';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { adviseRedispatch, congestionScenario, initialRedispatchState, moreDemandSouth, moreWindNorth, NODE_POSITIONS, redispatch, reduceCapacity, solve, type RedispatchState } from './redispatchModel';

export function RedispatchGenerator() {
  const settings = useSettings();
  const [state, setState] = useState<RedispatchState>(initialRedispatchState);
  const [message, setMessage] = useState('Netzmodell im Normalbetrieb. Noch.');
  const [lastId, setLastId] = useState<string | undefined>();
  const result = useMemo(() => solve(state), [state]);
  const advice = useMemo(() => adviseRedispatch(state), [state]);
  const congested = result.lines.some((l) => l.overloaded);

  const say = (fallback: string) => {
    const m = settings.humor === 'professional' ? null : randomMessage('redispatch', lastId);
    setMessage(m?.title ?? fallback);
    setLastId(m?.id);
  };
  const act = (next: RedispatchState, fallback: string) => {
    setState(next);
    say(fallback);
  };

  const W = 400;
  const H = 340;
  const lineColor = (loading: number) => (loading > 1 ? 'var(--c-red)' : loading > 0.7 ? 'var(--c-amber)' : 'var(--c-green)');

  return (
    <Card data-testid="redispatch">
      <CardHeader
        title="Der Redispatch-Generator 3000"
        subtitle="Vier Knoten, fünf Leitungen, ein DC-Lastfluss – stark vereinfachtes Lehrmodell"
        right={
          <>
            <SatireTag>Simulation</SatireTag>
            <InfoButton title="DC-Lastfluss-Näherung">
              <p>Berechnet wird ein verlustloser DC-Lastfluss: P = B·θ mit B aus den Leitungsreaktanzen; der Leistungsfluss einer Leitung ist (θᵢ − θⱼ)/xᵢⱼ. Spannungsbeträge, Blindleistung und Verluste werden vernachlässigt – die Standardnäherung für Engpassbetrachtungen im Übertragungsnetz.</p>
              <p>Knoten SÜD ist der Bilanzknoten. Die Aktionen bilden die Marktlogik vereinfacht ab: mehr Wind im Norden verdrängt teure Erzeugung im Süden, zusätzliche Nachfrage im Süden wird vom günstigsten Erzeuger (Norden) gedeckt.</p>
              <p>Redispatch verschiebt Erzeugung von vor dem Engpass (Nord) nach dahinter (Süd), ohne die Gesamterzeugung zu ändern. Die Empfehlung wird aus der numerischen Sensitivität des am stärksten belasteten Zweigs geschätzt.</p>
              <p><strong>Lehrmodell:</strong> Topologie, Reaktanzen und Grenzwerte sind frei gewählt und stellen kein reales Netz dar.</p>
            </InfoButton>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-bg-deep/40">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Netzmodell mit Lastflüssen">
            <defs>
              <marker id="rd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--c-text-2)" />
              </marker>
            </defs>
            {result.lines.map((l) => {
              const a = NODE_POSITIONS[l.from];
              const b = NODE_POSITIONS[l.to];
              const forward = l.flowMw >= 0;
              const sx = forward ? a.x : b.x;
              const sy = forward ? a.y : b.y;
              const ex = forward ? b.x : a.x;
              const ey = forward ? b.y : a.y;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const width = 2 + Math.min(8, Math.abs(l.flowMw) / 500);
              return (
                <g key={l.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={lineColor(l.loading)} strokeWidth={width} strokeOpacity={0.85} strokeDasharray={l.overloaded ? '6 4' : undefined} />
                  {Math.abs(l.flowMw) > 20 && <line x1={sx + (ex - sx) * 0.42} y1={sy + (ey - sy) * 0.42} x2={sx + (ex - sx) * 0.58} y2={sy + (ey - sy) * 0.58} stroke="var(--c-text-2)" strokeWidth={1.5} markerEnd="url(#rd-arrow)" />}
                  <rect x={mx - 42} y={my - 20} width={84} height={16} rx={3} fill="var(--c-surface)" fillOpacity={0.9} />
                  <text x={mx} y={my - 8} textAnchor="middle" style={{ fill: lineColor(l.loading), fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatNumber(Math.abs(l.flowMw), 0)}/{formatNumber(l.limitMw, 0)} MW
                  </text>
                </g>
              );
            })}
            {state.nodes.map((n) => {
              const p = NODE_POSITIONS[n.id];
              const net = n.generationMw - n.loadMw;
              return (
                <g key={n.id}>
                  <circle cx={p.x} cy={p.y} r={30} fill="var(--c-elevated)" stroke={net >= 0 ? 'var(--c-cyan)' : 'var(--c-amber)'} strokeWidth={2} />
                  <text x={p.x} y={p.y - 6} textAnchor="middle" style={{ fill: 'var(--c-text)', fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {p.label}
                  </text>
                  <text x={p.x} y={p.y + 8} textAnchor="middle" style={{ fill: 'var(--c-text-2)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                    G {formatNumber(n.generationMw, 0)}
                  </text>
                  <text x={p.x} y={p.y + 19} textAnchor="middle" style={{ fill: 'var(--c-text-2)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                    L {formatNumber(n.loadMw, 0)}
                  </text>
                  <text x={p.x} y={p.y + 44} textAnchor="middle" style={{ fill: 'var(--c-text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                    {p.hint}
                  </text>
                </g>
              );
            })}
            <text x={8} y={H - 8} style={{ fill: 'var(--c-text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
              G = Erzeugung, L = Last (MW) · Leitungskapazität {state.capacityPct} % · Bilanzknoten SÜD {formatNumber(result.slackMw, 0)} MW
            </text>
          </svg>
        </div>
        <div className="space-y-3">
          <div className={`rounded-lg border px-3 py-2 text-sm ${congested ? 'border-red/50 bg-red/10' : 'border-border'}`} data-testid="rd-status">
            <div className="flex items-center gap-2 font-display font-semibold">
              {congested ? <AlertTriangle size={16} className="text-red" aria-hidden="true" /> : <Zap size={16} className="text-green" aria-hidden="true" />}
              {congested ? 'Netzengpass im Modell' : 'Kein Engpass'}
              <span className="readout ml-auto text-text-2">max. {formatPercent(result.maxLoading * 100, 0)}</span>
            </div>
            <p className="mt-1 text-text-2">{message}</p>
            {advice && Number.isFinite(advice.shiftMw) && (
              <p className="mt-1 text-xs text-text-2">
                Empfehlung: Leitung {advice.lineId} um {formatNumber(advice.overloadMw, 0)} MW überlastet → Redispatch Nord −{formatNumber(advice.shiftMw, 0)} MW / Süd +{formatNumber(advice.shiftMw, 0)} MW.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn" onClick={() => act(moreWindNorth(state), 'Wind im Norden +500 MW, Süd −500 MW.')} data-testid="rd-wind">
              <Wind size={16} aria-hidden="true" /> Wind im Norden +500 MW
            </button>
            <button type="button" className="btn" onClick={() => act(moreDemandSouth(state), 'Nachfrage im Süden +500 MW.')} data-testid="rd-demand">
              <Factory size={16} aria-hidden="true" /> Nachfrage im Süden +500 MW
            </button>
            <button type="button" className="btn" onClick={() => act(reduceCapacity(state), 'Transportkapazität reduziert.')} data-testid="rd-capacity">
              <Scissors size={16} aria-hidden="true" /> Transportkapazität −15 %
            </button>
            <button type="button" className="btn btn-primary" disabled={!advice || !Number.isFinite(advice.shiftMw)} onClick={() => advice && act(redispatch(state, advice.shiftMw), 'Redispatch durchgeführt.')} data-testid="rd-redispatch">
              <Shuffle size={16} aria-hidden="true" /> Redispatch {advice && Number.isFinite(advice.shiftMw) ? `${formatNumber(advice.shiftMw, 0)} MW` : ''}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => act(congestionScenario(), 'Fiktive Netzengpasssituation geladen.')} data-testid="rd-scenario">
              <AlertTriangle size={16} aria-hidden="true" /> Engpass simulieren
            </button>
            <button type="button" className="btn" onClick={() => act(initialRedispatchState(), 'Ausgangszustand wiederhergestellt.')} data-testid="rd-reset">
              <RotateCcw size={16} aria-hidden="true" /> Zurücksetzen
            </button>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border text-xs">
            {result.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="w-10 font-mono text-text-2">{l.id}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, l.loading * 100)}%`, background: lineColor(l.loading) }} />
                </span>
                <span className="readout w-14 text-right text-text">{formatPercent(l.loading * 100, 0)}</span>
                <span className="w-16 text-right font-mono text-text-3">{l.overloaded ? 'ENGPASS' : l.loading > 0.7 ? 'hoch' : 'ok'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
