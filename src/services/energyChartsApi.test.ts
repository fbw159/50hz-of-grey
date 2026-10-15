import { describe, expect, it, vi } from 'vitest';
import { ApiError, buildRequest, buildUrl, EnergyChartsClient, parseRetryAfter, RequestBudget } from './energyChartsApi';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

const okBody = {
  schema_version: '2.0',
  endpoint: 'price',
  timezone: 'Europe/Berlin',
  interval_minutes: 15,
  unit: 'EUR / MWh',
  generated_at: '2026-10-15T23:37:27+02:00',
  series: [{ id: 'day_ahead_price', name: 'p' }],
  data: [{ timestamp: '2026-10-15T00:00:00+02:00', values: { day_ahead_price: 12 } }],
  deprecated: false,
};

describe('request building', () => {
  it('builds Berlin-day based price requests', () => {
    const now = Date.UTC(2026, 9, 15, 21, 30); // 23:30 Berlin, 15 Oct
    const spec = buildRequest('price', now);
    expect(spec).toEqual({ endpoint: '/v2/price', params: { bzn: 'DE-LU', start: '2026-10-14', end: '2026-10-16' } });
    expect(buildUrl('https://api.example', spec)).toBe('https://api.example/v2/price?bzn=DE-LU&start=2026-10-14&end=2026-10-16');
    expect(buildRequest('frequency', now).params.region).toBe('DE-Freiburg');
    expect(buildRequest('forecastLoad', now).params.production_type).toBe('load');
  });

  it('parses Retry-After in seconds and as a date', () => {
    const now = Date.UTC(2026, 0, 1);
    expect(parseRetryAfter('30', now)).toBe(30_000);
    expect(parseRetryAfter(new Date(now + 5000).toUTCString(), now)).toBeGreaterThan(3000);
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter('garbage', now)).toBeUndefined();
  });
});

describe('RequestBudget', () => {
  it('mirrors a token bucket with burst and refill', () => {
    let t = 0;
    const b = new RequestBudget(4, 2, () => t);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(false);
    expect(b.waitTime()).toBeCloseTo(30_000, -2);
    t += 30_000;
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(false);
  });

  it('pauses after a 429', () => {
    let t = 0;
    const b = new RequestBudget(4, 2, () => t);
    b.pause(10_000);
    expect(b.take()).toBe(false);
    expect(b.waitTime()).toBe(10_000);
    t = 10_000;
    expect(b.take()).toBe(true);
  });
});

describe('EnergyChartsClient', () => {
  it('fetches, normalises and caches a dataset (dedupes concurrent calls)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody));
    const client = new EnergyChartsClient({ baseUrl: 'https://api.test', fetchImpl: fetchImpl as unknown as typeof fetch, clock: () => Date.UTC(2026, 9, 15, 12), sleep: async () => undefined });
    const [a, b] = await Promise.all([client.fetchDataset('price'), client.fetchDataset('price')]);
    expect(a).toBe(b);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(a.series[0].values).toEqual([12]);
    expect(a.origin).toBe('live');
    const c = await client.fetchDataset('price');
    expect(c).toBe(a); // cached
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('turns HTTP 429 into an ApiError with retry info and pauses the budget', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? jsonResponse('rate limited', 429, { 'Retry-After': '42' }) : jsonResponse(okBody);
    });
    const now = Date.UTC(2026, 9, 15, 12);
    const client = new EnergyChartsClient({ baseUrl: 'https://api.test', fetchImpl: fetchImpl as unknown as typeof fetch, clock: () => now, sleep: async () => undefined });
    await expect(client.fetchDataset('signal')).rejects.toMatchObject({ status: 429, retryAfterMs: 42_000 });
  });

  it('treats 404 for forecasts as expected, other 404s as errors', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse('no content available', 404));
    const client = new EnergyChartsClient({ baseUrl: 'https://api.test', fetchImpl: fetchImpl as unknown as typeof fetch, clock: () => Date.UTC(2026, 9, 15, 12), sleep: async () => undefined });
    const err = (await client.fetchDataset('forecastSolar').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.expected).toBe(true);
    const err2 = (await client.fetchDataset('publicPower').catch((e: unknown) => e)) as ApiError;
    expect(err2.expected).toBe(false);
  });

  it('rejects invalid JSON and network failures with ApiError', async () => {
    const bad = new EnergyChartsClient({ baseUrl: 'https://api.test', fetchImpl: (async () => jsonResponse('<html>', 200)) as unknown as typeof fetch, clock: () => 1, sleep: async () => undefined });
    await expect(bad.fetchDataset('price')).rejects.toThrow(/JSON/);
    const offline = new EnergyChartsClient({
      baseUrl: 'https://api.test',
      fetchImpl: (async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch,
      clock: () => 1,
      sleep: async () => undefined,
    });
    await expect(offline.fetchDataset('price')).rejects.toThrow(/Netzwerkfehler/);
  });
});
