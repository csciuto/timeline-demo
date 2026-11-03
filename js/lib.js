// Pure helpers, shared by the page and the unit tests (node --test tests/).

export const KINDS = {
  hit: 'radio', radio: 'radio', tv: 'tv', film: 'film', car: 'car', shelf: 'shelf', news: 'news',
};

export const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

export function decadeOf(year) {
  return Math.floor(year / 10) * 10;
}

export function clampYear(year, first, last) {
  if (!Number.isFinite(year)) return null;
  return Math.min(last, Math.max(first, Math.round(year)));
}

// "#1969" -> 1969; anything else -> null
export function yearFromHash(hash, first, last) {
  const m = /^#?(\d{4})$/.exec(hash || '');
  if (!m) return null;
  const y = Number(m[1]);
  return y >= first && y <= last ? y : null;
}

export function formatCents(cents) {
  return cents < 100 ? `${cents}¢` : `$${(cents / 100).toFixed(2)}`;
}

export function formatDollars(x) {
  return '$' + x.toFixed(2);
}

// Group a year's items by room station, keeping file order; the No. 1 song leads the radio.
export function byStation(items) {
  const out = { radio: [], tv: [], film: [], car: [], shelf: [], news: [] };
  for (const it of items) {
    const st = KINDS[it.kind];
    if (st) out[st].push(it);
  }
  out.radio.sort((a, b) => (b.kind === 'hit') - (a.kind === 'hit'));
  return out;
}

// What things cost, as display rows. `now` is the latest year's prices.
export function priceRows(p, now, year, dollarYear) {
  if (!p) return [];
  const rows = [];
  if (p.stamp != null) rows.push({ label: 'A first-class stamp', value: formatCents(p.stamp), now: formatCents(now.stamp) });
  if (p.min_wage != null) rows.push({ label: 'Federal minimum wage, per hour', value: formatDollars(p.min_wage), now: formatDollars(now.min_wage) });
  if (p.dollar != null && year < dollarYear) {
    rows.push({ label: `$1 in ${year} buys what this does in ${dollarYear}`, value: '$1.00', now: formatDollars(p.dollar) });
  }
  return rows;
}

// Credit line for an image: free images name author and license; others are marked fair use.
export function imageCredit(img) {
  if (!img) return '';
  if (img.nonfree) return '© rights holder · shown small for reference';
  const who = img.artist && img.artist.length < 80 ? img.artist : '';
  return [who, img.license].filter(Boolean).join(' · ');
}

export function wikiUrl(title) {
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_'));
}

export function randomYear(first, last, current, rand = Math.random) {
  if (last <= first) return first;
  for (let i = 0; i < 20; i++) {
    const y = first + Math.floor(rand() * (last - first + 1));
    if (y !== current) return y;
  }
  return current === last ? first : current + 1;
}
