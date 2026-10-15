/**
 * "Daily Grid Report" – data model + PNG rendering (canvas, no extra deps).
 * Values are only included when a real measurement exists for the moment.
 */
import type { DatasetMap } from '@/types/data';
import { getFrequencyStatus } from '@/features/frequency/frequencyMetrics';
import { getPriceOverview } from '@/features/prices/priceMetrics';
import { getGenerationStatus } from '@/features/production/productionMetrics';
import { formatHz, formatPrice, formatPercent } from '@/lib/formatters';
import { formatBerlinDateTime, formatBerlinTime } from '@/lib/dateUtils';
import { pickMessage, rotationSlot } from '@/lib/humorEngine';

export interface ReportLine {
  label: string;
  value: string;
  note?: string;
  satire?: boolean;
}

export interface ReportCard {
  title: string;
  dateLine: string;
  lines: ReportLine[];
  quote: string;
  demo: boolean;
}

export function buildReportCard(datasets: DatasetMap, now: number, panicValue: number | null): ReportCard {
  const lines: ReportLine[] = [];
  const freq = getFrequencyStatus(datasets.frequency, now);
  if (freq) lines.push({ label: 'Netzfrequenz', value: formatHz(freq.value), note: `${formatBerlinTime(freq.t, true)} Uhr, ${freq.region}` });
  const price = getPriceOverview(datasets.price, now);
  if (price?.current) lines.push({ label: 'Day-Ahead-Preis', value: formatPrice(price.current.value), note: `Intervall ab ${formatBerlinTime(price.current.start)} Uhr, DE-LU` });
  const gen = getGenerationStatus(datasets.publicPower, now);
  if (gen?.renewableShareOfLoad !== null && gen?.renewableShareOfLoad !== undefined) lines.push({ label: 'EE-Anteil an der Last', value: formatPercent(gen.renewableShareOfLoad), note: `Stand ${formatBerlinTime(gen.t)} Uhr` });
  if (panicValue !== null) lines.push({ label: 'Grid Panic Index™', value: `${panicValue}/100`, satire: true });
  lines.push({ label: 'Management Confidence', value: 'Unbegrenzt', satire: true });
  const quote = pickMessage('dailySummary', { seed: `report-${rotationSlot(now, 60)}`, intensity: 'engineer' })?.title ?? 'Die Elektronen machen heute einen soliden Job.';
  const demo = Object.values(datasets).some((d) => d?.origin === 'demo');
  return { title: '50 Hz of Grey – Daily Grid Report', dateLine: `${formatBerlinDateTime(now)} Uhr`, lines, quote, demo };
}

export function reportToText(card: ReportCard, url: string): string {
  const rows = card.lines.map((l) => `${l.label}: ${l.value}${l.satire ? ' (Satire)' : ''}`);
  return [card.title, card.dateLine, card.demo ? 'DEMO – SIMULIERTE DATEN' : '', ...rows, `„${card.quote}“`, 'Daten: Energy-Charts (Fraunhofer ISE), CC BY 4.0', url].filter(Boolean).join('\n');
}

/** Render the card to a PNG blob (1080×1350). Returns null when canvas is unavailable. */
export async function renderReportPng(card: ReportCard, url: string): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#090D14';
  ctx.fillRect(0, 0, W, H);
  // subtle grid
  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // glow
  const g = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 900);
  g.addColorStop(0, 'rgba(34,211,238,0.18)');
  g.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const mono = "'JetBrains Mono Variable', ui-monospace, Menlo, monospace";
  const sans = "'Inter Variable', system-ui, sans-serif";
  const display = "'Space Grotesk Variable', 'Inter Variable', system-ui, sans-serif";

  ctx.fillStyle = '#22D3EE';
  ctx.font = `600 26px ${mono}`;
  ctx.fillText('⚡ 50 HZ OF GREY', 80, 110);
  ctx.fillStyle = '#EAF0F7';
  ctx.font = `700 64px ${display}`;
  ctx.fillText('Daily Grid Report', 80, 190);
  ctx.fillStyle = '#94A3B8';
  ctx.font = `400 28px ${sans}`;
  ctx.fillText(card.dateLine, 80, 240);
  if (card.demo) {
    ctx.fillStyle = '#F59E0B';
    ctx.font = `600 24px ${mono}`;
    ctx.fillText('DEMO – SIMULIERTE DATEN', 80, 285);
  }

  let y = 360;
  for (const line of card.lines) {
    ctx.fillStyle = 'rgba(17,24,39,0.85)';
    roundRect(ctx, 80, y - 60, W - 160, 130, 18);
    ctx.fill();
    ctx.strokeStyle = line.satire ? 'rgba(167,139,250,0.45)' : 'rgba(40,52,71,1)';
    ctx.lineWidth = 2;
    roundRect(ctx, 80, y - 60, W - 160, 130, 18);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 24px ${sans}`;
    ctx.fillText(line.label.toUpperCase(), 110, y - 15);
    ctx.fillStyle = line.satire ? '#A78BFA' : '#EAF0F7';
    ctx.font = `600 54px ${mono}`;
    ctx.fillText(line.value, 110, y + 42);
    if (line.note || line.satire) {
      ctx.fillStyle = '#64748B';
      ctx.font = `400 22px ${sans}`;
      ctx.textAlign = 'right';
      ctx.fillText(line.satire ? 'SATIRE' : (line.note ?? ''), W - 110, y + 42);
      ctx.textAlign = 'left';
    }
    y += 160;
  }

  ctx.fillStyle = '#EAF0F7';
  ctx.font = `italic 500 34px ${display}`;
  wrapText(ctx, `„${card.quote}“`, 80, y + 30, W - 160, 44);
  ctx.fillStyle = '#64748B';
  ctx.font = `400 22px ${sans}`;
  ctx.fillText('Daten: Energy-Charts (Fraunhofer ISE), CC BY 4.0 · Satirewerte sind keine Messungen', 80, H - 110);
  ctx.fillStyle = '#22D3EE';
  ctx.font = `500 24px ${mono}`;
  ctx.fillText(url.replace(/^https?:\/\//, ''), 80, H - 70);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
