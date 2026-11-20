const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Tests shouldn't depend on Google Fonts being reachable.
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return errors;
}

const year = (page, y) => page.locator(`section.year[id="${y}"]`);
const shownTiles = (page) => page.locator('.tile:visible');

test('every year from 1950 to 2025 is on the page, without errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  const sections = page.locator('section.year');
  await expect(sections).toHaveCount(76);
  await expect(sections.first().locator('h2')).toHaveText('1950');
  await expect(sections.last().locator('h2')).toHaveText('2025');
  for (let y = 1950; y <= 2025; y++) expect(await year(page, y).locator('.tile').count(), String(y)).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#count')).toHaveText(/^[\d,]+ items$/);
  expect(errors).toEqual([]);
});

test('the year rail jumps to a year and marks it @desktop', async ({ page }) => {
  await page.goto('/');
  await page.locator('.rail a', { hasText: /^1969$/ }).click();
  await expect(page).toHaveURL(/#1969$/);
  await expect(page.locator('.rail a.current')).toHaveText('1969');
  await expect(year(page, 1969).locator('h2')).toBeInViewport();
  await expect(year(page, 1969)).toContainText('Apollo 11');
});

test('the year picker jumps on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/');
  await expect(page.locator('.rail')).toBeHidden();
  await page.locator('#year-select').selectOption('1985');
  await expect(page).toHaveURL(/#1985$/);
  await expect(year(page, 1985).locator('h2')).toBeInViewport();
});

test('a link to a year opens there', async ({ page }) => {
  await page.goto('/#1977');
  await expect(year(page, 1977).locator('h2')).toBeInViewport();
  await expect(page.locator('#year-select')).toHaveValue('1977');
});

test('your original items are still there alongside the new ones', async ({ page }) => {
  await page.goto('/');
  for (const t of ['Back to the Future released', 'Live Aid concerts held', 'The Breakfast Club in theaters']) {
    await expect(year(page, 1985)).toContainText(t);
  }
});

test('category chips narrow the wall and All restores it', async ({ page }) => {
  await page.goto('/#1977');
  const total = await page.locator('.tile').count();
  await page.locator('.chip', { hasText: /^Film$/ }).click();
  await expect(page).toHaveURL(/\?cat=Film/);
  await expect(page.locator('.chip', { hasText: /^Film$/ })).toHaveAttribute('aria-pressed', 'true');
  const film = await shownTiles(page).count();
  expect(film).toBeGreaterThan(50);
  expect(film).toBeLessThan(total);
  for (const c of await shownTiles(page).locator('.category').allTextContents()) expect(c).toBe('Film');
  await expect(year(page, 1977)).toContainText('Star Wars');
  await page.locator('.chip', { hasText: /^Music$/ }).click();
  expect(await shownTiles(page).count()).toBeGreaterThan(film);
  await page.locator('.chip-all').click();
  await expect(page.locator('.chip-all')).toHaveAttribute('aria-pressed', 'true');
  expect(await shownTiles(page).count()).toBe(total);
});

test('filters come back from a link', async ({ page }) => {
  await page.goto('/?cat=Design,Architecture#1959');
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText(['Architecture', 'Design']);
  for (const c of await shownTiles(page).locator('.category').allTextContents()) expect(['Design', 'Architecture']).toContain(c);
  await expect(year(page, 1959).locator('h2')).toBeInViewport();
});

test('search narrows the wall; nonsense shows nothing', async ({ page }) => {
  await page.goto('/');
  await page.locator('#search').fill('apollo');
  await expect(shownTiles(page).first()).toBeVisible();
  for (const c of await shownTiles(page).locator('.caption').allTextContents()) expect(c.toLowerCase()).toContain('apollo');
  await expect(page.locator('#count')).toHaveText(/ of /);
  await page.locator('#search').fill('zzqqxx');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(shownTiles(page)).toHaveCount(0);
});

test('images that fail to load are hidden, and credits link to the source', async ({ page }) => {
  await page.route(/\/images\/1969\//, (r) => r.abort());
  await page.goto('/#1969');
  const img = year(page, 1969).locator('img').first();
  await expect(img).toBeHidden();  // must not show as broken
  const credit = year(page, 1969).locator('.credit').first();
  await expect(credit).toHaveAttribute('href', /^https:\/\//);
});

test('the old flow view address lands on the timeline', async ({ page }) => {
  await page.goto('/flow.html#1983');
  await expect(page).toHaveURL(/\/#1983$/);
  await expect(year(page, 1983).locator('h2')).toBeInViewport();
});

test('no sideways scrolling', async ({ page }) => {
  await page.goto('/#1985');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('no serious accessibility problems', async ({ page }) => {
  await page.goto('/#1969');
  await expect(page.locator('.tile').first()).toBeAttached();
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('footer shows a contact, the version and a link back to the projects page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#credits')).toContainText('corey.sciuto+timeline@gmail.com');
  await expect(page.locator('.version')).toHaveText(/^(dev|v1\.\d+)$/);
  await expect(page.locator('a[href="https://corey.sciu.to/projects/"]')).toBeAttached();
});
