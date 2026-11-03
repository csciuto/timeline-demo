import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decadeOf, clampYear, yearFromHash, formatCents, formatDollars, byStation, priceRows, imageCredit, wikiUrl,
  randomYear,
} from '../js/lib.js';

test('decadeOf', () => {
  assert.equal(decadeOf(1969), 1960);
  assert.equal(decadeOf(1970), 1970);
  assert.equal(decadeOf(2025), 2020);
});

test('clampYear keeps years in range', () => {
  assert.equal(clampYear(1949, 1950, 2025), 1950);
  assert.equal(clampYear(2030, 1950, 2025), 2025);
  assert.equal(clampYear(1985.4, 1950, 2025), 1985);
  assert.equal(clampYear(NaN, 1950, 2025), null);
});

test('yearFromHash accepts only four-digit years in range', () => {
  assert.equal(yearFromHash('#1969', 1950, 2025), 1969);
  assert.equal(yearFromHash('1985', 1950, 2025), 1985);
  assert.equal(yearFromHash('#1900', 1950, 2025), null);
  assert.equal(yearFromHash('#abc', 1950, 2025), null);
  assert.equal(yearFromHash('', 1950, 2025), null);
});

test('money formatting', () => {
  assert.equal(formatCents(6), '6¢');
  assert.equal(formatCents(73), '73¢');
  assert.equal(formatCents(150), '$1.50');
  assert.equal(formatDollars(1.6), '$1.60');
});

test('byStation groups items and puts the No. 1 song first', () => {
  const s = byStation([
    { kind: 'radio', text: 'B' }, { kind: 'hit', text: 'A' }, { kind: 'tv', text: 'T' }, { kind: 'news', text: 'N' },
    { kind: 'unknown', text: 'X' },
  ]);
  assert.deepEqual(s.radio.map((i) => i.text), ['A', 'B']);
  assert.equal(s.tv.length, 1);
  assert.equal(s.news.length, 1);
  assert.equal(s.car.length, 0);
});

test('priceRows', () => {
  const now = { stamp: 73, min_wage: 7.25, dollar: 1 };
  const rows = priceRows({ stamp: 6, min_wage: 1.6, dollar: 8.78 }, now, 1969, 2025);
  assert.deepEqual(rows.map((r) => [r.value, r.now]), [['6¢', '73¢'], ['$1.60', '$7.25'], ['$1.00', '$8.78']]);
  assert.equal(priceRows({ stamp: 73, min_wage: 7.25, dollar: 1 }, now, 2025, 2025).length, 2);
  assert.deepEqual(priceRows(undefined, now, 1900, 2025), []);
});

test('imageCredit', () => {
  assert.match(imageCredit({ nonfree: true }), /©/);
  assert.equal(imageCredit({ nonfree: false, artist: 'Jane Doe', license: 'CC BY 2.0' }), 'Jane Doe · CC BY 2.0');
  assert.equal(imageCredit({ nonfree: false, artist: 'x'.repeat(90), license: 'CC0' }), 'CC0');
  assert.equal(imageCredit(undefined), '');
});

test('wikiUrl', () => {
  assert.equal(wikiUrl('Sugar, Sugar'), 'https://en.wikipedia.org/wiki/Sugar%2C_Sugar');
});

test('randomYear never repeats the current year and always ends', () => {
  let i = 0;
  const seq = [0, 0.5];
  assert.notEqual(randomYear(1950, 2025, 1950, () => seq[i++ % 2]), 1950);
  assert.equal(randomYear(1950, 2025, 1950, () => 0), 1951);  // a stuck generator still terminates
  assert.equal(randomYear(1950, 2025, 2025, () => 0.9999), 1950);
});
