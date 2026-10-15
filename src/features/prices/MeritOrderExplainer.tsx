import { useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InfoButton } from '@/components/ui/InfoButton';
import { formatNumber } from '@/lib/formatters';
import { useElementWidth } from '@/hooks/useElementWidth';

interface Block {
  id: string;
  label: string;
  /** Marginal cost in EUR/MWh (teaching values, not real bids). */
  cost: number;
  /** Capacity in GW. */
  capacityGw: number;
  color: string;
}

const FIXED_BLOCKS: Omit<Block, 'capacityGw'>[] = [
  { id: 'must', label: 'Must-run / Biomasse', cost: 5, color: '#4ADE80' },
  { id: 'lignite', label: 'Braunkohle', cost: 35, color: '#A16207' },
  { id: 'coal', label: 'Steinkohle', cost: 70, color: '#78716C' },
  { id: 'ccgt', label: 'GuD-Gas', cost: 100, color: '#FB923C' },
  { id: 'peaker', label: 'Gasturbine', cost: 170, color: '#F97316' },
  { id: 'oil', label: 'Öl / Reserve', cost: 280, color: '#EF4444' },
];
const FIXED_CAPACITY: Record<string, number> = { must: 8, lignite: 12, coal: 10, ccgt: 14, peaker: 8, oil: 5 };

/**
 * Interactive teaching model of the merit-order principle. Deliberately
 * simplified: fixed example capacities and costs, no real plant data.
 */
export function MeritOrderExplainer() {
  const [demand, setDemand] = useState(55);
  const [renewables, setRenewables] = useState(30);
  const blocks = useMemo<Block[]>(() => [{ id: 'vre', label: 'Wind + PV', cost: 0, capacityGw: renewables, color: '#38BDF8' }, ...FIXED_BLOCKS.map((b) => ({ ...b, capacityGw: FIXED_CAPACITY[b.id] }))], [renewables]);
  const total = blocks.reduce((s, b) => s + b.capacityGw, 0);
  let cumulative = 0;
  let marginal: Block | null = null;
  for (const b of blocks) {
    cumulative += b.capacityGw;
    if (demand <= cumulative) {
      marginal = b;
      break;
    }
  }
  const price = marginal ? marginal.cost : null;

  const [chartRef, W] = useElementWidth<HTMLDivElement>(640);
  const H = 220;
  const padL = 44;
  const padB = 30;
  const padT = 12;
  const maxCost = 300;
  const x = (gw: number) => padL + (gw / total) * (W - padL - 10);
  const y = (cost: number) => padT + (1 - cost / maxCost) * (H - padT - padB);

  let acc = 0;
  const rects = blocks.map((b) => {
    const x0 = x(acc);
    const x1 = x(acc + b.capacityGw);
    acc += b.capacityGw;
    return { ...b, x0, x1, y0: y(b.cost), active: marginal?.id === b.id };
  });

  return (
    <Card data-testid="merit-order">
      <CardHeader
        title="Merit Order – Lehrmodell"
        subtitle="Wie der teuerste benötigte Erzeuger den Preis für alle setzt"
        right={
          <InfoButton title="Merit Order – was ist das?">
            <p>In der Day-Ahead-Auktion werden Gebote nach Grenzkosten sortiert. Beginnend beim günstigsten Erzeuger werden so viele Gebote angenommen, bis die Nachfrage gedeckt ist. Das letzte benötigte Gebot bestimmt den Preis für alle („Uniform Pricing“).</p>
            <p>Viel Wind und PV schieben die teuren Kraftwerke aus der Einsatzreihenfolge – der Preis sinkt (Merit-Order-Effekt). Bei wenig Wind und hoher Nachfrage setzen Gaskraftwerke den Preis.</p>
            <p><strong>Lehrmodell:</strong> Kapazitäten und Kosten sind frei gewählte Beispielwerte. Sie bilden keine reale Kraftwerkseinsatzreihenfolge ab.</p>
          </InfoButton>
        }
      />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="flex justify-between text-text-2">
            <span>Nachfrage</span>
            <span className="readout text-text">{formatNumber(demand, 0)} GW</span>
          </span>
          <input type="range" min={20} max={85} step={1} value={demand} onChange={(e) => setDemand(Number(e.target.value))} style={{ ['--fill' as string]: `${((demand - 20) / 65) * 100}%` }} aria-label="Nachfrage in GW" />
        </label>
        <label className="block text-sm">
          <span className="flex justify-between text-text-2">
            <span>Einspeisung Wind + PV</span>
            <span className="readout text-text">{formatNumber(renewables, 0)} GW</span>
          </span>
          <input type="range" min={0} max={70} step={1} value={renewables} onChange={(e) => setRenewables(Number(e.target.value))} style={{ ['--fill' as string]: `${(renewables / 70) * 100}%` }} aria-label="Einspeisung Wind und PV in GW" />
        </label>
      </div>
      <div ref={chartRef} className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-deep/40">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto w-full" role="img" aria-label="Merit-Order-Diagramm (Lehrmodell)">
          {[0, 100, 200, 300].map((c) => (
            <g key={c}>
              <line x1={padL} x2={W - 10} y1={y(c)} y2={y(c)} stroke="var(--c-grid-line)" />
              <text x={padL - 6} y={y(c) + 4} textAnchor="end" style={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                {c}
              </text>
            </g>
          ))}
          {rects.map((r) => (
            <g key={r.id}>
              <rect x={r.x0} y={r.y0} width={Math.max(0, r.x1 - r.x0)} height={H - padB - r.y0} fill={r.color} fillOpacity={r.active ? 0.95 : 0.45} stroke={r.active ? 'var(--c-text)' : 'transparent'} strokeWidth={r.active ? 1.5 : 0} />
              {r.x1 - r.x0 > 54 && (
                <text x={(r.x0 + r.x1) / 2} y={H - padB + 14} textAnchor="middle" style={{ fill: 'var(--c-text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                  {r.label}
                </text>
              )}
            </g>
          ))}
          <line x1={x(demand)} x2={x(demand)} y1={padT} y2={H - padB} stroke="var(--c-text)" strokeWidth={2} strokeDasharray="5 3" />
          <text x={x(demand) + 4} y={padT + 10} style={{ fill: 'var(--c-text)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            Nachfrage
          </text>
          {price !== null && <line x1={padL} x2={W - 10} y1={y(price)} y2={y(price)} stroke="var(--c-cyan)" strokeWidth={1.5} />}
          <text x={padL + 4} y={H - 4} style={{ fill: 'var(--c-text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
            GW →
          </text>
          <text x={6} y={padT + 8} style={{ fill: 'var(--c-text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
            €/MWh
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-text-2">
          Preissetzend: <strong className="text-text">{marginal ? marginal.label : 'Nachfrage nicht deckbar'}</strong>
        </span>
        <span className="readout text-lg font-semibold text-cyan" data-testid="merit-price">
          {price !== null ? `${formatNumber(price, 0)} €/MWh` : '–'}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-text-3">Lehrmodell mit Beispielwerten – keine reale Kraftwerkseinsatzreihenfolge, keine realen Gebote.</p>
    </Card>
  );
}
