import type { Page, BrowserContext } from '@playwright/test';

export const DEMO_SETTINGS = {
  theme: 'dark',
  retroScada: false,
  managementMode: false,
  animations: true,
  motion: 'system',
  sounds: false,
  humor: 'engineer',
  demoMode: true,
  introSeen: true,
  moreGreen: false,
};

/** Pre-seed settings (demo data, intro seen) before the app boots. */
export async function seedSettings(context: BrowserContext, settings: Record<string, unknown> = DEMO_SETTINGS) {
  await context.addInitScript((s) => {
    try {
      // seed once – later reloads keep whatever the app stored
      if (!localStorage.getItem('50hz:settings-v1')) localStorage.setItem('50hz:settings-v1', JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, settings);
}

export interface ConsoleWatcher {
  errors: string[];
  failedRequests: string[];
}

/** Collect console errors, page errors and failed same-origin requests. */
export function watchConsole(page: Page): ConsoleWatcher {
  const w: ConsoleWatcher = { errors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') w.errors.push(msg.text());
  });
  page.on('pageerror', (err) => w.errors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && url.includes('localhost')) w.failedRequests.push(`${res.status()} ${url}`);
  });
  return w;
}

export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}
