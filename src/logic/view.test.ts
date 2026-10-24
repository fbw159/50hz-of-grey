import { describe, expect, it } from 'vitest';
import { buildView } from './view';
import { buildDemoDatasets } from '@/data/demoData';
import { SOURCES, sourceCaption, priceMood, FACTS, MOODS } from '@/content/texts';

describe('page view model', () => {
  it('derives everything from the demo data', () => {
    const now = Date.UTC(2026, 9, 15, 10, 7);
    const v = buildView(buildDemoDatasets(now), now);
    expect(v.frequency?.value).toBeGreaterThan(49.9);
    expect(v.ekg?.samples.length).toBeGreaterThan(10);
    expect(v.price?.current).not.toBeNull();
    expect(v.today?.hours.length).toBeGreaterThanOrEqual(23);
    expect(v.mix.length).toBeGreaterThan(3);
    expect(v.panic?.score).toBeGreaterThanOrEqual(0);
    expect(v.panic?.score).toBeLessThanOrEqual(100);
  });

  it('returns empty parts without data', () => {
    const v = buildView({}, 0);
    expect(v.frequency).toBeNull();
    expect(v.panic).toBeNull();
    expect(v.mix).toEqual([]);
  });
});

describe('texts', () => {
  it('has a label, colour and caption for every source', () => {
    for (const id of Object.keys(SOURCES) as (keyof typeof SOURCES)[]) {
      expect(sourceCaption(id, 5000, 0.2).length).toBeGreaterThan(5);
    }
    expect(sourceCaption('solar', 0, 0)).toMatch(/dunkel/);
    expect(sourceCaption('windOnshore', 2000, 0.03)).toMatch(/Flaute/);
  });

  it('classifies prices and has jokes for every mood', () => {
    expect([-5, 20, 100, 200, 400].map(priceMood)).toEqual(['negative', 'cheap', 'normal', 'pricey', 'ouch']);
    for (const m of Object.values(MOODS)) expect(m.lines.length).toBeGreaterThan(0);
    expect(FACTS.length).toBeGreaterThan(10);
  });
});
