#!/usr/bin/env node
/**
 * Renders the PWA icons and the Open-Graph image from inline SVG using the
 * Chromium that ships with Playwright. Run once after changing the logo:
 *   node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');

function iconSvg(size, maskable) {
  const pad = maskable ? size * 0.1 : 0;
  const inner = size - 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="1" stop-color="#A78BFA"/></linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="#090D14"/>
  <g transform="translate(${pad} ${pad}) scale(${inner / 64})">
    <rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#283447" stroke-width="2" opacity="${maskable ? 0 : 1}"/>
    <path d="M10 40 L16 40 L20 30 L24 46 L28 34 L32 40 L54 40" fill="none" stroke="url(#g)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M36 12 L28 30 L35 30 L31 44 L42 24 L35 24 Z" fill="#22D3EE"/>
  </g>
</svg>`;
}

function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="1" stop-color="#A78BFA"/></linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.08)" stroke-width="1"/></pattern>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="rgba(34,211,238,0.25)"/><stop offset="1" stop-color="rgba(34,211,238,0)"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#090D14"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(90 120) scale(2.2)">
    <path d="M10 40 L16 40 L20 30 L24 46 L28 34 L32 40 L54 40" fill="none" stroke="url(#g)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M36 12 L28 30 L35 30 L31 44 L42 24 L35 24 Z" fill="#22D3EE"/>
  </g>
  <text x="260" y="200" fill="#EAF0F7" font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="84" font-weight="700">50 Hz of Grey</text>
  <text x="260" y="260" fill="#94A3B8" font-family="Inter, Arial, sans-serif" font-size="34">The German Grid Crisis Simulator</text>
  <text x="90" y="400" fill="#22D3EE" font-family="JetBrains Mono, Menlo, monospace" font-size="30">49,987 Hz   ·   −14,20 €/MWh   ·   EE 73,4 %</text>
  <text x="90" y="470" fill="#EAF0F7" font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="40" font-weight="600">Keeping the lights on. Against all odds.</text>
  <text x="90" y="560" fill="#64748B" font-family="Inter, Arial, sans-serif" font-size="24">Echte Netzdaten (Energy-Charts / Fraunhofer ISE) · Satirische Leitwarte · Mobile first</text>
</svg>`;
}

async function render(browser, svg, width, height, file) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height }, omitBackground: true });
  await writeFile(file, buf);
  await page.close();
  console.log('wrote', path.relative(process.cwd(), file));
}

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });
await render(browser, iconSvg(192, false), 192, 192, path.join(outDir, 'icon-192.png'));
await render(browser, iconSvg(512, false), 512, 512, path.join(outDir, 'icon-512.png'));
await render(browser, iconSvg(512, true), 512, 512, path.join(outDir, 'icon-maskable-512.png'));
await render(browser, iconSvg(180, false), 180, 180, path.join(outDir, 'apple-touch-icon.png'));
await render(browser, ogSvg(), 1200, 630, path.join(outDir, 'og-image.png'));
await browser.close();
