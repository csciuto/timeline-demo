// The timeline: every item from data.json in one wall, grouped by year.
// Years: a rail on wide screens, a picker on narrow ones. Filters: search and category chips.
// State lives in the URL (?cat=Art,Books&q=moon#1983) so a link reopens the same view.

const state = { cats: new Set(), q: '' };   // no categories chosen = show all
let years = [];                              // ['1950', …]
let sections = {};                           // year -> { el, tiles: [{ el, item }] }

const $ = (id) => document.getElementById(id);

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.cats = new Set((p.get('cat') || '').split(',').filter(Boolean));
  state.q = p.get('q') || '';
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.cats.size) p.set('cat', [...state.cats].join(','));
  if (state.q) p.set('q', state.q);
  const qs = p.toString().replace(/%2C/g, ',');
  history.replaceState(null, '', (qs ? '?' + qs : location.pathname) + location.hash);
}

function tile(item) {
  const el = document.createElement('article');
  el.className = 'tile';
  if (item.photo) {
    const img = document.createElement('img');
    img.src = item.photo;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.addEventListener('error', () => { img.hidden = true; });
    el.append(img);
  }
  if (item.credit) {
    const a = document.createElement('a');
    a.className = 'credit';
    a.href = item.credit.url;
    a.textContent = item.credit.text;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    el.append(a);
  }
  const cap = document.createElement('p');
  cap.className = 'caption';
  cap.textContent = item.caption;
  const cat = document.createElement('p');
  cat.className = 'category';
  cat.textContent = item.category;
  el.append(cap, cat);
  return el;
}

function build(data) {
  years = Object.keys(data).sort();
  const wall = $('wall');
  wall.textContent = '';
  for (const y of years) {
    const sec = document.createElement('section');
    sec.className = 'year';
    sec.id = y;
    sec.setAttribute('aria-labelledby', 'h' + y);
    const h = document.createElement('h2');
    h.id = 'h' + y;
    h.textContent = y;
    const grid = document.createElement('div');
    grid.className = 'grid';
    const tiles = data[y].map((item) => ({ item, el: tile(item) }));
    grid.append(...tiles.map((t) => t.el));
    sec.append(h, grid);
    wall.append(sec);
    sections[y] = { el: sec, tiles };
  }
  const empty = document.createElement('p');
  empty.id = 'empty';
  empty.className = 'empty';
  empty.textContent = 'Nothing matches.';
  empty.hidden = true;
  wall.append(empty);

  // Year rail, by decade
  const rail = $('rail');
  for (let d = +years[0].slice(0, 3) * 10; d <= +years[years.length - 1]; d += 10) {
    const box = document.createElement('div');
    box.className = 'decade';
    const label = document.createElement('div');
    label.className = 'decade-label';
    label.textContent = d + 's';
    const list = document.createElement('div');
    list.className = 'decade-years';
    for (const y of years.filter((y) => +y >= d && +y < d + 10)) {
      const a = document.createElement('a');
      a.href = '#' + y;
      a.textContent = y;
      a.dataset.year = y;
      list.append(a);
    }
    box.append(label, list);
    rail.append(box);
  }

  // Year picker for narrow screens
  const sel = $('year-select');
  for (let d = +years[0].slice(0, 3) * 10; d <= +years[years.length - 1]; d += 10) {
    const g = document.createElement('optgroup');
    g.label = d + 's';
    for (const y of years.filter((y) => +y >= d && +y < d + 10)) g.append(new Option(y, y));
    sel.append(g);
  }
  sel.addEventListener('change', () => jumpTo(sel.value));

  // Category chips, biggest first
  const counts = {};
  for (const y of years) for (const t of sections[y].tiles) counts[t.item.category] = (counts[t.item.category] || 0) + 1;
  const chips = $('chips');
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'chip chip-all';
  all.textContent = 'All';
  all.addEventListener('click', () => { state.cats.clear(); apply(); });
  chips.append(all);
  for (const c of Object.keys(counts).sort((a, b) => (a === 'Misc') - (b === 'Misc') || counts[b] - counts[a])) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = c;
    b.dataset.cat = c;
    b.addEventListener('click', () => {
      if (state.cats.has(c)) state.cats.delete(c); else state.cats.add(c);
      apply();
    });
    chips.append(b);
  }
}

