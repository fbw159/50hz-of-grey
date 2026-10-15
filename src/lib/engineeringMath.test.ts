import { describe, expect, it } from 'vitest';
import { dcPowerFlow, fcrGain, reactivePower, solveLinear, steadyStateDeviation, stepSwing, type SwingParams } from './engineeringMath';

describe('reactive power', () => {
  it('computes S, Q and φ for an inductive load', () => {
    const r = reactivePower({ pKw: 100, cosPhi: 0.8, kind: 'inductive' });
    expect(r.sKva).toBeCloseTo(125, 5);
    expect(r.qKvar).toBeCloseTo(75, 5);
    expect(r.phiDeg).toBeCloseTo(36.87, 2);
    expect(r.tanPhi).toBeCloseTo(0.75, 5);
  });

  it('uses the consumer sign convention (capacitive negative)', () => {
    const r = reactivePower({ pKw: 100, cosPhi: 0.8, kind: 'capacitive' });
    expect(r.qKvar).toBeCloseTo(-75, 5);
    expect(r.sKva).toBeCloseTo(125, 5);
  });

  it('has zero reactive power at cos φ = 1 and satisfies S² = P² + Q²', () => {
    const unity = reactivePower({ pKw: 250, cosPhi: 1, kind: 'inductive' });
    expect(unity.qKvar).toBeCloseTo(0, 6);
    expect(unity.sKva).toBeCloseTo(250, 6);
    const r = reactivePower({ pKw: 400, cosPhi: 0.6, kind: 'inductive' });
    expect(r.sKva ** 2).toBeCloseTo(r.pKw ** 2 + r.qKvar ** 2, 3);
  });

  it('never divides by zero for absurd inputs', () => {
    const r = reactivePower({ pKw: 10, cosPhi: 0, kind: 'inductive' });
    expect(Number.isFinite(r.sKva)).toBe(true);
    expect(reactivePower({ pKw: -5, cosPhi: 0.9, kind: 'inductive' }).pKw).toBe(0);
  });
});

describe('swing equation model', () => {
  const params: SwingParams = {
    f0: 50,
    inertiaH: 4,
    sBaseMw: 300_000,
    dampingPctPerHz: 1,
    pcGainMwPerHz: fcrGain(3000, 200),
    reserveMw: 3000,
    pcTimeConstant: 6,
  };

  it('stays at 50 Hz without imbalance', () => {
    let s = { f: 50, pPc: 0, t: 0 };
    for (let i = 0; i < 2000; i++) s = stepSwing(s, params, 0, 0.05);
    expect(s.f).toBeCloseTo(50, 9);
    expect(s.pPc).toBeCloseTo(0, 9);
  });

  it('initial rate of change follows df/dt = f0/(2·H·S)·ΔP', () => {
    const s0 = { f: 50, pPc: 0, t: 0 };
    const dt = 0.01;
    const s1 = stepSwing(s0, params, -1000, dt);
    const expected = (50 / (2 * 4 * 300_000)) * -1000; // Hz/s
    expect((s1.f - s0.f) / dt).toBeCloseTo(expected, 4);
  });

  it('settles near the analytical steady state after a 1 GW loss', () => {
    let s = { f: 50, pPc: 0, t: 0 };
    for (let i = 0; i < 6000; i++) s = stepSwing(s, params, -1000, 0.05); // 300 s
    const expectedDev = steadyStateDeviation(-1000, params);
    expect(expectedDev).toBeLessThan(0);
    expect(s.f - 50).toBeCloseTo(expectedDev, 3);
    // realistic magnitude: a 1 GW outage with ~18 GW/Hz stiffness → about −55 mHz
    expect(s.f).toBeGreaterThan(49.9);
    expect(s.f).toBeLessThan(49.97);
  });

  it('saturates the primary reserve and drops further with only damping left', () => {
    const noReserve = { ...params, reserveMw: 500, pcGainMwPerHz: fcrGain(500, 200) };
    const dev = steadyStateDeviation(-3000, noReserve);
    // (−3000 + 500) / (0.01·300000 MW/Hz) = −0.8333 Hz
    expect(dev).toBeCloseTo(-2500 / 3000, 5);
  });

  it('is numerically bounded even for extreme inputs', () => {
    let s = { f: 50, pPc: 0, t: 0 };
    const wild = { ...params, inertiaH: 1, sBaseMw: 50_000, pcGainMwPerHz: 0, dampingPctPerHz: 0 };
    for (let i = 0; i < 5000; i++) s = stepSwing(s, wild, -20_000, 0.05);
    expect(Number.isFinite(s.f)).toBe(true);
    expect(s.f).toBeGreaterThanOrEqual(40);
  });
});

describe('DC power flow', () => {
  it('solves a small linear system', () => {
    expect(solveLinear([[2, 1], [1, 3]], [3, 5])).toEqual([0.8, 1.4].map((v) => expect.closeTo(v, 9)));
    expect(solveLinear([[1, 2], [2, 4]], [1, 2])).toBeNull();
  });

  it('routes a two-node transfer entirely over the single line', () => {
    const res = dcPowerFlow(
      [
        { id: 'A', generationMw: 1000, loadMw: 0 },
        { id: 'B', generationMw: 0, loadMw: 1000 },
      ],
      [{ id: 'AB', from: 'A', to: 'B', reactancePu: 0.1, limitMw: 800 }],
      'B',
      1000,
    );
    expect(res.ok).toBe(true);
    expect(res.lines[0].flowMw).toBeCloseTo(1000, 6);
    expect(res.lines[0].overloaded).toBe(true);
    expect(res.lines[0].loading).toBeCloseTo(1.25, 6);
    expect(res.slackMw).toBeCloseTo(0, 6);
  });

  it('splits parallel paths inversely to reactance and conserves power', () => {
    const res = dcPowerFlow(
      [
        { id: 'A', generationMw: 900, loadMw: 0 },
        { id: 'B', generationMw: 0, loadMw: 900 },
      ],
      [
        { id: 'L1', from: 'A', to: 'B', reactancePu: 0.1, limitMw: 1000 },
        { id: 'L2', from: 'A', to: 'B', reactancePu: 0.2, limitMw: 1000 },
      ],
      'B',
      1000,
    );
    const f1 = res.lines[0].flowMw;
    const f2 = res.lines[1].flowMw;
    expect(f1 + f2).toBeCloseTo(900, 6);
    expect(f1 / f2).toBeCloseTo(2, 6);
  });

  it('balances an unbalanced system at the slack node', () => {
    const res = dcPowerFlow(
      [
        { id: 'A', generationMw: 500, loadMw: 0 },
        { id: 'B', generationMw: 0, loadMw: 800 },
      ],
      [{ id: 'AB', from: 'A', to: 'B', reactancePu: 0.1, limitMw: 1000 }],
      'B',
      1000,
    );
    expect(res.imbalanceMw).toBe(-300);
    expect(res.slackMw).toBe(300);
    expect(res.lines[0].flowMw).toBeCloseTo(500, 6);
  });
});
