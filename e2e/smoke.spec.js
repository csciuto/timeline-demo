const { test, expect } = require('@playwright/test');

// The app loads without errors. `npm run screenshot` also saves preview.png,
// used for link previews and on https://corey.sciu.to/projects/.
test('app loads without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('/#1969');
  await expect(page.locator('body.ready')).toBeAttached();
  await expect(page.locator('#big-year')).toHaveText('1969');
  expect(errors).toEqual([]);
  if (process.env.UPDATE_PREVIEW) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'preview.png' });
  }
});
