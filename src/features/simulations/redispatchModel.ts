/**
 * Redispatch-Generator 3000 – a 4-node DC load-flow teaching model.
 * Not a real grid. Values are illustrative; the maths (lossless DC power
 * flow) is real.
 */
import { dcPowerFlow, type DcLine, type DcNode, type DcFlowResult } from '@/lib/engineeringMath';

export interface RedispatchState {
  nodes: DcNode[];
  lines: DcLine[];
  /** Percentage of nominal capacity (100 = all lines nominal). */
  capacityPct: number;
}

export const NODE_POSITIONS: Record<string, { x: number; y: number; label: string; hint: string }> = {
  NORD: { x: 200, y: 50, label: 'NORD', hint: 'Wind' },
  WEST: { x: 60, y: 170, label: 'WEST', hint: 'Gas' },
  OST: { x: 340, y: 170, label: 'OST', hint: 'Braunkohle' },
  SUED: { x: 200, y: 290, label: 'SÜD', hint: 'Industrie' },
};

const NOMINAL_LIMITS: Record<string, number> = { 'N-W': 2500, 'N-O': 2500, 'W-S': 3000, 'O-S': 3000, 'N-S': 2000 };

export function initialRedispatchState(): RedispatchState {
  return {
    nodes: [
      { id: 'NORD', generationMw: 5500, loadMw: 2000 },
      { id: 'WEST', generationMw: 3000, loadMw: 3000 },
      { id: 'OST', generationMw: 3500, loadMw: 1500 },
      { id: 'SUED', generationMw: 2500, loadMw: 8000 },
    ],
    lines: [
      { id: 'N-W', from: 'NORD', to: 'WEST', reactancePu: 0.12, limitMw: NOMINAL_LIMITS['N-W'] },
      { id: 'N-O', from: 'NORD', to: 'OST', reactancePu: 0.12, limitMw: NOMINAL_LIMITS['N-O'] },
      { id: 'W-S', from: 'WEST', to: 'SUED', reactancePu: 0.1, limitMw: NOMINAL_LIMITS['W-S'] },
      { id: 'O-S', from: 'OST', to: 'SUED', reactancePu: 0.1, limitMw: NOMINAL_LIMITS['O-S'] },
      { id: 'N-S', from: 'NORD', to: 'SUED', reactancePu: 0.2, limitMw: NOMINAL_LIMITS['N-S'] },
    ],
    capacityPct: 100,
  };
}

export const SLACK = 'SUED';

export function solve(state: RedispatchState): DcFlowResult {
  const lines = state.lines.map((l) => ({ ...l, limitMw: NOMINAL_LIMITS[l.id] * (state.capacityPct / 100) }));
  return dcPowerFlow(state.nodes, lines, SLACK, 1000);
}

function withNode(state: RedispatchState, id: string, patch: (n: DcNode) => DcNode): RedispatchState {
  return { ...state, nodes: state.nodes.map((n) => (n.id === id ? patch(n) : n)) };
}

/** More wind in the north – displaces expensive generation in the south (merit order). */
export function moreWindNorth(state: RedispatchState, mw = 500): RedispatchState {
  let s = withNode(state, 'NORD', (n) => ({ ...n, generationMw: n.generationMw + mw }));
  s = withNode(s, 'SUED', (n) => ({ ...n, generationMw: Math.max(0, n.generationMw - mw) }));
  return s;
}

/** More demand in the south – served by the cheapest available generation (north). */
export function moreDemandSouth(state: RedispatchState, mw = 500): RedispatchState {
  let s = withNode(state, 'SUED', (n) => ({ ...n, loadMw: n.loadMw + mw }));
  s = withNode(s, 'NORD', (n) => ({ ...n, generationMw: n.generationMw + mw }));
  return s;
}

/** Reduce all line capacities (maintenance, weather). */
export function reduceCapacity(state: RedispatchState, pct = 15): RedispatchState {
  return { ...state, capacityPct: Math.max(40, state.capacityPct - pct) };
}

/** Classic redispatch: reduce north, increase south by the same amount. */
export function redispatch(state: RedispatchState, mw: number): RedispatchState {
  const north = state.nodes.find((n) => n.id === 'NORD')!;
  const amount = Math.min(mw, north.generationMw);
  let s = withNode(state, 'NORD', (n) => ({ ...n, generationMw: n.generationMw - amount }));
  s = withNode(s, 'SUED', (n) => ({ ...n, generationMw: n.generationMw + amount }));
  return s;
}

/** Congestion preset. */
export function congestionScenario(): RedispatchState {
  let s = initialRedispatchState();
  s = moreWindNorth(s, 2000);
  s = moreDemandSouth(s, 1000);
  s = reduceCapacity(s, 10);
  return s;
}

export interface RedispatchAdvice {
  lineId: string;
  overloadMw: number;
  /** MW to shift from NORD to SUED to relieve the worst line (estimated via sensitivity). */
  shiftMw: number;
}

/**
 * Redispatch volume (N → S) needed to clear every overload: first estimated
 * from the sensitivity of the worst line, then verified by re-solving and
 * increased in 50-MW steps until no line is overloaded (or nothing helps).
 */
export function adviseRedispatch(state: RedispatchState): RedispatchAdvice | null {
  const base = solve(state);
  if (!base.ok) return null;
  const worst = [...base.lines].sort((a, b) => b.loading - a.loading)[0];
  if (!worst || !worst.overloaded) return null;
  const probe = solve(redispatch(state, 100));
  const flowBefore = Math.abs(base.lines.find((l) => l.id === worst.id)!.flowMw);
  const flowAfter = Math.abs(probe.lines.find((l) => l.id === worst.id)!.flowMw);
  const sensitivity = (flowBefore - flowAfter) / 100; // MW relief per MW shifted
  const overloadMw = flowBefore - worst.limitMw;
  if (sensitivity <= 1e-6) return { lineId: worst.id, overloadMw, shiftMw: Infinity };
  let shiftMw = Math.ceil(overloadMw / sensitivity / 50) * 50;
  const northGen = state.nodes.find((n) => n.id === 'NORD')?.generationMw ?? 0;
  for (let i = 0; i < 40; i++) {
    const check = solve(redispatch(state, shiftMw));
    if (!check.lines.some((l) => l.overloaded)) break;
    if (shiftMw >= northGen) return { lineId: worst.id, overloadMw, shiftMw: Infinity };
    shiftMw += 50;
  }
  return { lineId: worst.id, overloadMw, shiftMw };
}
