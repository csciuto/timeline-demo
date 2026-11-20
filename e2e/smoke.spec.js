const { test, expect } = require('@playwright/test');

// Smoke test: the app loads and renders without JavaScript errors.
// `npm run screenshot` also saves the preview image used for link previews
// and on https://corey.sciu.to/projects/.
const APP = '/';
const PREVIEW = 'preview.png';
const READY = '.tile';

test('app loads without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(APP);
  await expect(page.locator(READY).first()).toBeVisible();
  expect(errors).toEqual([]);
  if (process.env.UPDATE_PREVIEW) {
    await page.goto(APP + '#1983');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: PREVIEW });
  }
});
