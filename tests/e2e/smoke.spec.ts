import { expect, test } from '@playwright/test';
import { hasHorizontalOverflow, makeSnapshot, serveSnapshot, watchConsole } from './helpers';

test.describe('with real data (snapshot)', () => {
  test.beforeEach(async ({ context }) => {
    await serveSnapshot(context, makeSnapshot());
  });

  test('shows the socket, meters and all sections without errors or sideways scrolling', async ({ page }) => {
    const watcher = watchConsole(page);
    await page.goto('./');
    await expect(page.getByTestId('verdict')).not.toHaveText(/wärmt sich auf|nicht in Stimmung/);
    await expect(page.getByTestId('headline')).not.toBeEmpty();
    await expect(page.getByTestId('truth')).toContainText('Die Wahrheit:');
    await expect(page.getByTestId('quote')).toContainText('„');
    await expect(page.getByTestId('panic-score')).toContainText('von 100');
    await expect(page.getByTestId('meter-frequency')).toHaveAttribute('aria-label', /Netzfrequenz: (49|50),\d{3} Hertz/);
    await expect(page.getByTestId('meter-price')).toHaveAttribute('aria-label', /Cent pro Kilowattstunde/);
    await expect(page.getByTestId('meter-share')).toHaveAttribute('aria-label', /64 Prozent/);
    await expect(page.getByTestId('data-age')).toContainText('Echte Messwerte');
    await expect(page.getByTestId('demo-banner')).toHaveCount(0);
    await expect(page.getByTestId('frequency-value')).toContainText(/\d{2},\d{3}/);
    await expect(page.getByTestId('price-value')).toBeVisible();
    await expect(page.getByTestId('price-tip')).toContainText('Schleudergang-Tipp');
    await expect(page.getByTestId('profile-card')).toContainText('Lastabwurf');
    await expect(page.getByTestId('precision')).toContainText('Hamburg nach München');
    await expect(page.getByTestId('price-euro')).toContainText('Waschladung');
    await expect(page.getByTestId('power-words')).toContainText('Zeitreisen');
    await expect(page.getByTestId('weather-list').locator('li').first()).toBeVisible();
    await expect(page.getByTestId('share-value')).toContainText('64 %');
    await expect(page.getByTestId('trade')).toContainText('ans Ausland ab');
    await expect(page.getByTestId('game-card')).toBeVisible();
    await expect(page.getByTestId('fact-text')).not.toBeEmpty();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(watcher.errors, watcher.errors.join('\n')).toEqual([]);
    expect(watcher.failedRequests, watcher.failedRequests.join('\n')).toEqual([]);
  });

  test('interactive bits: poke, tomorrow prices, all sources, next fact', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('socket').click();
    await expect(page.getByTestId('quote')).toContainText('Nicht so stürmisch');

    // Netz-TV replays the measurement second by second
    const t1 = await page.getByTestId('replay-time').textContent();
    await expect(page.getByTestId('replay-time')).not.toHaveText(t1 ?? '', { timeout: 4000 });

    const blame = page.getByTestId('blame');
    if (await page.getByTestId('blame-next').isVisible()) {
      const c1 = await page.getByTestId('culprit').textContent();
      await page.getByTestId('blame-next').click();
      await expect(page.getByTestId('culprit')).not.toHaveText(c1 ?? '');
    }
    await expect(blame).toContainText('In Wahrheit');

    await page.getByTestId('profile-like').click();
    await expect(page.getByTestId('toast')).toBeVisible();

    await page.getByTestId('day-tomorrow').click();
    await expect(page.getByTestId('day-tomorrow')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('price-tip')).toContainText('morgen');

    await expect(page.getByTestId('mix-list').locator('li')).toHaveCount(5);
    await page.getByTestId('mix-more').click();
    await expect(page.getByTestId('mix-list').locator('li')).toHaveCount(8);

    const before = await page.getByTestId('fact-text').textContent();
    await page.getByTestId('fact-next').click();
    await expect(page.getByTestId('fact-text')).not.toHaveText(before ?? '');
  });

  test('the Not-Aus button causes a blackout and a black start', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('ticker')).toContainText('Eilmeldung');
    await expect(page.getByTestId('doom-clock')).toContainText(/23:\d{2}/);
    await page.getByTestId('estop').click();
    await expect(page.getByTestId('blackout')).toContainText('Blackout!');
    await expect(page.getByTestId('blackout')).toContainText('Licht ist wieder an!', { timeout: 8000 });
    await page.getByTestId('blackout-close').click();
    await expect(page.getByTestId('blackout')).toHaveCount(0);
    await expect(page.getByTestId('blackout-count')).toContainText('1');
  });

  test('the game runs and reacts to the buttons', async ({ page }) => {
    await page.goto('./#spiel');
    await page.getByTestId('game-start').click();
    await expect(page.getByTestId('game-time')).toBeVisible();
    await expect(page.getByTestId('game-event')).not.toHaveText('Alles ruhig. Noch.', { timeout: 6000 });
    await page.getByTestId('game-up').click();
    await page.getByTestId('game-down').click();
    const t1 = await page.getByTestId('game-time').textContent();
    await page.waitForTimeout(1200);
    const result = page.getByTestId('game-result');
    if (!(await result.isVisible())) {
      await expect(page.getByTestId('game-time')).not.toHaveText(t1 ?? '');
    }
  });
});

test.describe('without data', () => {
  test('explains the problem and shows example data only on request', async ({ page }) => {
    // the repository ships an empty placeholder snapshot
    await page.goto('./');
    await expect(page.getByTestId('verdict')).toHaveText('nicht in Stimmung');
    await expect(page.getByTestId('demo-banner')).toHaveCount(0);
    await page.getByTestId('demo-on').click();
    await expect(page.getByTestId('demo-banner')).toBeVisible();
    await expect(page.getByTestId('panic-score')).toBeVisible();
    await expect(page.getByTestId('ekg-card')).toBeVisible();
    await page.getByTestId('demo-off').click();
    await expect(page.getByTestId('demo-banner')).toHaveCount(0);
    await expect(page.getByTestId('verdict')).toHaveText('nicht in Stimmung');
  });
});
