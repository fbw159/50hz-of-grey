import { useMemo } from 'react';
import { useGridData } from '@/hooks/useGridData';
import { useNow } from '@/hooks/useNow';
import { computeBureaucracyIndex } from '@/lib/bureaucracy';
import { getFrequencyStatus } from '@/features/frequency/frequencyMetrics';
import { getPriceOverview } from '@/features/prices/priceMetrics';
import { getGenerationStatus } from '@/features/production/productionMetrics';
import { getDefconStatus } from '@/features/dunkelflaute/defcon';
import { computePanicIndex, type PanicResult } from './panicIndex';

/** Grid Panic Index™ derived from the current datasets (recomputed every minute). */
export function usePanicIndex(): { panic: PanicResult | null; bureaucracy: ReturnType<typeof computeBureaucracyIndex> } {
  const data = useGridData();
  const now = useNow(60_000);
  return useMemo(() => {
    const bureaucracy = computeBureaucracyIndex(now);
    const hasData = !!(data.datasets.price || data.datasets.publicPower || data.datasets.frequency);
    if (!hasData) return { panic: null, bureaucracy };
    const freq = getFrequencyStatus(data.datasets.frequency, now);
    const price = getPriceOverview(data.datasets.price, now);
    const gen = getGenerationStatus(data.datasets.publicPower, now);
    const defcon = getDefconStatus(data.datasets.publicPower, data.datasets.installedPower, now, 6);
    const panic = computePanicIndex({
      priceEurPerMwh: price?.current?.value ?? null,
      negativePriceNow: price?.negativeNow ?? false,
      negativeIntervalsToday: price?.today.negativeCount ?? 0,
      renewableShare: gen?.renewableShareOfLoad ?? null,
      frequencyDeviationMilliHz: freq?.deviationMilliHz ?? null,
      vreCapacityFactor: defcon?.cf ?? null,
      bureaucracyIndex: bureaucracy.value,
      now,
    });
    return { panic, bureaucracy };
  }, [data.datasets, now]);
}
