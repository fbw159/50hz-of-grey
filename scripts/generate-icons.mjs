#!/usr/bin/env node
/**
 * Renders the app icons, favicon and the Open-Graph image (socket with a
 * face on switch-cabinet grey) with the Chromium that ships with Playwright.
 * Run once after changing the logo:
 *   node scripts/generate-icons.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'icons');

/** The happy socket, drawn in a 200×200 box. */
const SOCKET = `
  <defs>
    <linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdfcf8"/><stop offset="1" stop-color="#e6e3da"/></linearGradient>
    <radialGradient id="re" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ebe8df"/><stop offset="1" stop-color="#d2cec3"/></radialGradient>
    <linearGradient id="me" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d9398"/><stop offset="0.5" stop-color="#e3e6e8"/><stop offset="1" stop-color="#8d9398"/></linearGradient>
  </defs>
  <rect x="8" y="10" width="184" height="184" rx="34" fill="#b9b6ac"/>
  <rect x="8" y="6" width="184" height="184" rx="34" fill="url(#pl)" stroke="#c4c1b7" stroke-width="1.5"/>
  <circle cx="100" cy="100" r="68" fill="url(#re)"/>
  <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(0,0,0,0.13)" stroke-width="3"/>
  <rect x="86" y="36" width="28" height="11" rx="3" fill="url(#me)" stroke="#7d8287" stroke-width="0.8"/>
  <rect x="86" y="153" width="28" height="11" rx="3" fill="url(#me)" stroke="#7d8287" stroke-width="0.8"/>
  <g fill="#e9928a" opacity="0.35"><ellipse cx="57" cy="121" rx="10" ry="6"/><ellipse cx="143" cy="121" rx="10" ry="6"/></g>
  <circle cx="72" cy="98" r="11" fill="#2b2f31"/><circle cx="128" cy="98" r="11" fill="#2b2f31"/>
  <circle cx="75" cy="94" r="3.2" fill="#fff"/><circle cx="131" cy="94" r="3.2" fill="#fff"/>
  <path d="M80 125 Q100 146 120 125" stroke="#2b2f31" stroke-width="4.5" stroke-linecap="round" fill="none"/>`;

function iconSvg(size, { maskable = false, rounded = true } = {}) {
  const inner = maskable ? 0.62 : 0.8;
  const s = (size * inner) / 200;
  const off = (size - 200 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded && !maskable ? size * 0.22 : 0}" fill="#cdd1cc"/>
  <g transform="translate(${off} ${off}) scale(${s})">${SOCKET}</g>
</svg>`;
}

async function fontFace(family, file, weight) {
  const data = await readFile(path.join(root, 'node_modules', file));
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');}`;
}

async function ogHtml() {
  const fonts = [
    await fontFace('Barlow Condensed', '@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2', 800),
    await fontFace('Barlow', '@fontsource/barlow/files/barlow-latin-500-normal.woff2', 500),
  ].join('');
  return `<!doctype html><html><head><style>${fonts}
    body{margin:0;width:1200px;height:630px;background:#cdd1cc;font-family:Barlow;color:#293133;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box}
    h1{font-family:'Barlow Condensed';font-weight:800;font-size:112px;line-height:.95;margin:0 0 18px}
    p{font-size:40px;margin:0;color:#545d5a}
    .tag{display:inline-block;margin-top:34px;background:#f2a900;border:2px solid #9c6d00;border-radius:16px;padding:10px 22px;font-size:34px;color:#1f1a0a}
  </style></head><body>
    <svg width="360" height="360" viewBox="0 0 200 200">${SOCKET}</svg>
    <div><h1>50 Hz of Grey</h1><p>Wie geht's dem Stromnetz gerade?</p><span class="tag">Echte Daten, viel Spannung.</span></div>
  </body></html>`;
}

async function render(browser, html, width, height, file) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html.startsWith('<svg') ? `<!doctype html><html><body style="margin:0;background:transparent">${html}</body></html>` : html);
  await page.waitForTimeout(200);
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height }, omitBackground: true });
  await writeFile(file, buf);
  await page.close();
  console.log('wrote', path.relative(root, file));
}

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });
await render(browser, iconSvg(192), 192, 192, path.join(outDir, 'icon-192.png'));
await render(browser, iconSvg(512), 512, 512, path.join(outDir, 'icon-512.png'));
await render(browser, iconSvg(512, { maskable: true }), 512, 512, path.join(outDir, 'icon-maskable-512.png'));
await render(browser, iconSvg(180, { rounded: false }), 180, 180, path.join(outDir, 'apple-touch-icon.png'));
await render(browser, await ogHtml(), 1200, 630, path.join(outDir, 'og-image.png'));
await writeFile(path.join(root, 'public', 'favicon.svg'), iconSvg(64) + '\n');
console.log('wrote public/favicon.svg');
await browser.close();
