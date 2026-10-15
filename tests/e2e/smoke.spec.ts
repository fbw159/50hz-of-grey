import { expect, test } from '@playwright/test';
import { seedSettings, watchConsole } from './helpers';

test.describe('50 Hz of Grey – smoke tests (demo data)', () => {
  test.beforeEach(async ({ context }) => {
    await seedSettings(context);
  });

  test('control room renders real-looking KPIs, demo banner and no console errors', async ({ page }) => {
    const watcher = watchConsole(page);
    await page.goto('./');
    await expect(page.getByTestId('demo-banner')).toBeVisible();
    await expect(page.getByTestId('frequency-hero')).toBeVisible();
    await expect(page.getByTestId('frequency-value')).toContainText(/\d{2},\d{3}/);
    await expect(page.getByTestId('panic-gauge')).toBeVisible();
    await expect(page.getByTestId('kpi-price')).toContainText('€/MWh');
    await expect(page.getByTestId('kpi-renewables')).toContainText('%');
    await expect(page.getByTestId('kpi-bureaucracy')).toContainText('/ 100');
    await expect(page.getByTestId('incident-list')).toBeVisible();
    await expect(page.getByTestId('defcon-level')).toContainText('DEFCON');
    await expect(page.getByTestId('clock')).toContainText(/\d{2}:\d{2}:\d{2}/);
    await page.waitForTimeout(500);
    expect(watcher.errors, watcher.errors.join('\n')).toEqual([]);
    expect(watcher.failedRequests, watcher.failedRequests.join('\n')).toEqual([]);
  });

  test('navigation works and sub routes survive a reload (hash routing on GitHub Pages)', async ({ page, isMobile }) => {
    await page.goto('./');
    const nav = (id: string) => page.getByTestId(isMobile ? `nav-${id}` : `sidenav-${id}`);
    await nav('market').click();
    await expect(page).toHaveURL(/#\/market$/);
    await expect(page.getByTestId('current-price-card')).toBeVisible();
    await nav('generation').click();
    await expect(page.getByTestId('mix-card')).toBeVisible();
    await nav('lab').click();
    await expect(page.getByTestId('frequency-monitor')).toBeVisible();
    await nav('more').click();
    await expect(page.getByTestId('more-settings')).toBeVisible();
    // deep link + reload
    await page.goto('./#/lab/reactive');
    await page.reload();
    await expect(page.getByTestId('reactive-agency')).toBeVisible();
    expect(page.url()).toContain('/50hz-of-grey/');
  });

  test('charts render on market and generation pages', async ({ page }) => {
    await page.goto('./#/market');
    await expect(page.getByTestId('price-chart-card').locator('svg.recharts-surface')).toBeVisible();
    await expect(page.getByTestId('price-chart-card').locator('.recharts-area-area')).toHaveCount(1);
    await page.getByTestId('day-yesterday').click();
    await expect(page.getByTestId('day-yesterday')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('merit-price')).toContainText('€/MWh');
    await page.goto('./#/generation');
    await expect(page.getByTestId('generation-day-chart').locator('.recharts-area-area').first()).toBeVisible();
    await expect(page.getByTestId('defcon-monitor')).toBeVisible();
  });

  test('negative price party fires confetti and a snackbar', async ({ page }) => {
    await page.goto('./#/market');
    await page.getByTestId('party-button').click();
    await expect(page.getByText(/STROMPREIS HAT DIE NULL DURCHBROCHEN/)).toBeVisible();
    await expect(page.locator('.confetti-piece').first()).toBeAttached();
  });

  test('engineering lab: sliders, buttons and simulations respond', async ({ page }) => {
    await page.goto('./#/lab/reactive');
    const cos = page.getByTestId('rp-cos');
    await cos.fill('0.6');
    await expect(page.getByTestId('rp-s')).toContainText('kVA');
    await expect(page.getByTestId('rp-q')).toContainText('kvar');
    // P = 250 kW, cos φ = 0.6 → S = 416,7 kVA, Q = 333,3 kvar
    await expect(page.getByTestId('rp-s')).toContainText('416,7');
    await expect(page.getByTestId('rp-q')).toContainText('333,3');
    await expect(page.getByTestId('rp-fine')).toBeVisible();
    await page.getByTestId('rp-fine').click();
    await expect(page.getByTestId('rp-fine-sheet')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('./#/lab/chaos');
    await expect(page.getByTestId('sim-frequency')).toContainText('50,000');
    await page.getByTestId('sim-outage').click();
    await page.waitForTimeout(1500);
    const text = await page.getByTestId('sim-frequency').textContent();
    expect(text).not.toContain('50,000');
    await expect(page.getByTestId('sim-message')).not.toHaveText('');
    await page.getByTestId('sim-rescue').click();

    await page.goto('./#/lab/redispatch');
    await page.getByTestId('rd-scenario').click();
    await expect(page.getByTestId('rd-status')).toContainText('Netzengpass');
    await page.getByTestId('rd-redispatch').click();
    await expect(page.getByTestId('rd-status')).toContainText('Kein Engpass');
  });

  test('frequency monitor offers time windows and fun buttons without changing values', async ({ page }) => {
    await page.goto('./#/lab/frequency');
    await expect(page.getByTestId('monitor-value')).toContainText(/\d{2},\d{3}/);
    const before = await page.getByTestId('monitor-value').textContent();
    await page.getByTestId('window-5').click();
    await expect(page.getByTestId('window-5')).toHaveAttribute('aria-selected', 'true');
    await page.getByTestId('perfectionism').click();
    await expect(page.getByTestId('perfectionism-warning')).toBeVisible();
    await page.getByTestId('calm-masses').click();
    const after = await page.getByTestId('monitor-value').textContent();
    expect(after).toBe(before);
  });

  test('management mode transition, extra KPIs and crisis meeting', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('management-toggle').click();
    await expect(page.getByTestId('management-transition')).toBeVisible();
    await expect(page.getByTestId('management-banner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('management-panel')).toBeVisible();
    await expect(page.getByText('Stakeholder Alignment')).toBeVisible();
    await page.getByTestId('more-green').click();
    await expect(page.getByText(/Farbsättigung erheblich verbessert/)).toBeVisible();
    await page.getByTestId('crisis-meeting').click();
    await expect(page.getByTestId('meeting-invite')).toContainText('27');
    await page.keyboard.press('Escape');
    // real value unchanged by management mode
    await expect(page.getByTestId('frequency-value')).toContainText(/\d{2},\d{3}/);
  });

  test('easter eggs: DO NOT PRESS, Excel, excuses, meeting simulator', async ({ page }) => {
    await page.goto('./#/lab/chaos');
    await page.getByTestId('do-not-press').click();
    await expect(page.getByTestId('do-not-press-message')).toContainText(/verweigert|abgelehnt|weitergeleitet|ignoriert|vertagt|berechtigt/);
    await page.goto('./#/more/playground');
    await page.getByTestId('excel-button').click();
    await expect(page.getByTestId('excel-message')).toBeVisible();
    const excuse1 = await page.getByTestId('excuse-text').textContent();
    await page.getByTestId('excuse-generate').click();
    const excuse2 = await page.getByTestId('excuse-text').textContent();
    expect(excuse2).not.toBe(excuse1);
    const eff1 = await page.getByTestId('meeting-efficiency').textContent();
    await page.getByTestId('meeting-add').click();
    await page.getByTestId('meeting-add').click();
    const eff2 = await page.getByTestId('meeting-efficiency').textContent();
    expect(eff2).not.toBe(eff1);
  });

  test('settings persist across reloads and humour level switches captions', async ({ page }) => {
    await page.goto('./#/more/settings');
    await page.getByTestId('humor-professional').click();
    await page.reload();
    await expect(page.getByTestId('humor-professional')).toHaveAttribute('aria-checked', 'true');
    await page.goto('./');
    // professional mode: neutral status text instead of jokes
    await expect(page.getByText('DATEN GELADEN').filter({ visible: true }).first()).toBeVisible();
  });

  test('share sheet shows the daily report', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('share-button').click();
    await expect(page.getByTestId('report-card')).toContainText('Daily Grid Report');
    await expect(page.getByTestId('report-card')).toContainText('Netzfrequenz');
    await expect(page.getByTestId('share-native')).toBeVisible();
  });

  test('achievements page lists progress', async ({ page }) => {
    await page.goto('./#/more/achievements');
    await expect(page.getByTestId('achievements-panel')).toBeVisible();
    await expect(page.getByTestId('achievement-management-material')).toBeVisible();
  });
});

test.describe('first visit & error states', () => {
  test('intro is shown once and can be skipped', async ({ page, context }) => {
    await seedSettings(context, { demoMode: true, introSeen: false });
    await page.goto('./');
    await expect(page.getByTestId('intro')).toBeVisible();
    await page.getByTestId('intro-skip').click();
    await expect(page.getByTestId('intro')).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('intro')).toHaveCount(0);
  });

  test('missing snapshot does not crash – shows a humorous but clear error and the data panel', async ({ page, context }) => {
    await seedSettings(context, { demoMode: false, introSeen: true });
    await context.route('**/data/latest.json*', (route) => route.fulfill({ status: 404, body: 'not found' }));
    const watcher = watchConsole(page);
    await page.goto('./');
    await expect(page.getByText(/Dunkelflaute geraten|weniger Aufmerksamkeit|Verbindung verloren/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Erneut versuchen/ })).toBeVisible();
    expect(watcher.errors.filter((e) => !e.includes('404') && !e.includes('Failed to load resource'))).toEqual([]);
  });

  test('placeholder snapshot without datasets shows "no data" instead of fake values', async ({ page, context }) => {
    await seedSettings(context, { demoMode: false, introSeen: true });
    await page.goto('./');
    await expect(page.getByTestId('demo-banner')).toHaveCount(0);
    await expect(page.getByText(/Keine Frequenzmessung geladen|Dunkelflaute geraten/).first()).toBeVisible();
  });
});
