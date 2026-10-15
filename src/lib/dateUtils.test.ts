import { describe, expect, it } from 'vitest';
import { addDaysToKey, berlinDayKey, berlinOffsetMinutes, endOfBerlinDay, formatAge, formatBerlinTime, hoursInBerlinDay, parseIso, parseIsoDuration, startOfBerlinDay, zonedParts } from './dateUtils';

describe('Europe/Berlin time handling', () => {
  it('converts UTC instants to Berlin wall-clock parts (summer and winter)', () => {
    // 2026-07-01T10:00Z = 12:00 CEST
    const summer = zonedParts(Date.UTC(2026, 6, 1, 10, 0, 0));
    expect(summer).toMatchObject({ year: 2026, month: 7, day: 1, hour: 12, minute: 0, offsetMinutes: 120 });
    // 2026-01-15T10:00Z = 11:00 CET
    const winter = zonedParts(Date.UTC(2026, 0, 15, 10, 0, 0));
    expect(winter).toMatchObject({ hour: 11, offsetMinutes: 60 });
  });

  it('computes day keys across midnight correctly', () => {
    // 2026-10-15T22:30Z is already 2026-10-16 00:30 in Berlin (CEST)
    expect(berlinDayKey(Date.UTC(2026, 9, 15, 22, 30))).toBe('2026-10-16');
    expect(berlinDayKey(Date.UTC(2026, 9, 15, 21, 59))).toBe('2026-10-15');
  });

  it('knows about 23- and 25-hour days (DST switches 2026)', () => {
    expect(hoursInBerlinDay('2026-03-29')).toBe(23); // spring forward
    expect(hoursInBerlinDay('2026-10-25')).toBe(25); // fall back
    expect(hoursInBerlinDay('2026-10-15')).toBe(24);
  });

  it('start of Berlin day is local midnight', () => {
    const start = startOfBerlinDay('2026-10-15');
    expect(zonedParts(start)).toMatchObject({ hour: 0, minute: 0, day: 15, month: 10 });
    expect(start).toBe(Date.UTC(2026, 9, 14, 22, 0, 0));
    expect(endOfBerlinDay('2026-10-15')).toBe(startOfBerlinDay('2026-10-16'));
    // winter: midnight is 23:00Z the day before
    expect(startOfBerlinDay('2026-01-10')).toBe(Date.UTC(2026, 0, 9, 23, 0, 0));
  });

  it('offset changes at the DST switch', () => {
    expect(berlinOffsetMinutes(Date.UTC(2026, 9, 25, 0, 30))).toBe(120); // 02:30 CEST
    expect(berlinOffsetMinutes(Date.UTC(2026, 9, 25, 1, 30))).toBe(60); // 02:30 CET (second time)
  });

  it('adds calendar days to keys', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('parses ISO timestamps with offsets', () => {
    expect(parseIso('2026-10-15T23:30:00+02:00')).toBe(Date.UTC(2026, 9, 15, 21, 30));
    expect(parseIso('nonsense')).toBeNull();
    expect(parseIso(null)).toBeNull();
  });

  it('parses ISO durations', () => {
    expect(parseIsoDuration('PT15M')).toBe(15 * 60_000);
    expect(parseIsoDuration('PT1H')).toBe(3_600_000);
    expect(parseIsoDuration('PT1S')).toBe(1000);
    expect(parseIsoDuration('P1D')).toBe(86_400_000);
    expect(parseIsoDuration('P1M')).toBeNull(); // months are not a fixed length
    expect(parseIsoDuration(null)).toBeNull();
  });

  it('formats Berlin times', () => {
    expect(formatBerlinTime(Date.UTC(2026, 9, 15, 21, 30))).toBe('23:30');
    expect(formatBerlinTime(Date.UTC(2026, 9, 15, 22, 0))).toBe('00:00');
  });

  it('formats ages in German', () => {
    expect(formatAge(10_000)).toBe('gerade eben');
    expect(formatAge(8 * 60_000)).toBe('vor 8 min');
    expect(formatAge(2 * 3_600_000 + 5 * 60_000)).toBe('vor 2 h 05 min');
    expect(formatAge(3 * 86_400_000)).toBe('vor 3 Tagen');
  });
});
