// Checks data.json, the timeline's only data file. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const CATEGORIES = new Set(['Music', 'Television', 'Film', 'Books', 'Art', 'Architecture', 'Design', 'Automobiles',
  'Toys & Games', 'Tech', 'Science & Space', 'Sports', 'World Events', 'Misc']);
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

test('photos are local files, and credits link to their source', () => {
  for (const i of all) {
    if (i.photo) {
      assert.match(i.photo, /^images\//, `${i.y}: photo isn't a local file: ${i.photo}`);
      assert.ok(fs.existsSync(path.join(root, i.photo)), `${i.y}: missing file ${i.photo}`);
    }
    if (i.credit) assert.ok(i.credit.text && /^https:\/\//.test(i.credit.url), `${i.y}: bad credit (${i.caption})`);
  }
});

test('each year has music, TV, film and news', () => {
  for (let y = 1950; y <= 2025; y++) {
    const cats = new Set((data[y] || []).map((i) => i.category));
    for (const c of ['Music', 'Television', 'Film']) assert.ok(cats.has(c), `${y} has no ${c}`);
    assert.ok(['World Events', 'Science & Space', 'Sports'].some((c) => cats.has(c)), `${y} has no news`);
  }
});

// Width and height from a PNG or JPEG header, without dependencies.
function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      }
      i += 2 + len;
    }
  }
  return null;
}

test('local images are real and no bigger than 0.1 megapixels (fair-use size)', () => {
  const dir = path.join(root, 'images');
  for (const year of fs.readdirSync(dir)) {
    for (const name of fs.readdirSync(path.join(dir, year))) {
      if (name.startsWith('.') || name.endsWith('.svg')) continue;
      const file = path.join(dir, year, name);
      const size = imageSize(fs.readFileSync(file));
      assert.ok(size, `${year}/${name} isn't a PNG or JPEG`);
      assert.ok(size[0] * size[1] <= 100000, `${year}/${name} is ${size[0]}x${size[1]}; shrink it (see README)`);
    }
  }
});

test('every category is big enough to be worth a filter, and none is a placeholder', () => {
  const count = {};
  for (const i of all) count[i.category] = (count[i.category] || 0) + 1;
  for (const c of CATEGORIES) if (c !== 'Misc') assert.ok(count[c] >= 15, `${c} has only ${count[c] || 0} items`);
  for (const i of all) assert.doesNotMatch(i.caption, /^(Continued|Potential) /, `${i.y}: not an event: ${i.caption}`);
});

test('sports run through the whole timeline, not just recent Olympics', () => {
  const years = all.filter((i) => i.category === 'Sports').map((i) => +i.y);
  for (let decade = 1950; decade <= 2020; decade += 10) {
    assert.ok(years.filter((y) => y >= decade && y < decade + 10).length >= 3, `${decade}s have fewer than three sports items`);
  }
});

// The same event entered twice under different wording ("Osama bin Laden killed" / "Osama bin Laden is killed"),
// in one year or filed again a year or three later (the SNES in 1990 and 1991). Pairs that only look alike go in
// DISTINCT.
const FILLER = new Set(('a an the is are was of on in at to by for and with as its it\'s year\'s no 1 tv theaters ' +
  'released release launched launches launch first new car opens debuts premieres becomes begins').split(' '));
const DISTINCT = [
  ['Nintendo Game Boy launched', 'Tetris released on Game Boy'],
  ["Harry Potter and the Sorcerer's Stone (U.S. edition)", "Harry Potter and the Sorcerer's Stone in theaters"],
  ['James Webb Space Telescope launched', 'The first James Webb telescope images'],
];
// Where or in what form something came out, which differs between two listings of one release
const QUALIFIERS = new Set('japan north america american us europe worldwide format sony full public alpha beta version edition'.split(' '));
function words(caption, min = 2, skip = new Set()) {
  const text = caption.toLowerCase().replace(/\(.*?\)/g, '');
  return new Set((text.match(/[a-z0-9']+/g) || []).filter((w) => w.length >= min && !FILLER.has(w) && !skip.has(w))
    .map((w) => (w.length > 6 ? w.slice(0, 6) : w)));   // a rough stem: Russia / Russian
}
const distinct = (a, b) => DISTINCT.some(([x, y]) => (a.startsWith(x) && b.startsWith(y)) || (a.startsWith(y) && b.startsWith(x)));
const shared = (a, b) => [...a].filter((w) => b.has(w)).length;

test('no event appears twice in a year under different wording', () => {
  const found = [];
  for (const [y, items] of Object.entries(data)) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = words(items[i].caption);
        const b = words(items[j].caption);
        if (a.size && b.size && shared(a, b) / Math.min(a.size, b.size) >= 0.6 && !distinct(items[i].caption, items[j].caption)) {
          found.push(`${y}: "${items[i].caption}" / "${items[j].caption}"`);
        }
      }
    }
  }
  assert.deepEqual(found, [], 'likely duplicates (add real pairs to DISTINCT)');
});

test('no event is filed again within three years', () => {
  // Nearly the same words, in any category (the SNES was once filed under both Gaming and Toys); sequels and an
  // artist's next hit differ enough to pass.
  const found = [];
  for (const i of all) {
    for (const j of all) {
      const gap = +j.y - +i.y;
      if (gap < 1 || gap > 3) continue;
      const a = words(i.caption, 1, QUALIFIERS);
      const b = words(j.caption, 1, QUALIFIERS);
      const union = new Set([...a, ...b]).size;
      if (union && shared(a, b) / union >= 0.6 && !distinct(i.caption, j.caption)) found.push(`${i.y} "${i.caption}" / ${j.y} "${j.caption}"`);
    }
  }
  assert.deepEqual(found, [], 'likely the same event in two years (add real pairs to DISTINCT)');
});

// An album and its single, or two hits by one artist, crowd a year: one Music tile per artist per year.
function artist(caption) {
  const c = caption.replace(/\(.*?\)/g, '').replace(" is the year's No. 1 song", '').trim();
  const m = c.match(/^["“].*?["”]\s+by\s+(.+)$/) || c.match(/^(.+?)['’]s\s/) || c.match(/^.+?\s+by\s+(.+)$/) ||
    c.match(/^(.+?)\s+[-–]\s+.+$/) || c.match(/^(.+?)\s+releases?\b/);
  if (!m) return null;
  return m[1].toLowerCase().split(/\s+(?:featuring|feat\.|and|&|with)\s+/)[0].replace(/[^a-z0-9 ]/g, '').trim();
}
test('one music tile per artist per year', () => {
  const found = [];
  for (const [y, items] of Object.entries(data)) {
    const seen = {};
    for (const i of items.filter((x) => x.category === 'Music')) {
      const a = artist(i.caption);
      if (!a) continue;
      if (seen[a] && !distinct(seen[a], i.caption)) found.push(`${y} ${a}: "${seen[a]}" / "${i.caption}"`);
      seen[a] = seen[a] || i.caption;
    }
  }
  assert.deepEqual(found, []);
});
