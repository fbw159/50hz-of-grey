/**
 * DEMO MODE – simulated data.
 *
 * Plausible, deterministic example data used only when the user switches the
 * demo mode on (or explicitly chooses it after every real source failed).
 * Every dataset carries origin "demo" and the UI shows "DEMO – SIMULIERTE
 * DATEN" wherever these values appear. Real and demo data never mix.
 */
import type { Dataset, DatasetKey, DatasetMap, NormalizedSeries } from '@/types/data';
import { addDaysToKey, berlinDayKey, startOfBerlinDay, zonedParts, MINUTE, HOUR } from '@/lib/dateUtils';
import { seededRandom } from '@/lib/timeseries';

const QUARTER = 15 * MINUTE;

function base(key: DatasetKey, endpoint: string, unit: string | null, timestamps: number[], series: NormalizedSeries[], now: number, intervalMs: number | null, extra: Partial<Dataset> = {}): Dataset {
  return {
    key,
    endpoint,
    params: { demo: 'true' },
    origin: 'demo',
    timezone: 'Europe/Berlin',
    resolution: intervalMs === QUARTER ? 'PT15M' : intervalMs === 1000 ? 'PT1S' : null,
    intervalMs,
    unit,
    generatedAt: now,
    fetchedAt: now,
    availableFrom: timestamps[0] ?? null,
    availableUntil: timestamps[timestamps.length - 1] ?? null,
    license: 'Demo-Daten (simuliert) – keine Messwerte',
    attributes: { demo: true },
    timestamps,
    series,
    ...extra,
  };
}

/** Smooth daily shape helpers (hour as fractional local hour). */
function solarShape(hour: number, dayFactor: number): number {
  const x = (hour - 13) / 3.6;
  const v = Math.exp(-x * x) * 36_000 * dayFactor; // MW, peak ≈ 36 GW
  return hour < 6.5 || hour > 19.5 ? 0 : v;
}

function quarterGrid(dayKey: string, days: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < days; d++) {
    const key = addDaysToKey(dayKey, d);
    const start = startOfBerlinDay(key);
    const end = startOfBerlinDay(addDaysToKey(key, 1));
    for (let t = start; t < end; t += QUARTER) out.push(t);
  }
  return out;
}

