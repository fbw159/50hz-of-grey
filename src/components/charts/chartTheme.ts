import type { GenerationCategoryId } from '@/features/production/productionMetrics';

/** Category colours – distinct in dark and light themes, never the status colours. */
export const CATEGORY_COLORS: Record<GenerationCategoryId, string> = {
  solar: '#FDE047',
  windOnshore: '#38BDF8',
  windOffshore: '#2563EB',
  hydro: '#2DD4BF',
  biomass: '#4ADE80',
  lignite: '#A16207',
  hardCoal: '#78716C',
  gas: '#FB923C',
  pumpedStorage: '#A78BFA',
  other: '#94A3B8',
};

export const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

export const axisStyle = { fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--c-text-3)' } as const;

export const tooltipWrapperStyle = { outline: 'none', zIndex: 20 } as const;
