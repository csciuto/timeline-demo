const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Tests shouldn't depend on Wikimedia or Google Fonts being reachable.
test.beforeEach(async ({ page }) => {
  await page.route(/wikimedia\.org|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return errors;
}

async function pickYear(page, year) {
  await page.locator('.timeline li', { hasText: new RegExp(`^${year}$`) }).click();
  await expect(page.locator('#selected-year-title')).toContainText(String(year));
}

test('lists every year from 1950 to 2025 without errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  const years = page.locator('.timeline li');
  await expect(years).toHaveCount(76);
  await expect(years.first()).toHaveText('1950');
  await expect(years.last()).toHaveText('2025');
  expect(errors).toEqual([]);
});

test('clicking a year shows its tiles; clicking again hides them', async ({ page }) => {
  await page.goto('/');
  await pickYear(page, 1969);
  const tiles = page.locator('.tiles .tile');
  expect(await tiles.count()).toBeGreaterThanOrEqual(8);
  await expect(page.locator('.tiles')).toContainText('Apollo 11');
  await expect(page.locator('.tiles')).toContainText("is the year's No. 1 song");
  await expect(page.locator('.tiles-container')).toHaveClass(/tiles-visible/);
  await page.locator('.timeline li', { hasText: /^1969$/ }).click();
  await expect(page.locator('.tiles-container')).not.toHaveClass(/tiles-visible/);
});

test('your original items are still there alongside the new ones', async ({ page }) => {
  await page.goto('/');
  await pickYear(page, 1985);
  for (const t of ['Back to the Future released', 'Live Aid concerts held', 'The Breakfast Club in theaters']) {
    await expect(page.locator('.tiles')).toContainText(t);
  }
});

test('category filters hide and restore tiles', async ({ page }) => {
  await page.goto('/');
  await pickYear(page, 1977);  // pick first: clicking outside the panel closes it
  await page.locator('#hamburger-btn').click();
  await expect(page.locator('#filter-panel')).toHaveClass(/filter-panel-visible/);
  const film = page.locator('.tiles .tile', { hasText: 'Star Wars' });
  await expect(film.first()).toBeVisible();
  await page.locator('#filter-Film').uncheck();
  await expect(film).toHaveCount(0);
  await page.locator('#filter-select-none').click();
  await expect(page.locator('.tiles .tile')).toHaveCount(0);
  await page.locator('#filter-select-all').click();
  await expect(film.first()).toBeVisible();
});

test('the filter panel closes when you click elsewhere', async ({ page }) => {
  await page.goto('/');
  await page.locator('#hamburger-btn').click();
  await expect(page.locator('#hamburger-btn')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('h1').click();
  await expect(page.locator('#filter-panel')).toHaveClass(/filter-panel-hidden/);
});

test('images that fail to load are hidden, and credits link to the source', async ({ page }) => {
  await page.goto('/');
  await pickYear(page, 1969);
  const img = page.locator('.tiles .tile img[src*="wikimedia"]').first();
  await expect(img).toBeHidden();  // blocked in tests, so it must not show as broken
  const credit = page.locator('.tiles .tile .credit').first();
  await expect(credit).toHaveAttribute('href', /^https:\/\//);
});

test('every year opens without errors @desktop', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  for (let y = 1950; y <= 2025; y++) {
    await pickYear(page, y);
    expect(await page.locator('.tiles .tile').count(), String(y)).toBeGreaterThanOrEqual(5);
  }
  expect(errors).toEqual([]);
});

test('flow view loads every year', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/flow.html');
  await expect(page.locator('.flow-tile').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('1950');
  await expect(page.locator('body')).toContainText('2025');
  expect(errors).toEqual([]);
});

test('no sideways scrolling', async ({ page }) => {
  await page.goto('/');
  await pickYear(page, 1985);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('no serious accessibility problems @desktop', async ({ page }) => {
  await page.goto('/');
  await pickYear(page, 1969);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('footer shows a contact and the version', async ({ page }) => {
  for (const path of ['/', '/flow.html']) {
    await page.goto(path);
    await expect(page.locator('#credits')).toContainText('corey.sciuto+timeline@gmail.com');
    await expect(page.locator('.version').first()).toHaveText(/^(dev|v1\.\d+)$/);
  }
});

test('contact and a link back to the projects page', async ({ page }) => {
  for (const p of ['/', '/flow.html']) {
    await page.goto(p);
    await expect(page.getByText(/corey\.sciuto\+\w+@gmail\.com/).first()).toBeAttached();
    await expect(page.locator('a[href="https://corey.sciu.to/projects/"]').first()).toBeAttached();
  }
});
