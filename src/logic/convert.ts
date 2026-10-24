/**
 * "Was heißt das auf Deutsch?" – real numbers converted into everyday (and
 * slightly absurd) units. Every factor is documented so the jokes stay correct.
 */

/** Hamburg – München, straight line, rounded (≈ 612 km). */
export const HAMBURG_MUNICH_KM = 610;
/** Flux capacitor requirement from the film: 1.21 gigawatts. */
export const DELOREAN_MW = 1210;
/** 1 metric horsepower (PS) = 735.49875 W. */
export const PS_W = 735.49875;
/** What a fit hobby cyclist keeps up on a home trainer. */
export const CYCLIST_W = 100;
/** A typical kettle. */
export const KETTLE_W = 2000;
/** Population of Germany, rounded (Destatis, 2024: about 83.6 million). */
export const GERMANY_POPULATION = 83_600_000;

/** Typical energy needs in kWh (rounded, for "grob" comparisons). */
export const WASH_KWH = 1; // one load at 60 °C
export const EV_BATTERY_KWH = 50; // a mid-size electric car battery
export const FRIDGE_YEAR_KWH = 150; // an efficient fridge per year

/**
 * Relative frequency error expressed as a parking error on the way from
 * Hamburg to Munich: 13 mHz of 50 Hz = 0.026 % → about 159 m.
 */
export function precisionMeters(deviationMilliHz: number, distanceKm = HAMBURG_MUNICH_KM): number {
  return (distanceKm * 1000 * Math.abs(deviationMilliHz)) / 50_000;
}

export interface PowerEquivalents {
  deloreans: number;
  horsepower: number;
  cyclists: number;
  /** cyclists / population of Germany */
  cyclistsPerGerman: number;
  kettles: number;
}

export function powerEquivalents(mw: number): PowerEquivalents {
  const watts = Math.max(0, mw) * 1e6;
  const cyclists = watts / CYCLIST_W;
  return {
    deloreans: Math.max(0, mw) / DELOREAN_MW,
    horsepower: watts / PS_W,
    cyclists,
    cyclistsPerGerman: cyclists / GERMANY_POPULATION,
    kettles: watts / KETTLE_W,
  };
}

export interface PriceEquivalents {
  /** ct per wash (sign kept: negative = you get money) */
  washCt: number;
  /** € per full EV battery */
  evEur: number;
  /** € per fridge-year */
  fridgeEur: number;
}

/** Wholesale cost (EUR/MWh → ct/kWh = /10) of everyday things, without taxes and grid fees. */
export function priceEquivalents(eurMwh: number): PriceEquivalents {
  const ctPerKwh = eurMwh / 10;
  return {
    washCt: ctPerKwh * WASH_KWH,
    evEur: (ctPerKwh * EV_BATTERY_KWH) / 100,
    fridgeEur: (ctPerKwh * FRIDGE_YEAR_KWH) / 100,
  };
}

const nf = (digits: number) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Big numbers in words: 1,2 Milliarden · 79 Millionen · 4.300. */
export function formatBig(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${nf(a >= 1e10 ? 0 : 1).format(n / 1e9)} Milliarden`;
  if (a >= 1e6) return `${nf(a >= 1e7 ? 0 : 1).format(n / 1e6)} Millionen`;
  return nf(0).format(n);
}
