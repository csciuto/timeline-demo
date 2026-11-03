// Checks data.json, the timeline's only data file. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const CATEGORIES = new Set(['Music', 'Television', 'Film', 'Automobiles', 'Toys & Gadgets', 'World Events', 'Tech',
  'Gaming', 'Electronics', 'Space', 'Sports', 'Science', 'Culture', 'Home Appliances']);
const all = Object.entries(data).flatMap(([y, items]) => items.map((i) => ({ y, ...i })));

test('every year from 1950 to 2025 has at least five items', () => {
  for (let y = 1950; y <= 2025; y++) {
    assert.ok((data[y] || []).length >= 5, `${y} has ${(data[y] || []).length} items`);
  }
  for (const y of Object.keys(data)) assert.match(y, /^(19[5-9]\d|20[0-2]\d)$/, `odd year key ${y}`);
});

test('items have a caption and a known category, filed under the right year', () => {
  for (const i of all) {
    assert.ok(i.caption && i.caption.trim().length > 2, `${i.y}: empty caption`);
    assert.ok(CATEGORIES.has(i.category), `${i.y}: unknown category ${i.category} (${i.caption})`);
    if (i.year !== undefined) assert.equal(String(i.year), i.y, i.caption);
  }
});

test('no duplicate captions within a year', () => {
  for (const [y, items] of Object.entries(data)) {
    const seen = new Set();
    for (const i of items) {
      const k = i.caption.toLowerCase();
      assert.ok(!seen.has(k), `${y}: duplicate "${i.caption}"`);
      seen.add(k);
    }
  }
});

test('photos exist locally or come from Wikimedia with a credit', () => {
  for (const i of all) {
    if (!i.photo) continue;
    if (i.photo.startsWith('images/')) {
      assert.ok(fs.existsSync(path.join(root, i.photo)), `${i.y}: missing file ${i.photo}`);
    } else {
      assert.match(i.photo, /^https:\/\/(upload|thumb)\.wikimedia\.org\//, `${i.y}: ${i.photo}`);
      assert.ok(i.credit && i.credit.text && /^https:\/\//.test(i.credit.url), `${i.y}: no credit for ${i.photo}`);
    }
  }
});

test('each year has music, TV, film and news', () => {
  for (let y = 1950; y <= 2025; y++) {
    const cats = new Set((data[y] || []).map((i) => i.category));
    for (const c of ['Music', 'Television', 'Film']) assert.ok(cats.has(c), `${y} has no ${c}`);
    assert.ok(['World Events', 'Science', 'Space', 'Sports'].some((c) => cats.has(c)), `${y} has no news`);
  }
});
