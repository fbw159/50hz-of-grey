/**
 * Engineering math used by the Engineering Disaster Lab.
 *
 * Everything here is an idealised teaching model. The formulas are the
 * textbook ones – the simplifications (single aggregated machine, linear
 * damping, lossless DC load flow) are stated in the UI next to each tool.
 */

// ---------------------------------------------------------------------------
// Reactive power (Blindleistung)
// ---------------------------------------------------------------------------

export type ReactiveKind = 'inductive' | 'capacitive';

export interface ReactivePowerInput {
  /** Active power in kW (≥ 0). */
  pKw: number;
  /** Power factor cos φ in (0, 1]. */
  cosPhi: number;
  kind: ReactiveKind;
}

export interface ReactivePowerResult {
  pKw: number;
  /** Apparent power in kVA. */
  sKva: number;
  /** Reactive power in kvar, signed: inductive (lagging) positive, capacitive negative (consumer convention). */
  qKvar: number;
  /** |φ| in degrees. */
  phiDeg: number;
  tanPhi: number;
  cosPhi: number;
}

/**
 * S = P / cos φ,  |Q| = P · tan(arccos(cos φ)).
 * Sign convention (load reference): inductive load draws positive Q.
 */
export function reactivePower({ pKw, cosPhi, kind }: ReactivePowerInput): ReactivePowerResult {
  const p = Math.max(0, pKw);
  const c = Math.min(1, Math.max(1e-6, Math.abs(cosPhi)));
  const phi = Math.acos(c);
  const s = p / c;
  const qAbs = p * Math.tan(phi);
  const q = kind === 'inductive' ? qAbs : -qAbs;
  return {
    pKw: p,
    sKva: s,
    qKvar: q,
    phiDeg: (phi * 180) / Math.PI,
    tanPhi: Math.tan(phi),
    cosPhi: c,
  };
}

// ---------------------------------------------------------------------------
// Aggregated swing equation (Grid Chaos Engine)
// ---------------------------------------------------------------------------

export interface SwingParams {
  /** Nominal frequency in Hz. */
  f0: number;
  /** Equivalent inertia constant H in s (typical synchronous area: 2–6 s). */
  inertiaH: number;
  /** System base (sum of rated powers of synchronous generation) in MW. */
  sBaseMw: number;
  /** Load damping in %/Hz of base, e.g. 1 %/Hz → D = 0.01 · S_base per Hz (MW/Hz). */
  dampingPctPerHz: number;
  /**
   * Primary control (FCR) gain in MW/Hz. In Continental Europe ≈ 3000 MW are
   * fully activated at ±200 mHz → 15 000 MW/Hz. 0 disables primary control.
   */
  pcGainMwPerHz: number;
  /** Primary control reserve limit in MW (symmetric). */
  reserveMw: number;
  /** Primary control response time constant in s (first-order lag). */
  pcTimeConstant: number;
}

/** Helper: FCR gain from reserve and full-activation deviation. */
export function fcrGain(reserveMw: number, fullActivationMilliHz: number): number {
  return fullActivationMilliHz > 0 ? reserveMw / (fullActivationMilliHz / 1000) : 0;
}

export interface SwingState {
  /** Frequency in Hz. */
  f: number;
  /** Activated primary control power in MW (positive = additional generation). */
  pPc: number;
  /** Simulation time in s. */
  t: number;
}

/**
 * df/dt = f0 / (2·H·S_base) · (ΔP − D·(f − f0))
 *
 * ΔP = generation − load imbalance in MW (positive → frequency rises),
 * including activated primary control. D in MW/Hz. H in s, S_base in MW.
 * Units: (Hz · MW) / (s · MW) = Hz/s. ✔
 */
export function swingDerivative(state: SwingState, params: SwingParams, imbalanceMw: number): { dfdt: number; dpdt: number } {
  const dMwPerHz = (params.dampingPctPerHz / 100) * params.sBaseMw;
  const deltaP = imbalanceMw + state.pPc - dMwPerHz * (state.f - params.f0);
  const dfdt = (params.f0 / (2 * params.inertiaH * params.sBaseMw)) * deltaP;

  // Primary control target: −K · Δf, limited by the reserve, with first-order lag.
  let target = 0;
  if (params.pcGainMwPerHz > 0) {
    target = -params.pcGainMwPerHz * (state.f - params.f0);
    target = Math.max(-params.reserveMw, Math.min(params.reserveMw, target));
  }
  const dpdt = params.pcTimeConstant > 0 ? (target - state.pPc) / params.pcTimeConstant : 0;
  return { dfdt, dpdt };
}

/** One RK4 step of the aggregated model (dt in s). Numerically stable for dt ≤ 0.1 s. */
export function stepSwing(state: SwingState, params: SwingParams, imbalanceMw: number, dt: number): SwingState {
  const k1 = swingDerivative(state, params, imbalanceMw);
  const s2: SwingState = { f: state.f + (dt / 2) * k1.dfdt, pPc: state.pPc + (dt / 2) * k1.dpdt, t: state.t + dt / 2 };
  const k2 = swingDerivative(s2, params, imbalanceMw);
  const s3: SwingState = { f: state.f + (dt / 2) * k2.dfdt, pPc: state.pPc + (dt / 2) * k2.dpdt, t: state.t + dt / 2 };
  const k3 = swingDerivative(s3, params, imbalanceMw);
  const s4: SwingState = { f: state.f + dt * k3.dfdt, pPc: state.pPc + dt * k3.dpdt, t: state.t + dt };
  const k4 = swingDerivative(s4, params, imbalanceMw);
  let f = state.f + (dt / 6) * (k1.dfdt + 2 * k2.dfdt + 2 * k3.dfdt + k4.dfdt);
  let pPc = state.pPc + (dt / 6) * (k1.dpdt + 2 * k2.dpdt + 2 * k3.dpdt + k4.dpdt);
  // Keep the toy model inside a physically meaningful window.
  if (!Number.isFinite(f)) f = params.f0;
  f = Math.max(40, Math.min(60, f));
  if (params.pcGainMwPerHz <= 0) pPc = 0;
  pPc = Math.max(-params.reserveMw, Math.min(params.reserveMw, pPc));
  return { f, pPc, t: state.t + dt };
}