export function buildDemoDatasets(now: number): DatasetMap {
  const today = berlinDayKey(now);
  const rnd = seededRandom(`demo-${today}`);
  const noise = (amp: number) => (rnd() - 0.5) * 2 * amp;

  // ---- public power: day-2 … today, until now − 2 h (like the real feed) ----
  const ppTimestamps = quarterGrid(addDaysToKey(today, -2), 3).filter((t) => t <= now - 2 * HOUR);
  const mk = (): (number | null)[] => [];
  const cols = {
    solar: mk(),
    wind_onshore: mk(),
    wind_offshore: mk(),
    hydro_run_of_river: mk(),
    biomass: mk(),
    fossil_brown_coal_lignite: mk(),
    fossil_hard_coal: mk(),
    fossil_gas: mk(),
    hydro_pumped_storage: mk(),
    hydro_pumped_storage_consumption: mk(),
    others: mk(),
    waste: mk(),
    load: mk(),
    residual_load: mk(),
    renewable_share_of_load: mk(),
    renewable_share_of_generation: mk(),
  };
  let windPhase = rnd() * Math.PI * 2;
  ppTimestamps.forEach((t, i) => {
    const p = zonedParts(t);
    const hour = p.hour + p.minute / 60;
    const dayIndex = Math.floor(i / 96);
    const dayFactor = [0.55, 0.85, 1.0][dayIndex] ?? 1;
    windPhase += 0.02;
    const windOn = 9000 + 7000 * Math.sin(windPhase + dayIndex) + 2500 * Math.sin(windPhase * 3.1) + noise(400);
    const windOff = 3500 + 1800 * Math.sin(windPhase * 0.7 + 1) + noise(150);
    const solar = solarShape(hour, dayFactor) + (hour > 6.5 && hour < 19.5 ? noise(600) : 0);
    const load = 46_000 + 14_000 * Math.exp(-(((hour - 12) / 5.5) ** 2)) + 4000 * Math.exp(-(((hour - 19) / 2) ** 2)) - (p.weekday === 0 || p.weekday === 6 ? 6000 : 0) + noise(500);
    const biomass = 4150 + noise(60);
    const hydro = 1250 + noise(40);
    const waste = 1200 + noise(30);
    const others = 320 + noise(20);
    const renewables = Math.max(0, windOn) + Math.max(0, windOff) + Math.max(0, solar) + biomass + hydro;
    const residual = load - Math.max(0, windOn) - Math.max(0, windOff) - Math.max(0, solar);
    const thermalNeed = Math.max(3000, residual - biomass - hydro - waste - others);
    const lignite = Math.min(10_500, 5200 + thermalNeed * 0.28 + noise(150));
    const hardCoal = Math.min(6500, 1800 + thermalNeed * 0.12 + noise(120));
    const gas = Math.max(1500, thermalNeed - lignite - hardCoal + 2000 + noise(300));
    const pumpGen = hour >= 17 && hour <= 21 ? 1800 + noise(300) : 350 + noise(100);
    const pumpCons = hour >= 11 && hour <= 15 ? -(1500 + noise(300)) : -(120 + noise(60));
    const generation = renewables + waste + others + lignite + hardCoal + gas + pumpGen;
    cols.solar.push(round1(Math.max(0, solar)));
    cols.wind_onshore.push(round1(Math.max(300, windOn)));
    cols.wind_offshore.push(round1(Math.max(200, windOff)));
    cols.hydro_run_of_river.push(round1(hydro));
    cols.biomass.push(round1(biomass));
    cols.fossil_brown_coal_lignite.push(round1(lignite));
    cols.fossil_hard_coal.push(round1(hardCoal));
    cols.fossil_gas.push(round1(gas));
    cols.hydro_pumped_storage.push(round1(pumpGen));
    cols.hydro_pumped_storage_consumption.push(round1(pumpCons));
    cols.others.push(round1(others));
    cols.waste.push(round1(waste));
    cols.load.push(round1(load));
    cols.residual_load.push(round1(residual));
    cols.renewable_share_of_load.push(round1(Math.min(100, (renewables / load) * 100)));
    cols.renewable_share_of_generation.push(round1(Math.min(100, (renewables / generation) * 100)));
  });
  const ppNames: Record<string, string> = {
    solar: 'Solar',
    wind_onshore: 'Wind onshore',
    wind_offshore: 'Wind offshore',
    hydro_run_of_river: 'Hydro Run-of-River',
    biomass: 'Biomass',
    fossil_brown_coal_lignite: 'Fossil brown coal / lignite',
    fossil_hard_coal: 'Fossil hard coal',
    fossil_gas: 'Fossil gas',
    hydro_pumped_storage: 'Hydro pumped storage',
    hydro_pumped_storage_consumption: 'Hydro pumped storage consumption',
    others: 'Others',
    waste: 'Waste',
    load: 'Load',
    residual_load: 'Residual load',
    renewable_share_of_load: 'Renewable share of load',
    renewable_share_of_generation: 'Renewable share of generation',
  };
  const ppSeries: NormalizedSeries[] = Object.entries(cols).map(([id, values]) => ({
    id,
    name: ppNames[id] ?? id,
    unit: id.startsWith('renewable_share') ? '%' : 'MW',
    values,
  }));
  const publicPower = base('publicPower', '/v2/public_power', 'MW', ppTimestamps, ppSeries, now, QUARTER);

  // ---- prices: yesterday … tomorrow, with a negative midday today ----
  const priceTimestamps = quarterGrid(addDaysToKey(today, -1), 3);
  const priceValues: (number | null)[] = priceTimestamps.map((t, i) => {
    const p = zonedParts(t);
    const hour = p.hour + p.minute / 60;
    const dayIndex = Math.floor(i / 96);
    const night = 72 + 10 * Math.sin(hour / 2);
    const morning = 55 * Math.exp(-(((hour - 8) / 1.4) ** 2));
    const evening = 85 * Math.exp(-(((hour - 19) / 1.6) ** 2));
    const solarDip = [40, 110, 70][dayIndex] * Math.exp(-(((hour - 13) / 2.6) ** 2));
    return round2(night + morning + evening - solarDip + noise(4));
  });
  const price = base('price', '/v2/price', 'EUR / MWh', priceTimestamps, [{ id: 'day_ahead_price', name: 'Day-ahead spot market price', unit: 'EUR / MWh', values: priceValues }], now, QUARTER, {
    params: { demo: 'true', bzn: 'DE-LU' },
  });

  // ---- frequency: last 60 min at 1 s, bounded random walk around 50 Hz ----
  const freqStart = Math.floor((now - 60 * MINUTE) / 1000) * 1000;
  const freqTimestamps: number[] = [];
  const freqValues: (number | null)[] = [];
  let f = 50 + noise(0.01);
  let drift = 0;
  for (let t = freqStart; t <= now - 45_000; t += 1000) {
    drift = drift * 0.995 + noise(0.0006) - (f - 50) * 0.004;
    f = Math.max(49.93, Math.min(50.07, f + drift));
    freqTimestamps.push(t);
    freqValues.push(Math.round(f * 10_000) / 10_000);
  }
  const frequency = base('frequency', '/v2/frequency', 'Hz', freqTimestamps, [{ id: 'frequency', name: 'Grid frequency', unit: 'Hz', description: 'Demo – simulierter Verlauf', values: freqValues }], now, 1000, {
    attributes: { demo: true, region: 'DEMO' },
  });

  // ---- signal + forecasts: today & tomorrow ----
  const fcTimestamps = quarterGrid(today, 2);
  const signalShare: (number | null)[] = [];
  const signalCat: (number | null)[] = [];
  const fcSolar: (number | null)[] = [];
  const fcWindOn: (number | null)[] = [];
  const fcWindOff: (number | null)[] = [];
  const fcLoad: (number | null)[] = [];
  let phase = rnd() * 6;
  fcTimestamps.forEach((t, i) => {
    const p = zonedParts(t);
    const hour = p.hour + p.minute / 60;
    const dayIndex = Math.floor(i / 96);
    phase += 0.02;
    const solar = solarShape(hour, dayIndex === 0 ? 1.0 : 0.8);
    const windOn = 9500 + 6500 * Math.sin(phase + dayIndex) + noise(200);
    const windOff = 3600 + 1700 * Math.sin(phase * 0.7 + 1);
    const load = 46_000 + 14_000 * Math.exp(-(((hour - 12) / 5.5) ** 2)) + 4000 * Math.exp(-(((hour - 19) / 2) ** 2));
    const share = Math.min(100, ((solar + Math.max(0, windOn) + Math.max(0, windOff) + 5400) / load) * 100);
    fcSolar.push(round1(solar));
    fcWindOn.push(round1(Math.max(300, windOn)));
    fcWindOff.push(round1(Math.max(200, windOff)));
    fcLoad.push(round1(load));
    signalShare.push(round1(share));
    signalCat.push(share > 65 ? 2 : share > 40 ? 1 : 0);
  });
  const signal = base('signal', '/v2/signal', '%', fcTimestamps, [
    { id: 'share', name: 'Renewable share of load', unit: '%', values: signalShare },
    { id: 'signal', name: 'Traffic signal', unit: 'category', description: '-1: red (grid congestion), 0: red (low renewable share), 1: yellow (average), 2: green (high)', values: signalCat },
  ], now, QUARTER);
  const forecastSolar = base('forecastSolar', '/v2/public_power_forecast', 'MW', fcTimestamps, [{ id: 'solar', name: 'Solar forecast (day-ahead)', unit: 'MW', values: fcSolar }], now, QUARTER, { attributes: { demo: true, forecast_type: 'day-ahead', production_type: 'solar' } });
  const forecastWindOnshore = base('forecastWindOnshore', '/v2/public_power_forecast', 'MW', fcTimestamps, [{ id: 'wind_onshore', name: 'Wind onshore forecast (day-ahead)', unit: 'MW', values: fcWindOn }], now, QUARTER, { attributes: { demo: true, forecast_type: 'day-ahead', production_type: 'wind_onshore' } });
  const forecastWindOffshore = base('forecastWindOffshore', '/v2/public_power_forecast', 'MW', fcTimestamps, [{ id: 'wind_offshore', name: 'Wind offshore forecast (day-ahead)', unit: 'MW', values: fcWindOff }], now, QUARTER, { attributes: { demo: true, forecast_type: 'day-ahead', production_type: 'wind_offshore' } });
  const forecastLoad = base('forecastLoad', '/v2/public_power_forecast', 'MW', fcTimestamps, [{ id: 'load', name: 'Load forecast (day-ahead)', unit: 'MW', values: fcLoad }], now, QUARTER, { attributes: { demo: true, forecast_type: 'day-ahead', production_type: 'load' } });

  // ---- installed power (monthly, last 24 months) ----
  const ipTimestamps: number[] = [];
  const ipSolar: (number | null)[] = [];
  const ipWindOn: (number | null)[] = [];
  const ipWindOff: (number | null)[] = [];
  const ipBiomass: (number | null)[] = [];
  const ipBattery: (number | null)[] = [];
  const { year, month } = zonedParts(now);
  for (let m = 23; m >= 0; m--) {
    const d = new Date(Date.UTC(year, month - 1 - m, 1));
    ipTimestamps.push(startOfBerlinDay(berlinDayKey(d.getTime() + 12 * HOUR)));
    ipSolar.push(round3(118.6 - m * 1.35));
    ipWindOn.push(round3(71.3 - m * 0.28));
    ipWindOff.push(round3(11.4 - m * 0.12));
    ipBiomass.push(round3(9.07 - m * 0.005));
    ipBattery.push(round3(21.4 - m * 0.55));
  }
  const installedPower = base('installedPower', '/v2/installed_power', null, ipTimestamps, [
    { id: 'biomass', name: 'Biomass', unit: 'GW', values: ipBiomass },
    { id: 'wind_offshore', name: 'Wind offshore', unit: 'GW', values: ipWindOff },
    { id: 'wind_onshore', name: 'Wind onshore', unit: 'GW', values: ipWindOn },
    { id: 'solar_ac', name: 'Solar AC', unit: 'GW', values: ipSolar },
    { id: 'battery_storage_power', name: 'Battery storage (power)', unit: 'GW', values: ipBattery },
  ], now, null, { resolution: 'P1M', attributes: { demo: true, time_step: 'monthly', timestamp_reference: 'period_end' } });

  return { price, publicPower, frequency, signal, forecastSolar, forecastWindOnshore, forecastWindOffshore, forecastLoad, installedPower };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
