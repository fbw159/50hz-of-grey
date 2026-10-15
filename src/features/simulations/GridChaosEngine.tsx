import { useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Zap, ZapOff, Siren, LifeBuoy } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { SatireTag } from '@/components/ui/Tags';
import { Switch } from '@/components/ui/Switch';
import { achievementStore } from '@/features/achievements/achievementStore';
import { useSettings } from '@/features/settings/settingsStore';
import { randomMessage } from '@/lib/humorEngine';
import { formatMilliHz, formatNumber } from '@/lib/formatters';
import { steadyStateDeviation } from '@/lib/engineeringMath';
import { DEFAULT_CONTROLS, paramsFromControls, useSwingSimulation, type SimControls } from './useSwingSimulation';
import { useElementWidth } from '@/hooks/useElementWidth';

const H = 220;

function SliderRow({ label, value, min, max, step, unit, onChange, format }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-text-2">
        <span>{label}</span>
        <span className="readout text-text">
          {format ? format(value) : formatNumber(value, step < 1 ? 1 : 0)} {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ['--fill' as string]: `${pct}%` }} aria-label={label} />
    </label>
  );
}

export function GridChaosEngine() {
  const [controls, setControls] = useState<SimControls>(DEFAULT_CONTROLS);
  const { snapshot, addEvent, clearEvents, reset, running, setRunning } = useSwingSimulation(controls);
  const settings = useSettings();
  const [message, setMessage] = useState<string>('Aktive Regelstrategie: Professionelles Improvisieren');
  const [lastMsgId, setLastMsgId] = useState<string | undefined>();
  const set = <K extends keyof SimControls>(k: K, v: SimControls[K]) => setControls((c) => ({ ...c, [k]: v }));

  const say = (fallback: string) => {
    const m = settings.humor === 'professional' ? null : randomMessage('simulation', lastMsgId);
    setMessage(m?.title ?? fallback);
    setLastMsgId(m?.id);
  };

  const outage = () => {
    addEvent('Kraftwerksausfall −1000 MW', -1000);
    achievementStore.track('disturbance');
    say('Störung: 1000 MW Erzeugung weggefallen.');
  };
  const reserve = () => {
    addEvent('Regelenergie +500 MW', 500);
    say('Zusätzliche 500 MW Regelleistung aktiviert.');
  };
  const spike = () => {
    addEvent('Lastspitze +1500 MW (20 s)', -1500, 20);
    achievementStore.track('disturbance');
    say('Lastspitze von 1500 MW für 20 Sekunden.');
  };
  const rescue = () => {
    clearEvents();
    setControls((c) => ({ ...c, generationMw: 0, loadMw: 0, fcrEnabled: true }));
    say('Alle Störungen beseitigt, Primärregelung aktiv.');
  };

  const dev = snapshot.f - 50;
  const severity = Math.abs(dev) > 0.8 ? 'critical' : Math.abs(dev) > 0.2 ? 'warn' : 'ok';
  const color = severity === 'critical' ? 'var(--c-red)' : severity === 'warn' ? 'var(--c-amber)' : 'var(--c-cyan)';
  const steady = useMemo(() => steadyStateDeviation(snapshot.imbalanceMw, paramsFromControls(controls)), [snapshot.imbalanceMw, controls]);
  const [chartRef, W] = useElementWidth<HTMLDivElement>(640);

  // chart geometry
  const hist = snapshot.history;
  const tMax = hist.length ? hist[hist.length - 1].t : 0;
  const tMin = tMax - 60;
  let fMin = 49.8;
  let fMax = 50.2;
  for (const p of hist) {
    if (p.f < fMin + 0.02) fMin = p.f - 0.05;
    if (p.f > fMax - 0.02) fMax = p.f + 0.05;
  }
  const x = (t: number) => 40 + ((t - tMin) / 60) * (W - 48);
  const y = (f: number) => 10 + (1 - (f - fMin) / (fMax - fMin)) * (H - 36);
  const path = hist.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.f).toFixed(1)}`).join(' ');

  return (
    <Card data-testid="chaos-engine">
      <CardHeader
        title="GRID CHAOS ENGINE"
        subtitle="Vereinfachte Netzfrequenzsimulation – aggregiertes Lehrmodell, kein Abbild des Verbundnetzes"
        right={
          <>
            <SatireTag>Simulation</SatireTag>
            <InfoButton title="Das Modell hinter der Chaos Engine">
              <p>Eine einzige aggregierte Schwungmasse für das ganze Netz, beschrieben durch die vereinfachte Swing-Gleichung:</p>
              <p className="readout rounded bg-bg-deep/50 p-2 text-xs">df/dt = f₀ / (2 · H · S_base) · (ΔP − D · (f − f₀))</p>
              <p>ΔP = Erzeugung − Last in MW (positiv → Frequenz steigt), H = Trägheitskonstante in s, S_base = Systembasisleistung in MW, D = frequenzabhängige Lastdämpfung in MW/Hz (hier als %/Hz der Basisleistung angegeben). Einheiten: Hz·MW/(s·MW) = Hz/s.</p>
              <p>Die Primärregelung ist eine proportionale Regelung (K in MW/Hz, hier aus Reserve ÷ 200 mHz) mit Verzögerung erster Ordnung, begrenzt auf die Reserve. Integriert wird mit Runge-Kutta 4. Ordnung bei Δt = 50 ms.</p>
              <p><strong>Grenzen:</strong> keine räumliche Struktur, keine Spannung, kein Lastabwurf, keine Sekundärregelung, keine Schutzauslösungen. Ab ±200 mHz würden im realen Netz Sondermaßnahmen greifen, ab 49,0 Hz der automatische Lastabwurf.</p>
            </InfoButton>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="label-caps">Simulierte Frequenz</div>
              <div className={`readout text-4xl font-bold leading-none sm:text-5xl ${severity === 'critical' ? 'glitch' : ''}`} style={{ color }} data-text={formatNumber(snapshot.f, 3, 3)} data-testid="sim-frequency">
                {formatNumber(snapshot.f, 3, 3)} <span className="text-lg text-text-3">Hz</span>
              </div>
              <div className="readout mt-1 text-sm text-text-2">
                {formatMilliHz(dev, 0)} · Ungleichgewicht {snapshot.imbalanceMw >= 0 ? '+' : '−'}
                {formatNumber(Math.abs(snapshot.imbalanceMw), 0)} MW · FCR {snapshot.pPc >= 0 ? '+' : '−'}
                {formatNumber(Math.abs(snapshot.pPc), 0)} MW
              </div>
            </div>
            <div className="flex gap-1">
              <button type="button" className="btn btn-sm" onClick={() => setRunning(!running)} aria-label={running ? 'Pause' : 'Weiter'}>
                {running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => { reset(); setControls(DEFAULT_CONTROLS); setMessage('Aktive Regelstrategie: Professionelles Improvisieren'); }} aria-label="Zurücksetzen">
                <RotateCcw size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div ref={chartRef} className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-deep/40">
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="img" aria-label="Simulierter Frequenzverlauf der letzten 60 Sekunden">
              {[49.8, 49.9, 50, 50.1, 50.2].filter((g) => g >= fMin && g <= fMax).map((g) => (
                <g key={g}>
                  <line x1={40} x2={W - 8} y1={y(g)} y2={y(g)} stroke={g === 50 ? 'var(--c-border-strong)' : 'var(--c-grid-line)'} strokeDasharray={g === 50 ? '4 3' : undefined} />
                  <text x={36} y={y(g) + 4} textAnchor="end" style={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    {g.toFixed(1).replace('.', ',')}
                  </text>
                </g>
              ))}
              <rect x={40} y={y(50.05)} width={W - 48} height={Math.max(0, y(49.95) - y(50.05))} fill="var(--c-green)" fillOpacity={0.06} />
              {path && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
              {hist.length > 0 && <circle cx={x(tMax)} cy={y(snapshot.f)} r={4} fill={color} />}
              <text x={W - 8} y={H - 6} textAnchor="end" style={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                t = {formatNumber(snapshot.t, 0)} s · letzte 60 s
              </text>
            </svg>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-danger" onClick={outage} data-testid="sim-outage">
              <ZapOff size={16} aria-hidden="true" /> KRAFTWERK AUSFALLEN LASSEN
            </button>
            <button type="button" className="btn btn-primary" onClick={reserve} data-testid="sim-reserve">
              <Zap size={16} aria-hidden="true" /> REGELENERGIE ANFORDERN
            </button>
            <button type="button" className="btn" onClick={spike} data-testid="sim-spike">
              <Siren size={16} aria-hidden="true" /> LASTSPITZE ERZEUGEN
            </button>
            <button type="button" className="btn btn-success" onClick={rescue} data-testid="sim-rescue">
              <LifeBuoy size={16} aria-hidden="true" /> FREQUENZ RETTEN
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-border px-3 py-2 text-sm">
            <div className="label-caps">Leitwarte meldet</div>
            <p className="mt-0.5 text-text" data-testid="sim-message">{message}</p>
            {severity === 'critical' && <p className="mt-1 text-xs text-red">Das vereinfachte Modell ist weit außerhalb des Normalbereichs. Im realen Netz würden Schutz- und Lastabwurfsysteme längst eingegriffen haben – hier passiert nichts dergleichen.</p>}
            {snapshot.events.length > 0 && (
              <ul className="mt-1 text-xs text-text-3">
                {snapshot.events.map((e) => (
                  <li key={e.id}>
                    {e.label}
                    {Number.isFinite(e.remainingS) ? ` – noch ${formatNumber(e.remainingS, 0)} s` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <SliderRow label="Erzeugung anpassen" value={controls.generationMw} min={-5000} max={5000} step={100} unit="MW" onChange={(v) => set('generationMw', v)} format={(v) => `${v >= 0 ? '+' : '−'}${formatNumber(Math.abs(v), 0)}`} />
          <SliderRow label="Last anpassen" value={controls.loadMw} min={-5000} max={5000} step={100} unit="MW" onChange={(v) => set('loadMw', v)} format={(v) => `${v >= 0 ? '+' : '−'}${formatNumber(Math.abs(v), 0)}`} />
          <SliderRow label="Trägheitskonstante H" value={controls.inertiaH} min={1} max={10} step={0.5} unit="s" onChange={(v) => set('inertiaH', v)} />
          <SliderRow label="Systembasisleistung" value={controls.sBaseGw} min={50} max={500} step={10} unit="GW" onChange={(v) => set('sBaseGw', v)} />
          <SliderRow label="Primärregelreserve (FCR)" value={controls.fcrReserveMw} min={0} max={6000} step={250} unit="MW" onChange={(v) => set('fcrReserveMw', v)} />
          <SliderRow label="FCR-Zeitkonstante" value={controls.fcrTimeConstant} min={1} max={30} step={1} unit="s" onChange={(v) => set('fcrTimeConstant', v)} />
          <SliderRow label="Lastdämpfung D" value={controls.dampingPctPerHz} min={0} max={3} step={0.25} unit="%/Hz" onChange={(v) => set('dampingPctPerHz', v)} format={(v) => formatNumber(v, 2)} />
          <Switch checked={controls.fcrEnabled} onChange={(v) => set('fcrEnabled', v)} label="Primärregelung aktiv" description="Proportional, verzögert, auf die Reserve begrenzt" />
          <p className="text-[11px] text-text-3">
            Stationäre Abweichung bei aktuellem Ungleichgewicht: {Number.isFinite(steady) ? formatMilliHz(steady, 0) : 'nicht begrenzt (keine Dämpfung)'} · FCR-Gain {formatNumber(paramsFromControls(controls).pcGainMwPerHz, 0)} MW/Hz
          </p>
        </div>
      </div>
    </Card>
  );
}