/**
 * Steady-state frequency for a constant imbalance with only load damping
 * (no primary control): Δf = ΔP / D. Used by tests and the UI explanation.
 */
export function steadyStateDeviation(imbalanceMw: number, params: SwingParams): number {
  const dMwPerHz = (params.dampingPctPerHz / 100) * params.sBaseMw;
  const gain = dMwPerHz + Math.max(0, params.pcGainMwPerHz);
  if (gain <= 0) return Infinity;
  const unlimited = imbalanceMw / gain;
  // if the reserve saturates, only damping acts beyond the limit
  const pcNeeded = Math.abs(unlimited) * params.pcGainMwPerHz;
  if (params.pcGainMwPerHz > 0 && pcNeeded > params.reserveMw) {
    const sign = Math.sign(imbalanceMw);
    return dMwPerHz > 0 ? (imbalanceMw - sign * params.reserveMw) / dMwPerHz : Infinity;
  }
  return unlimited;
}

// ---------------------------------------------------------------------------
// DC load flow (Redispatch-Generator 3000)
// ---------------------------------------------------------------------------

export interface DcNode {
  id: string;
  /** Generation in MW. */
  generationMw: number;
  /** Load in MW. */
  loadMw: number;
}

export interface DcLine {
  id: string;
  from: string;
  to: string;
  /** Reactance in p.u. on the system base. */
  reactancePu: number;
  /** Thermal limit in MW. */
  limitMw: number;
}

export interface DcLineFlow {
  id: string;
  from: string;
  to: string;
  /** Flow in MW, positive = from → to. */
  flowMw: number;
  limitMw: number;
  /** |flow| / limit. */
  loading: number;
  overloaded: boolean;
}

export interface DcFlowResult {
  ok: boolean;
  /** Voltage angles in rad, keyed by node id. */
  angles: Record<string, number>;
  lines: DcLineFlow[];
  /** Power picked up by the slack node to balance the system (MW). */
  slackMw: number;
  /** Sum of generation − load before balancing (MW). */
  imbalanceMw: number;
  maxLoading: number;
}

/** Solve A·x = b with Gaussian elimination and partial pivoting (small dense systems). */
export function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = col + 1; r < n; r++) {
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let c = r + 1; c < n; c++) s -= m[r][c] * x[c];
    x[r] = s / m[r][r];
  }
  return x;
}

/**
 * Lossless DC power flow: P = B·θ with B_ij = −1/x_ij, B_ii = Σ 1/x_ij.
 * The slack node absorbs the imbalance (its angle is the reference 0).
 * Line flow F_ij = (θ_i − θ_j) / x_ij (in p.u. · base MW).
 */
export function dcPowerFlow(nodes: DcNode[], lines: DcLine[], slackId: string, baseMw = 1000): DcFlowResult {
  const ids = nodes.map((n) => n.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = nodes.length;
  const slack = idx.get(slackId) ?? 0;
  const injection = nodes.map((node) => (node.generationMw - node.loadMw) / baseMw);
  const imbalanceMw = nodes.reduce((s, node) => s + node.generationMw - node.loadMw, 0);
  // slack balances the system
  injection[slack] -= imbalanceMw / baseMw;

  const bFull: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const line of lines) {
    const i = idx.get(line.from);
    const j = idx.get(line.to);
    if (i === undefined || j === undefined || line.reactancePu <= 0) continue;
    const y = 1 / line.reactancePu;
    bFull[i][i] += y;
    bFull[j][j] += y;
    bFull[i][j] -= y;
    bFull[j][i] -= y;
  }
  const keep = ids.map((_, i) => i).filter((i) => i !== slack);
  const bRed = keep.map((i) => keep.map((j) => bFull[i][j]));
  const pRed = keep.map((i) => injection[i]);
  const thetaRed = keep.length ? solveLinear(bRed, pRed) : [];
  const angles: Record<string, number> = {};
  ids.forEach((id) => (angles[id] = 0));
  if (!thetaRed) {
    return { ok: false, angles, lines: [], slackMw: -imbalanceMw, imbalanceMw, maxLoading: 0 };
  }
  keep.forEach((i, k) => (angles[ids[i]] = thetaRed[k]));
  let maxLoading = 0;
  const flows: DcLineFlow[] = lines.map((line) => {
    const flowMw = ((angles[line.from] - angles[line.to]) / line.reactancePu) * baseMw;
    const loading = line.limitMw > 0 ? Math.abs(flowMw) / line.limitMw : 0;
    maxLoading = Math.max(maxLoading, loading);
    return { id: line.id, from: line.from, to: line.to, flowMw, limitMw: line.limitMw, loading, overloaded: loading > 1 };
  });
  return { ok: true, angles, lines: flows, slackMw: -imbalanceMw, imbalanceMw, maxLoading };
}
