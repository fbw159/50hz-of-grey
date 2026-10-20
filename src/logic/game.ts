/**
 * "Halt die 50 Hz!" – a deliberately simple balancing game. The physics is a
 * toy model (one lumped grid, linear damping), tuned to be playable on a
 * phone, not to reproduce real grid dynamics:
 *
 *   df/dt = −K · (load − generation) − D · (f − 50 Hz)
 *
 * Events change the load (positive = more consumption or a lost power plant),
 * the player changes the generation in 1-GW steps.
 */

export const GAME_DURATION_S = 45;
export const LIMIT_HZ = 0.2;
export const CALM_HZ = 0.05;
/** Hz per second and GW of imbalance. */
export const K = 0.02;
/** 1/s – self-regulation of the toy grid. */
export const D = 0.15;
export const STEP_GW = 1;

export interface GameEvent {
  id: string;
  emoji: string;
  text: string;
  /** GW of extra load (negative: less load / extra generation). */
  gw: number;
}

export const GAME_EVENTS: GameEvent[] = [
  { id: 'halftime', emoji: '⚽', text: 'Halbzeitpause! Millionen Wasserkocher gehen an.', gw: 3 },
  { id: 'cloud', emoji: '☁️', text: 'Eine Wolkenfront zieht über Bayern. Der Solarstrom bricht ein.', gw: 2 },
  { id: 'trip', emoji: '🏭', text: 'Ein Kraftwerksblock stolpert und fliegt vom Netz.', gw: 4 },
  { id: 'storm', emoji: '🌬️', text: 'Sturmtief zieht durch. Die Windräder drehen auf.', gw: -3 },
  { id: 'sun', emoji: '☀️', text: 'Die Sonne kommt raus. Die Solaranlagen legen los.', gw: -2 },
  { id: 'tatort', emoji: '📺', text: 'Tatort ist vorbei. Halb Deutschland geht ins Bett.', gw: -2 },
  { id: 'ev', emoji: '🚗', text: 'Feierabend: Eine Million E-Autos hängen sich ans Netz.', gw: 2 },
  { id: 'canteen', emoji: '🍝', text: 'Mittagspause. Alle Kantinen heizen gleichzeitig hoch.', gw: 1 },
  { id: 'xmas', emoji: '🎄', text: 'Die Weihnachtsbeleuchtung im ganzen Land geht an.', gw: 2 },
  { id: 'smelter', emoji: '🛑', text: 'Ein Aluminiumwerk macht Feierabend.', gw: -2 },
  { id: 'heatpump', emoji: '🥶', text: 'Kältewelle! Die Wärmepumpen geben alles.', gw: 2 },
  { id: 'battery', emoji: '🔋', text: 'Ein Großspeicher springt ein und speist ein.', gw: -1 },
  { id: 'pump', emoji: '💧', text: 'Ein Pumpspeicher fängt an, Wasser bergauf zu pumpen.', gw: 1 },
  { id: 'server', emoji: '🖥️', text: 'Ein Rechenzentrum startet ein KI-Training.', gw: 1 },
];

export type GameStatus = 'running' | 'won' | 'low' | 'high';

export interface GameState {
  /** Seconds since start. */
  t: number;
  /** Frequency in Hz. */
  f: number;
  /** load − generation in GW (positive = too little power). */
  imbalanceGw: number;
  status: GameStatus;
  event: (GameEvent & { gwScaled: number; at: number }) | null;
  nextEventAt: number;
  /** Seconds spent within ±CALM_HZ. */
  calmSeconds: number;
  taps: number;
}

export type Rng = () => number;

export function newGame(rng: Rng): GameState {
  return { t: 0, f: 50, imbalanceGw: 0, status: 'running', event: null, nextEventAt: 1.5 + rng() * 1.5, calmSeconds: 0, taps: 0 };
}

/** Events get stronger and more frequent over time. */
export function difficulty(t: number): number {
  return 1 + Math.min(1, t / GAME_DURATION_S) * 0.6;
}