// keep: stay on the year in view while the filters change
function apply(keep = true) {
  const stay = keep ? current : null;
  const q = state.q.toLowerCase();
  let shown = 0;
  for (const y of years) {
    let n = 0;
    for (const t of sections[y].tiles) {
      const ok = (!state.cats.size || state.cats.has(t.item.category)) && (!q || t.item.caption.toLowerCase().includes(q));
      t.el.hidden = !ok;
      if (ok) n++;
    }
    sections[y].el.hidden = n === 0;
    document.querySelector(`.rail a[data-year="${y}"]`).classList.toggle('none', n === 0);
    shown += n;
  }
  $('empty').hidden = shown > 0;
  const total = years.reduce((s, y) => s + sections[y].tiles.length, 0);
  $('count').textContent = shown === total ? `${total.toLocaleString()} items` : `${shown.toLocaleString()} of ${total.toLocaleString()}`;
  for (const b of document.querySelectorAll('.chip')) {
    const on = b.dataset.cat ? state.cats.has(b.dataset.cat) : state.cats.size === 0;
    b.setAttribute('aria-pressed', String(on));
  }
  writeUrl();
  if (stay) jumpTo(stay); else spy();
}

// Jump to a year, or the nearest shown year after it
function jumpTo(y) {
  const target = years.find((v) => v >= y && !sections[v].el.hidden) || [...years].reverse().find((v) => !sections[v].el.hidden);
  if (!target) return;
  sections[target].el.scrollIntoView();
  history.replaceState(null, '', location.pathname + location.search + '#' + target);
  pinned = { year: target, y: scrollY };   // near the end the page can't scroll it to the top
  setCurrent(target);
}

// The year at the top of the wall: highlighted in the rail and picker
let current = null;
function setCurrent(y) {
  if (y === current) return;
  current = y;
  for (const a of document.querySelectorAll('.rail a')) a.classList.toggle('current', a.dataset.year === y);
  $('year-select').value = y;
  const a = document.querySelector(`.rail a[data-year="${y}"]`);
  const rail = $('rail');
  if (a && (a.offsetTop < rail.scrollTop || a.offsetTop > rail.scrollTop + rail.clientHeight - 40)) {
    rail.scrollTop = a.offsetTop - rail.clientHeight / 3;
  }
}

let pinned = null;
function spy() {
  if (pinned && Math.abs(scrollY - pinned.y) < 2) return setCurrent(pinned.year);
  pinned = null;
  const line = $('top').getBoundingClientRect().bottom + 40;
  let y = null;
  for (const v of years) {
    const el = sections[v].el;
    if (el.hidden) continue;
    if (el.getBoundingClientRect().top <= line) y = v; else break;
  }
  y = y || years.find((v) => !sections[v].el.hidden);
  if (y) setCurrent(y);
}

function syncTopHeight() {
  document.documentElement.style.setProperty('--top-h', $('top').offsetHeight + 'px');
}

async function main() {
  readUrl();
  $('search').value = state.q;
  let data;
  try {
    data = await (await fetch('data.json')).json();
  } catch (e) {
    $('wall').textContent = 'Could not load the timeline. Try refreshing.';
    return;
  }
  build(data);
  syncTopHeight();
  new ResizeObserver(syncTopHeight).observe($('top'));
  apply(false);

  $('search').addEventListener('input', (e) => { state.q = e.target.value.trim(); apply(); });
  $('rail').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-year]');
    if (!a) return;
    e.preventDefault();
    jumpTo(a.dataset.year);
  });
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { spy(); ticking = false; });
  }, { passive: true });

  const start = location.hash.slice(1);
  if (sections[start]) jumpTo(start);
}

main();
