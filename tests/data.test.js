import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/years.json', import.meta.url)));
const lines = readFileSync(new URL('../data/items.txt', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.trim() && !l.startsWith('#'));
const years = [];
for (let y = data.first; y <= data.last; y++) years.push(y);

test('years.json is up to date with items.txt', () => {
  const n = Object.values(data.years).reduce((a, v) => a + v.length, 0);
  assert.equal(n, lines.length, 'run python3 scripts/build_data.py');
});

test('every year is furnished', () => {
  for (const y of years) {
    const kinds = new Set((data.years[y] || []).map((i) => i.kind));
    for (const k of ['tv', 'film', 'car', 'shelf', 'news']) assert.ok(kinds.has(k), `${y} has no ${k}`);
    assert.ok(kinds.has('hit') || kinds.has('radio'), `${y} has no music`);
    if (y < data.last) assert.ok(kinds.has('hit'), `${y} has no No. 1 song`);
    assert.equal([...kinds].filter((k) => k === 'hit').length <= 1, true);
  }
});

test('one No. 1 song per year at most', () => {
  for (const y of years) assert.ok((data.years[y] || []).filter((i) => i.kind === 'hit').length <= 1, String(y));
});

test('items carry what the page needs', () => {
  for (const [y, items] of Object.entries(data.years)) {
    for (const i of items) {
      assert.ok(i.text && i.title, `${y}: ${JSON.stringify(i)}`);
      if (i.img) {
        assert.match(i.img.src, /^https:\/\/(upload|thumb)\.wikimedia\.org\//, i.img.src);
        assert.ok(i.img.w > 0 && i.img.h > 0);
        assert.match(i.img.page, /^https:\/\//);
        assert.equal(typeof i.img.nonfree, 'boolean');
      }
    }
  }
});

test('prices cover every year and match known values', () => {
  for (const y of years) assert.ok(data.prices[y], `${y} has no prices`);
  assert.equal(data.prices[1969].stamp, 6);
  assert.equal(data.prices[1985].stamp, 22);
  assert.equal(data.prices[1969].min_wage, 1.6);
  assert.equal(data.prices[1985].min_wage, 3.35);
  assert.equal(data.prices[2025].min_wage, 7.25);
  assert.equal(data.prices[data.dollar_year].dollar, 1);
  let prev = 0;
  for (const y of years) {
    assert.ok(data.prices[y].min_wage >= prev, `minimum wage fell in ${y}`);
    prev = data.prices[y].min_wage;
  }
  for (let k = 1; k < years.length; k++) {
    assert.ok(data.prices[years[k]].dollar <= data.prices[years[k - 1]].dollar + 0.05, `prices fell a lot in ${years[k]}`);
  }
  assert.ok(data.prices[1950].dollar > 12 && data.prices[1950].dollar < 15);
});
