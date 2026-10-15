/**
 * Number & unit formatting (German locale). Power and energy are never mixed:
 * power in W/kW/MW/GW, energy in Wh/kWh/MWh/GWh/TWh.
 */

export const MINUS = '−'; // proper minus sign
export const NBSP = ' ';

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max });
    nfCache.set(key, f);
  }
  return f;
}

/** de-DE formatting with a typographic minus. */
export function formatNumber(value: number | null | undefined, digits = 1, minDigits = digits): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return nf(minDigits, digits).format(value).replace('-', MINUS);
}

export function mwToGw(mw: number): number {
  return mw / 1000;
}

export function gwToMw(gw: number): number {
  return gw * 1000;
}

/** Day-ahead prices are quoted in EUR/MWh. 1 EUR/MWh = 0.1 ct/kWh. */
export function eurPerMwhToCtPerKwh(eurPerMwh: number): number {
  return eurPerMwh / 10;
}

/** Power with automatic unit: ≥ 1000 MW → GW (1 decimal), else MW (0 decimals). */
export function formatPower(mw: number | null | undefined, opts: { gwDigits?: number; forceGw?: boolean } = {}): string {
  if (mw === null || mw === undefined || !Number.isFinite(mw)) return '–';
  const { gwDigits = 1, forceGw = false } = opts;
  if (forceGw || Math.abs(mw) >= 1000) return `${formatNumber(mwToGw(mw), gwDigits)}${NBSP}GW`;
  return `${formatNumber(mw, 0)}${NBSP}MW`;
}

export function formatGw(gw: number | null | undefined, digits = 1): string {
  if (gw === null || gw === undefined || !Number.isFinite(gw)) return '–';
  return `${formatNumber(gw, digits)}${NBSP}GW`;
}

export function formatPrice(eurPerMwh: number | null | undefined, digits = 2): string {
  if (eurPerMwh === null || eurPerMwh === undefined || !Number.isFinite(eurPerMwh)) return '–';
  return `${formatNumber(eurPerMwh, digits)}${NBSP}€/MWh`;
}

export function formatCtPerKwh(eurPerMwh: number | null | undefined, digits = 2): string {
  if (eurPerMwh === null || eurPerMwh === undefined || !Number.isFinite(eurPerMwh)) return '–';
  return `${formatNumber(eurPerMwhToCtPerKwh(eurPerMwh), digits)}${NBSP}ct/kWh`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${formatNumber(value, digits)}${NBSP}%`;
}

export function formatHz(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${formatNumber(value, digits, digits)}${NBSP}Hz`;
}

/** Deviation from 50 Hz in mHz with sign: "+12 mHz", "−7 mHz". */
export function formatMilliHz(deviationHz: number | null | undefined, digits = 0): string {
  if (deviationHz === null || deviationHz === undefined || !Number.isFinite(deviationHz)) return '–';
  const mhz = deviationHz * 1000;
  const sign = mhz > 0 ? '+' : mhz < 0 ? MINUS : '±';
  return `${sign}${formatNumber(Math.abs(mhz), digits)}${NBSP}mHz`;
}

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

/** Clamp helper used throughout the satire math. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
