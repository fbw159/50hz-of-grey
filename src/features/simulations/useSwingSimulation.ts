import { useCallback, useEffect, useRef, useState } from 'react';
import { fcrGain, stepSwing, type SwingParams, type SwingState } from '@/lib/engineeringMath';

export interface SimEvent {
  id: number;
  label: string;
  /** MW added to the imbalance (negative = deficit). */
  deltaMw: number;
  /** Remaining seconds (Infinity = until cleared). */
  remainingS: number;
}

export interface SimSnapshot {
  f: number;
  pPc: number;
  t: number;
  imbalanceMw: number;
  history: { t: number; f: number }[];
  events: SimEvent[];
  running: boolean;
}

export interface SimControls {
  generationMw: number; // manual generation offset
  loadMw: number; // manual load offset
  inertiaH: number;
  sBaseGw: number;
  fcrReserveMw: number;
  fcrEnabled: boolean;
  fcrTimeConstant: number;
  dampingPctPerHz: number;
}

export const DEFAULT_CONTROLS: SimControls = {
  generationMw: 0,
  loadMw: 0,
  inertiaH: 4,
  sBaseGw: 300,
  fcrReserveMw: 3000,
  fcrEnabled: true,
  fcrTimeConstant: 6,
  dampingPctPerHz: 1,
};

const DT = 0.05; // s
const HISTORY_SECONDS = 60;
const UI_FPS = 12;

export function paramsFromControls(c: SimControls): SwingParams {
  return {
    f0: 50,
    inertiaH: c.inertiaH,
    sBaseMw: c.sBaseGw * 1000,
    dampingPctPerHz: c.dampingPctPerHz,
    pcGainMwPerHz: c.fcrEnabled ? fcrGain(c.fcrReserveMw, 200) : 0,
    reserveMw: c.fcrReserveMw,
    pcTimeConstant: c.fcrTimeConstant,
  };
}

/** Real-time aggregated swing-equation simulation (teaching model). */
export function useSwingSimulation(controls: SimControls) {
  const stateRef = useRef<SwingState>({ f: 50, pPc: 0, t: 0 });
  const historyRef = useRef<{ t: number; f: number }[]>([]);
  const eventsRef = useRef<SimEvent[]>([]);
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);
  const eventSeq = useRef(0);
  const [running, setRunning] = useState(true);
  const runningRef = useRef(true);
  const [snapshot, setSnapshot] = useState<SimSnapshot>({ f: 50, pPc: 0, t: 0, imbalanceMw: 0, history: [], events: [], running: true });

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const imbalance = useCallback(() => {
    const c = controlsRef.current;
    const ev = eventsRef.current.reduce((s, e) => s + e.deltaMw, 0);
    return c.generationMw - c.loadMw + ev;
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let acc = 0;
    let uiAcc = 0;
    const loop = (nowMs: number) => {
      frame = requestAnimationFrame(loop);
      const elapsed = Math.min(0.25, (nowMs - last) / 1000);
      last = nowMs;
      if (!runningRef.current) return;
      acc += elapsed;
      uiAcc += elapsed;
      const params = paramsFromControls(controlsRef.current);
      while (acc >= DT) {
        acc -= DT;
        for (const e of eventsRef.current) if (Number.isFinite(e.remainingS)) e.remainingS -= DT;
        eventsRef.current = eventsRef.current.filter((e) => e.remainingS > 0);
        const s = stepSwing(stateRef.current, params, imbalance(), DT);
        stateRef.current = s;
        historyRef.current.push({ t: s.t, f: s.f });
        const cutoff = s.t - HISTORY_SECONDS;
        while (historyRef.current.length && historyRef.current[0].t < cutoff) historyRef.current.shift();
      }
      if (uiAcc >= 1 / UI_FPS) {
        uiAcc = 0;
        const s = stateRef.current;
        setSnapshot({ f: s.f, pPc: s.pPc, t: s.t, imbalanceMw: imbalance(), history: historyRef.current.filter((_, i) => i % 2 === 0), events: [...eventsRef.current], running: runningRef.current });
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [imbalance]);

  const addEvent = useCallback((label: string, deltaMw: number, durationS = Infinity) => {
    eventsRef.current = [...eventsRef.current, { id: ++eventSeq.current, label, deltaMw, remainingS: durationS }];
  }, []);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
  }, []);

  const reset = useCallback(() => {
    stateRef.current = { f: 50, pPc: 0, t: 0 };
    historyRef.current = [];
    eventsRef.current = [];
  }, []);

  return { snapshot, addEvent, clearEvents, reset, running, setRunning };
}
