const { test, expect } = require('@playwright/test');

// Smoke test: the app loads and renders without JavaScript errors.
// `npm run screenshot` also saves the preview image used for link previews
// and on https://corey.sciu.to/projects/.
const APP = '/';
const PREVIEW = 'preview.png';
const READY = 'li';

test('app loads without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(APP);
  await page.waitForLoadState('networkidle');
  await expect(page.locator(READY).first()).toBeVisible();
  expect(errors).toEqual([]);
  if (process.env.UPDATE_PREVIEW) {
    // Show one year's tiles so the preview isn't an empty panel
    await page.locator('li', { hasText: '1985' }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: PREVIEW });
  }
});
