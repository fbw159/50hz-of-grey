/**
 * Time helpers. All user-facing times are Europe/Berlin; all internal values
 * are epoch milliseconds (UTC). No date library – the Intl API is enough and
 * handles DST (23/25-hour days) correctly.
 */

export const BERLIN_TZ = 'Europe/Berlin';
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** UTC offset of the zone at that instant, in minutes (Berlin: 60 or 120). */
  offsetMinutes: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = partsFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Break an instant into wall-clock parts of a time zone (default Berlin). */
export function zonedParts(epochMs: number, timeZone: string = BERLIN_TZ): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0; // some engines report 24 for midnight with h23 quirks
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const weekday = WEEKDAYS.indexOf(get('weekday'));
  // Offset = (wall clock interpreted as UTC) − actual instant, rounded to minutes.
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = Math.round((asUtc - Math.floor(epochMs / 1000) * 1000) / MINUTE);
  return { year, month, day, hour, minute, second, weekday, offsetMinutes };
}

export function berlinOffsetMinutes(epochMs: number): number {
  return zonedParts(epochMs).offsetMinutes;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of the Berlin calendar day containing the instant. */
export function berlinDayKey(epochMs: number): string {
  const p = zonedParts(epochMs);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Parse "YYYY-MM-DD" into its components. */
export function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) throw new Error(`Invalid day key: ${dayKey}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Shift a day key by n calendar days (pure calendar arithmetic). */
export function addDaysToKey(dayKey: string, n: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Epoch ms of local midnight (start of day) in Berlin for a day key.
 * Works across DST switches because the offset is evaluated at the result.
 */
export function startOfBerlinDay(dayKey: string): number {
  const { year, month, day } = parseDayKey(dayKey);
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  // two fixed-point iterations are enough: offset only changes at 02:00/03:00 local
  for (let i = 0; i < 2; i++) {
    const offset = berlinOffsetMinutes(guess);
    guess = Date.UTC(year, month - 1, day, 0, 0, 0) - offset * MINUTE;
  }
  return guess;
}

export function endOfBerlinDay(dayKey: string): number {
  return startOfBerlinDay(addDaysToKey(dayKey, 1));
}

/** Length of a Berlin calendar day in hours (23, 24 or 25). */
export function hoursInBerlinDay(dayKey: string): number {
  return Math.round((endOfBerlinDay(dayKey) - startOfBerlinDay(dayKey)) / HOUR);
}

export function isSameBerlinDay(a: number, b: number): boolean {
  return berlinDayKey(a) === berlinDayKey(b);
}

/** Parse an ISO 8601 timestamp (with offset) into epoch ms; NaN if invalid. */
export function parseIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** ISO 8601 duration like "PT15M", "PT1H", "P1D", "PT1S" → ms (null if unsupported). */
export function parseIsoDuration(duration: string | null | undefined): number | null {
  if (!duration) return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(duration);
  if (!m) return null;
  const [, d, h, min, s] = m;
  const ms = (Number(d ?? 0) * 24 * 60 + Number(h ?? 0) * 60 + Number(min ?? 0)) * MINUTE + Number(s ?? 0) * 1000;
  return ms > 0 ? ms : null;
}

const timeFmtCache = new Map<string, Intl.DateTimeFormat>();
function cachedFormatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = timeFmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, ...options });
    timeFmtCache.set(key, f);
  }
  return f;
}

/** "23:30" */
export function formatBerlinTime(epochMs: number, withSeconds = false): string {
  return cachedFormatter(withSeconds ? 'time-s' : 'time', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(new Date(epochMs));
}

/** Wall-clock hour of an instant in Berlin (0–23). */
export function berlinHour(epochMs: number): number {
  return zonedParts(epochMs).hour;
}

/**
 * "14–15 Uhr" for an hour-long interval. On the night the clocks go back the
 * hour from 2 to 3 exists twice; those get "(Sommerzeit)" / "(Winterzeit)".
 * On the night they go forward the interval is "01–03 Uhr" (02 does not exist).
 */
export function formatHourRange(start: number, end: number): string {
  const h = berlinHour(start);
  let e = berlinHour(end);
  let note = '';
  if (berlinHour(start - HOUR) === h) {
    note = ' (Winterzeit)';
    e = (h + 1) % 24;
  } else if (e === h) {
    note = ' (Sommerzeit)';
    e = (h + 1) % 24;
  }
  return `${pad2(h)}–${e === 0 ? '24' : pad2(e)} Uhr${note}`;
}

/** "15.10.2026" */
export function formatBerlinDate(epochMs: number): string {
  return cachedFormatter('date', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(epochMs));
}

/** "Do, 15.10." */
export function formatBerlinShortDate(epochMs: number): string {
  return cachedFormatter('short-date', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(epochMs));
}

/** "15.10.2026, 23:30" */
export function formatBerlinDateTime(epochMs: number, withSeconds = false): string {
  return `${formatBerlinDate(epochMs)}, ${formatBerlinTime(epochMs, withSeconds)}`;
}

/** Human readable age: "gerade eben", "vor 3 min", "vor 2 h 05 min", "vor 3 Tagen". */
export function formatAge(ageMs: number): string {
  if (!Number.isFinite(ageMs)) return 'unbekannt';
  if (ageMs < 0) ageMs = 0;
  const sec = Math.floor(ageMs / 1000);
  if (sec < 45) return 'gerade eben';
  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} h ${pad2(min % 60)} min`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'vor 1 Tag' : `vor ${d} Tagen`;
}

/** Day labels relative to today: "Heute", "Gestern", "Morgen" or the date. */
export function relativeDayLabel(dayKey: string, now: number): string {
  const today = berlinDayKey(now);
  if (dayKey === today) return 'Heute';
  if (dayKey === addDaysToKey(today, -1)) return 'Gestern';
  if (dayKey === addDaysToKey(today, 1)) return 'Morgen';
  const { year, month, day } = parseDayKey(dayKey);
  return `${pad2(day)}.${pad2(month)}.${year}`;
}
