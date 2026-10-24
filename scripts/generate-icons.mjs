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

const TIE = `
  <defs><pattern id="tp" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="9" height="9" fill="#6f767a"/><rect width="3" height="9" fill="#5a6064"/></pattern></defs>
  <path d="M94 199 L106 199 L116 236 L100 249 L84 236 Z" fill="url(#tp)" stroke="#41464a" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M89 186 L111 186 L106 201 L94 201 Z" fill="#62686c" stroke="#41464a" stroke-width="1.5" stroke-linejoin="round"/>`;

async function ogHtml() {
  const fonts = [
    await fontFace('Barlow Condensed', '@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2', 800),
    await fontFace('Barlow', '@fontsource/barlow/files/barlow-latin-600-normal.woff2', 600),
  ].join('');
  // A tabloid front page: that's what people see when the link is shared.
  return `<!doctype html><html><head><style>${fonts}
    body{margin:0;width:1200px;height:630px;background:#cdd1cc;font-family:Barlow;color:#293133;position:relative;overflow:hidden}
    .page{position:absolute;inset:34px 40px;background:#fffdf7;border-radius:28px;overflow:hidden;box-shadow:0 6px 0 #b9beb8}
    .red{background:#d4141c;color:#fff;font-family:'Barlow Condensed';font-weight:800;text-transform:uppercase;font-size:104px;line-height:.92;padding:84px 48px 34px 46px;letter-spacing:-.005em}
    mark{background:#ffe14d;color:#1d1f20;padding:0 .1em;border-radius:6px}
    .sticker{position:absolute;left:40px;top:26px;transform:rotate(-5deg);background:#ffe14d;border:4px solid #1d1f20;border-radius:10px;padding:2px 18px;font-family:'Barlow Condensed';font-weight:800;font-size:40px;text-transform:uppercase;box-shadow:6px 6px 0 rgba(0,0,0,.35);color:#1d1f20}
    .photo{position:absolute;right:56px;top:150px;background:#fff;padding:12px 12px 4px;border:2px solid #d9d6cc;border-radius:12px;transform:rotate(3deg);box-shadow:0 14px 30px -12px rgba(0,0,0,.45)}
    .foot{position:absolute;left:46px;bottom:34px;font-size:34px}
    .foot b{font-family:'Barlow Condensed';font-weight:800;font-size:44px;margin-right:14px}
  </style></head><body>
    <div class="page">
      <div class="red">Wer hat die<br><mark>Millihertz</mark><br>geklaut?</div>
      <span class="sticker">Exklusiv</span>
      <div class="foot"><b>50 Hz of Grey</b>Echte Netzdaten. Unechte Panik. Mr. Grey (230) ermittelt.</div>
    </div>
    <div class="photo"><svg width="270" height="338" viewBox="0 0 200 250">${TIE}${SOCKET}</svg></div>
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
