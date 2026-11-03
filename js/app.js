import {
  DECADES, decadeOf, clampYear, yearFromHash, byStation, priceRows, imageCredit, wikiUrl, randomYear,
} from './lib.js';

const DEFAULT_YEAR = 1969;
const VERSION = 'dev';

const $ = (s) => document.querySelector(s);
let data = null;
let year = DEFAULT_YEAR;

const KIND_LABEL = { hit: 'No. 1 song of the year' };

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c) e.append(c);
  return e;
}

function card(it) {
  const img = it.img;
  const figure = img
    ? el('figure', { class: 'pic' + (img.nonfree ? ' pic-ref' : '') },
      el('img', {
        src: img.src, alt: '', loading: 'lazy', decoding: 'async', width: img.w, height: img.h,
        referrerpolicy: 'no-referrer',
      }),
      el('figcaption', {},
        el('a', { href: img.page, text: imageCredit(img), title: 'Image source' })))
    : null;
  const more = it.about
    ? el('details', { class: 'more' },
      el('summary', { text: 'More' }),
      el('p', { text: it.about }),
      el('a', { href: wikiUrl(it.title), text: 'Read on Wikipedia' }))
    : null;
  const article = el('article', { class: `card k-${it.kind}` + (img ? '' : ' no-pic') },
    figure,
    el('div', { class: 'card-body' },
      KIND_LABEL[it.kind] ? el('span', { class: 'badge', text: KIND_LABEL[it.kind] }) : null,
      el('h3', { class: 'card-title', text: it.text }),
      it.note ? el('p', { class: 'note', text: it.note }) : null,
      more));
  if (img) {
    // A missing image shouldn't leave a hole: fall back to the text card.
    article.querySelector('img').addEventListener('error', () => {
      figure.remove();
      article.classList.add('no-pic');
    }, { once: true });
  }
  return article;
}

function render() {
  const items = data.years[String(year)] || [];
  const stations = byStation(items);
  document.body.dataset.decade = String(decadeOf(year));
  document.title = `${year} · The Year Room`;
  $('#big-year').textContent = year;
  $('#year-input').value = year;
  $('#year-slider').value = year;
  $('#prev').disabled = year <= data.first;
  $('#next').disabled = year >= data.last;
  for (const b of document.querySelectorAll('#decades button')) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.decade) === decadeOf(year)));
  }

  const hit = stations.radio.find((i) => i.kind === 'hit');
  const car = stations.car[0];
  const film = stations.film[0];
  const bits = [];
  if (hit) bits.push(`${hit.text.split(' · ')[0]} is the song of the year`);
  if (film) bits.push(`${film.text} is playing`);
  if (car) bits.push(`there's a new ${car.text} in the driveway`);
  $('#year-line').textContent = bits.length ? `${bits.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()) : '';

  for (const [name, list] of Object.entries(stations)) {
    const box = document.querySelector(`[data-station="${name}"] .cards`);
    box.replaceChildren(...list.map(card));
    box.closest('.station').hidden = list.length === 0;
  }

  const now = data.prices[String(data.last)];
  const rows = priceRows(data.prices[String(year)], now, year, data.dollar_year);
  $('#prices').replaceChildren(
    el('tr', { class: 'receipt-head' }, el('th', { text: '' }), el('th', { text: String(year) }),
      el('th', { text: String(data.last) })),
    ...rows.map((r) => el('tr', {}, el('th', { scope: 'row', text: r.label }),
      el('td', { text: r.value }), el('td', { text: r.now }))));
  $('#prices-note').textContent = 'Rates in effect on July 1. Dollar values use each year\'s average consumer price index.';
}

function go(y, { push = true } = {}) {
  const next = clampYear(y, data.first, data.last);
  if (next == null) return;
  const changed = next !== year;
  year = next;
  if (push && changed) history.replaceState(null, '', `#${year}`);
  render();
}

function setup() {
  const first = data.first;
  const last = data.last;
  for (const id of ['#year-input', '#year-slider']) {
    $(id).min = first;
    $(id).max = last;
  }
  $('#decades').replaceChildren(...DECADES.filter((d) => d + 9 >= first && d <= last).map((d) => el('button', {
    class: 'decade', 'data-decade': d, 'aria-pressed': 'false', text: `${String(d).slice(2)}s`,
    title: `The ${d}s`,
  })));
  $('#decades').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = Number(b.dataset.decade);
    go(decadeOf(year) === d ? year : Math.max(first, d + (year % 10)));
  });
  $('#prev').addEventListener('click', () => go(year - 1));
  $('#next').addEventListener('click', () => go(year + 1));
  $('#random').addEventListener('click', () => go(randomYear(first, last, year)));
  $('#year-slider').addEventListener('input', (e) => go(Number(e.target.value)));
  $('#year-input').addEventListener('change', (e) => go(Number(e.target.value)));
  $('#year-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go(Number(e.target.value));
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft') { go(year - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(year + 1); e.preventDefault(); }
    if (e.key === 'r' || e.key === 'R') go(randomYear(first, last, year));
  });
  window.addEventListener('hashchange', () => {
    const y = yearFromHash(location.hash, first, last);
    if (y != null && y !== year) go(y, { push: false });
  });
}

async function start() {
  $('#version').textContent = VERSION;
  try {
    const r = await fetch('data/years.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch (err) {
    const box = $('#error');
    box.textContent = `Couldn't load the year data (${err.message}). Reload the page to try again.`;
    box.hidden = false;
    return;
  }
  year = yearFromHash(location.hash, data.first, data.last) ?? DEFAULT_YEAR;
  setup();
  render();
  document.body.classList.add('ready');
}

start();
