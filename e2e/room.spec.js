const { test, expect } = require('@playwright/test');

// Images come from Wikimedia; these tests don't need them (and shouldn't depend on the network).
test.beforeEach(async ({ page }) => {
  await page.route(/wikimedia\.org/, (r) => r.abort());
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

async function open(page, hash = '') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/' + hash);
  await expect(page.locator('body.ready')).toBeAttached();
  return errors;
}

test('opens on 1969 by default with every station furnished', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('#big-year')).toHaveText('1969');
  await expect(page).toHaveTitle(/1969/);
  for (const s of ['radio', 'tv', 'film', 'car', 'shelf', 'news']) {
    await expect(page.locator(`[data-station="${s}"] .card`).first()).toBeVisible();
  }
  await expect(page.locator('.k-hit .card-title')).toHaveText('"Sugar, Sugar" · The Archies');
  await expect(page.locator('#year-line')).toContainText('Corvette');
  await expect(page.locator('#prices')).toContainText('6¢');
  expect(errors).toEqual([]);
});

test('a #year link opens that year and decade style', async ({ page }) => {
  await open(page, '#1985');
  await expect(page.locator('#big-year')).toHaveText('1985');
  await expect(page.locator('body')).toHaveAttribute('data-decade', '1980');
  await expect(page.locator('[data-station="tv"]')).toContainText('The Golden Girls');
});

test('arrow keys, buttons, slider and typed years change the year and the URL', async ({ page }) => {
  await open(page, '#1969');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#big-year')).toHaveText('1970');
  await expect(page).toHaveURL(/#1970$/);
  await page.locator('#prev').click();
  await page.locator('#prev').click();
  await expect(page.locator('#big-year')).toHaveText('1968');
  await page.locator('#year-slider').fill('2001');
  await expect(page.locator('#big-year')).toHaveText('2001');
  await page.locator('#year-input').fill('1977');
  await page.locator('#year-input').press('Enter');
  await expect(page.locator('#big-year')).toHaveText('1977');
  await expect(page.locator('[data-station="film"]')).toContainText('Star Wars');
  await page.locator('#year-input').fill('1800');
  await page.locator('#year-input').press('Enter');
  await expect(page.locator('#big-year')).toHaveText('1950');
  await expect(page.locator('#prev')).toBeDisabled();
});

test('decade buttons keep the year within the decade', async ({ page }) => {
  await open(page, '#1969');
  await page.locator('#decades button', { hasText: '90s' }).click();
  await expect(page.locator('#big-year')).toHaveText('1999');
  await page.locator('#decades button', { hasText: '20s' }).click();
  await expect(page.locator('#big-year')).toHaveText('2025');  // 2029 is past the end
  await expect(page.locator('#next')).toBeDisabled();
});

test('Surprise me and R pick a different year', async ({ page }) => {
  await open(page, '#1969');
  await page.locator('#random').click();
  await expect(page.locator('#big-year')).not.toHaveText('1969');
  const y = await page.locator('#big-year').textContent();
  await page.keyboard.press('r');
  await expect(page.locator('#big-year')).not.toHaveText(y);
});

test('editing the hash moves to that year', async ({ page }) => {
  await open(page, '#1969');
  await page.evaluate(() => { location.hash = '#2007'; });
  await expect(page.locator('#big-year')).toHaveText('2007');
  await expect(page.locator('[data-station="shelf"]')).toContainText('iPhone');
});

test('a card with a broken image falls back to text', async ({ page }) => {
  await open(page, '#1969');
  await expect(page.locator('[data-station="car"] .card.no-pic').first()).toBeVisible();
  await expect(page.locator('[data-station="car"] img')).toHaveCount(0);
});

test('More shows the Wikipedia description and link', async ({ page }) => {
  await open(page, '#1969');
  const more = page.locator('[data-station="news"] .card', { hasText: 'Apollo 11' }).locator('details');
  await more.locator('summary').click();
  await expect(more.locator('a')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Apollo_11');
  await expect(more.locator('p')).toContainText('Moon');
});

test('every year renders without errors', async ({ page }) => {
  const errors = await open(page, '#1950');
  for (let y = 1951; y <= 2025; y++) {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#big-year')).toHaveText(String(y));
    await expect(page.locator('[data-station="news"] .card').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('phone width: no sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const y of ['#1957', '#1985', '#2019']) {
    await open(page, y);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, y).toBeLessThanOrEqual(0);
  }
});

test('a failed data load explains itself', async ({ page }) => {
  await page.route('**/data/years.json', (r) => r.fulfill({ status: 500, body: '' }));
  await page.goto('/');
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#error')).toContainText('Reload');
});
