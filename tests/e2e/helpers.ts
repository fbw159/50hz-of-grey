import type { BrowserContext, Page } from '@playwright/test';

export interface ConsoleWatcher {
  errors: string[];
  failedRequests: string[];
}

/** Collect console errors, page errors and failed same-origin requests. */
export function watchConsole(page: Page): ConsoleWatcher {
  const w: ConsoleWatcher = { errors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') w.errors.push(msg.text());
  });
  page.on('pageerror', (err) => w.errors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && url.includes('localhost')) w.failedRequests.push(`${res.status()} ${url}`);
  });
  return w;
}

export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

const QUARTER = 15 * 60_000;

/** A small but complete snapshot in the format written by scripts/update-data.mjs. */
export function makeSnapshot(now = Date.now()) {
  const iso = (t: number) => new Date(t).toISOString();
  const fStart = Math.floor(now / 1000) * 1000 - 15 * 60_000;
  const fCount = 15 * 60;
  const pStart = Math.floor(now / QUARTER) * QUARTER - 24 * 3_600_000;
  const pCount = 4 * 24 * 3; // yesterday … tomorrow
  const gStart = Math.floor(now / QUARTER) * QUARTER - 3 * 3_600_000;
  const gCount = 8;
  const ds = (endpoint: string, unit: string, start: number, stepMs: number, count: number, values: Record<string, number[]>, extra: object = {}) => ({
    status: 'ok',
    endpoint,
    params: {},
    fetchedAt: iso(now - 60_000),
    error: null,
    timezone: 'Europe/Berlin',
    unit,
    availableFrom: iso(start),
    availableUntil: iso(start + (count - 1) * stepMs),
    license: 'CC BY 4.0',
    attributes: {},
    series: Object.keys(values).map((id) => ({ id, name: id, unit: id.includes('share') ? '%' : unit })),
    time: { start, stepMs, count },
    values,
    ...extra,
  });
  const range = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => Math.round(f(i) * 10_000) / 10_000);
  return {
    schemaVersion: 1,
    generator: 'e2e-fixture',
    fetchedAt: iso(now - 60_000),
    source: { name: 'fixture', url: 'x', license: 'CC BY 4.0' },
    datasets: {
      frequency: ds('/v2/frequency', 'Hz', fStart, 1000, fCount, { frequency: range(fCount, (i) => 50 + 0.018 * Math.sin(i / 40)) }, { timezone: 'UTC', resolution: null }),
      price: ds('/v2/price', 'EUR / MWh', pStart, QUARTER, pCount, { day_ahead_price: range(pCount, (i) => 90 + 70 * Math.sin(i / 15)) }, { resolution: 'PT15M', intervalMinutes: 15 }),
      forecastSolar: ds('/v2/public_power_forecast', 'MW', pStart, QUARTER, pCount, { solar: range(pCount, (i) => Math.max(0, 30_000 * Math.sin(((i % 96) - 28) / 40 * Math.PI))) }, { resolution: 'PT15M', intervalMinutes: 15 }),
      forecastWindOnshore: ds('/v2/public_power_forecast', 'MW', pStart, QUARTER, pCount, { wind_onshore: range(pCount, () => 16_000) }, { resolution: 'PT15M', intervalMinutes: 15 }),
      forecastWindOffshore: ds('/v2/public_power_forecast', 'MW', pStart, QUARTER, pCount, { wind_offshore: range(pCount, () => 5000) }, { resolution: 'PT15M', intervalMinutes: 15 }),
      publicPower: ds(
        '/v2/public_power',
        'MW',
        gStart,
        QUARTER,
        gCount,
        {
          solar: range(gCount, () => 12_000),
          wind_onshore: range(gCount, () => 14_000),
          wind_offshore: range(gCount, () => 4000),
          fossil_brown_coal_lignite: range(gCount, () => 9000),
          fossil_hard_coal: range(gCount, () => 2500),
          fossil_gas: range(gCount, () => 6000),
          biomass: range(gCount, () => 4000),
          hydro_run_of_river: range(gCount, () => 1200),
          load: range(gCount, () => 55_000),
          cross_border_electricity_trading: range(gCount, () => -1500),
          renewable_share_of_load: range(gCount, () => 64),
        },
        { resolution: 'PT15M', intervalMinutes: 15 },
      ),
    },
    errors: [],
  };
}

export async function serveSnapshot(context: BrowserContext, snapshot: unknown) {
  await context.route('**/data/latest.json*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }));
}
