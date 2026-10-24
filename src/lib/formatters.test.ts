import { describe, expect, it } from 'vitest';
import { eurPerMwhToCtPerKwh, formatCt, formatCtPerKwh, formatHz, formatMilliHz, formatNumber, formatPower, formatPrice, gwToMw, mwToGw, MINUS, NBSP } from './formatters';

describe('unit conversions', () => {
  it('converts MW ↔ GW', () => {
    expect(mwToGw(31_700)).toBeCloseTo(31.7);
    expect(gwToMw(1.5)).toBe(1500);
    expect(mwToGw(0)).toBe(0);
  });

  it('converts EUR/MWh → ct/kWh (1 EUR/MWh = 0.1 ct/kWh)', () => {
    expect(eurPerMwhToCtPerKwh(100)).toBeCloseTo(10);
    expect(eurPerMwhToCtPerKwh(-14.2)).toBeCloseTo(-1.42);
    expect(eurPerMwhToCtPerKwh(0)).toBe(0);
  });
});

describe('formatting (de-DE)', () => {
  it('formats numbers with comma decimals and a typographic minus', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(-14.2, 2)).toBe(`${MINUS}14,20`);
    expect(formatNumber(0, 0)).toBe('0');
  });

  it('treats 0 as a valid value, null as missing', () => {
    expect(formatPower(0)).toBe(`0${NBSP}MW`);
    expect(formatPower(null)).toBe('–');
    expect(formatPrice(0)).toBe(`0,00${NBSP}€/MWh`);
    expect(formatPrice(undefined)).toBe('–');
  });

  it('switches to GW at 1000 MW', () => {
    expect(formatPower(999)).toBe(`999${NBSP}MW`);
    expect(formatPower(1000)).toBe(`1,0${NBSP}GW`);
    expect(formatPower(31_700)).toBe(`31,7${NBSP}GW`);
  });

  it('formats prices and ct/kWh', () => {
    expect(formatPrice(-14.2)).toBe(`${MINUS}14,20${NBSP}€/MWh`);
    expect(formatCtPerKwh(84)).toBe(`8,40${NBSP}ct/kWh`);
  });

  it('formats frequency and deviation in mHz', () => {
    expect(formatHz(49.987)).toBe(`49,987${NBSP}Hz`);
    expect(formatHz(50)).toBe(`50,000${NBSP}Hz`);
    expect(formatMilliHz(-0.013)).toBe(`${MINUS}13${NBSP}mHz`);
    expect(formatMilliHz(0.0124)).toBe(`+12${NBSP}mHz`);
    expect(formatMilliHz(0)).toBe(`±0${NBSP}mHz`);
  });
});

describe('no negative zero, no hidden negative prices', () => {
  it('drops the sign of values that round to zero', () => {
    expect(formatNumber(-0.04, 1)).toBe('0,0');
    expect(formatNumber(-0.4, 0)).toBe('0');
    expect(formatNumber(-0.06, 1)).toBe(`${MINUS}0,1`);
  });

  it('keeps tiny negative prices visibly negative', () => {
    expect(formatCt(-0.001)).toBe(`${MINUS}0,001 ct`);
    expect(formatCt(-0.03)).toBe(`${MINUS}0,030 ct`);
    expect(formatCt(-0.05)).toBe(`${MINUS}0,1 ct`);
    expect(formatCt(0)).toBe('0,0 ct');
    expect(formatCt(8.53)).toBe('8,5 ct');
  });
});
