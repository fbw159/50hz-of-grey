/**
 * Everything the page shows, derived from the datasets in one pure function
 * (easy to test, cheap to memoise).
 */
import type { DatasetMap } from '@/types/data';
import { getFrequencyStatus, getFrequencyWindow, type FrequencyStatus, type FrequencyWindow } from './frequency';
import { getPriceOverview, hourlyPrices, priceExtremes, type HourPrice, type PriceExtremes, type PriceOverview } from './price';
import { getGenerationStatus, getInstalledCapacity, getMixRows, type GenerationStatus, type MixRow } from './mix';
import { computePanic, type PanicResult } from './panic';
import { buildHeadline, type Headline } from './headline';
import { buildWeather, type WeatherBlock } from './weather';

/** Jokes and headlines rotate every ten minutes. */
export const SLOT_MS = 10 * 60_000;

export function slotOf(now: number): string {
  return String(Math.floor(now / SLOT_MS));
}

export interface DayView {
  dayKey: string;
  hours: HourPrice[];
  extremes: PriceExtremes | null;
  complete: boolean;
}

export interface GridView {
  frequency: FrequencyStatus | null;
  /** Last 10 minutes for the EKG – raw 1-second values (replayed in "Netz-TV"). */
  ekg: FrequencyWindow | null;
  /** Last hour for min/max. */
  hour: FrequencyWindow | null;
  price: PriceOverview | null;
  today: DayView | null;
  tomorrow: DayView | null;
  generation: GenerationStatus | null;
  mix: MixRow[];
  panic: PanicResult | null;
  headline: Headline | null;
  weather: WeatherBlock[];
}

function dayView(day: PriceOverview['today'] | null): DayView | null {
  if (!day || day.count === 0) return null;
  const hours = hourlyPrices(day);
  return { dayKey: day.dayKey, hours, extremes: priceExtremes(hours), complete: day.complete };
}

export function buildView(datasets: DatasetMap, now: number): GridView {
  const frequency = getFrequencyStatus(datasets.frequency, now);
  const price = getPriceOverview(datasets.price, now);
  const generation = getGenerationStatus(datasets.publicPower, now);
  const mix = getMixRows(generation, getInstalledCapacity(datasets.installedPower));
  // stale measurements don't count as "current"
  const freshGeneration = generation && !generation.stale ? generation : null;
  const panic = computePanic({
    deviationMilliHz: frequency && !frequency.stale ? frequency.deviationMilliHz : null,
    priceEurMwh: price?.current?.value ?? null,
    renewableSharePct: freshGeneration?.renewableShareOfLoad ?? null,
  });
  const headline = buildHeadline({ frequency, priceEurMwh: price?.current?.value ?? null, generation: freshGeneration }, slotOf(now));
  return {
    frequency,
    ekg: getFrequencyWindow(datasets.frequency, 10, 700),
    hour: getFrequencyWindow(datasets.frequency, 60, 60),
    price,
    today: dayView(price?.today ?? null),
    tomorrow: dayView(price?.tomorrow ?? null),
    generation,
    mix,
    panic,
    headline,
    weather: buildWeather(datasets, now),
  };
}