function nextEventDelay(t: number, rng: Rng): number {
  const base = 4.2 - 1.8 * Math.min(1, t / GAME_DURATION_S);
  return base + rng() * 1.6;
}

export function pickEvent(rng: Rng, previous: GameEvent | null): GameEvent {
  let e = GAME_EVENTS[Math.floor(rng() * GAME_EVENTS.length)];
  if (previous && e.id === previous.id) e = GAME_EVENTS[(GAME_EVENTS.indexOf(e) + 1) % GAME_EVENTS.length];
  return e;
}

/** Advance the simulation by dt seconds (dt is clamped to keep it stable). */
export function step(state: GameState, dtRaw: number, rng: Rng): GameState {
  if (state.status !== 'running') return state;
  const dt = Math.min(Math.max(dtRaw, 0), 0.1);
  let { imbalanceGw, event, nextEventAt } = state;
  const t = state.t + dt;
  if (t >= nextEventAt) {
    const base = pickEvent(rng, event);
    const gwScaled = Math.round(base.gw * difficulty(t));
    imbalanceGw += gwScaled;
    event = { ...base, gwScaled, at: t };
    nextEventAt = t + nextEventDelay(t, rng);
  }
  // a little noise so the needle never sits perfectly still
  const noise = (rng() - 0.5) * 0.004;
  const dfdt = -K * imbalanceGw - D * (state.f - 50);
  const f = state.f + dfdt * dt + noise * dt;
  const calmSeconds = state.calmSeconds + (Math.abs(f - 50) <= CALM_HZ ? dt : 0);
  let status: GameStatus = 'running';
  if (f <= 50 - LIMIT_HZ) status = 'low';
  else if (f >= 50 + LIMIT_HZ) status = 'high';
  else if (t >= GAME_DURATION_S) status = 'won';
  return { ...state, t: Math.min(t, GAME_DURATION_S), f, imbalanceGw, event, nextEventAt, calmSeconds, status };
}

/** Player action: +1 (more generation) or −1 (less generation). */
export function adjust(state: GameState, direction: 1 | -1): GameState {
  if (state.status !== 'running') return state;
  return { ...state, imbalanceGw: state.imbalanceGw - direction * STEP_GW, taps: state.taps + 1 };
}

export interface GameRank {
  title: string;
  text: string;
}

export function rankFor(state: GameState): GameRank {
  const calmShare = state.t > 0 ? state.calmSeconds / state.t : 0;
  if (state.status === 'won') {
    if (calmShare >= 0.8) return { title: 'Legende der Leitwarte', text: 'Fast die ganze Zeit im grünen Bereich. Die Netzbetreiber wollen deine Nummer.' };
    if (calmShare >= 0.5) return { title: 'Frequenz-Flüsterer', text: 'Durchgehalten und dabei meistens ruhig geblieben. Respekt.' };
    return { title: 'Netzretter mit Schweißflecken', text: 'Geschafft! Schön war es nicht, aber das Licht blieb an.' };
  }
  if (state.t < 12) return { title: 'Azubi, erstes Lehrjahr', text: 'Kein Problem, das Netz verzeiht. Meistens.' };
  if (state.t < 30) return { title: 'Schichtleitung auf Probe', text: 'Gar nicht schlecht. Beim nächsten Mal schneller gegensteuern.' };
  return { title: 'Beinahe-Held', text: 'So knapp! Noch ein paar Sekunden und du hättest es geschafft.' };
}

export function lossText(status: GameStatus): string | null {
  if (status === 'low') return 'Unter 49,8 Hz: In einer echten Leitwarte würde jetzt das Alarmtelefon klingeln.';
  if (status === 'high') return 'Über 50,2 Hz: Solaranlagen regeln sich ab hier automatisch herunter. In echt. Hier ist einfach Schluss.';
  return null;
}

export interface GameBest {
  seconds: number;
  won: boolean;
}

/** A won round beats any lost one; otherwise longer is better. */
export function isBetter(a: GameBest, b: GameBest | null): boolean {
  if (!b) return true;
  if (a.won !== b.won) return a.won;
  return a.seconds > b.seconds;
}
