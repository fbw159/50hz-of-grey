import { expect, test } from '@playwright/test';
import { hasHorizontalOverflow, seedSettings } from './helpers';

test.describe('responsive layout', () => {
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
      await seedSettings(context);
      const page = await context.newPage();
      for (const route of ['./', './#/market', './#/generation', './#/lab/chaos', './#/lab/redispatch', './#/more/settings']) {
        await page.goto(route);
        await page.waitForTimeout(400);
        expect(await hasHorizontalOverflow(page), `${route} overflows at ${width}px`).toBe(false);
      }
      await context.close();
    });
  }
});
