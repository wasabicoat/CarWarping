(() => {
'use strict';
const DATA = window.CATALOG || {categories: [], colors: []};
const CATS = DATA.categories || [];
const COLORS = DATA.colors || [];
const CAT = new Map(CATS.map(c => [c.key, c]));
const BATCH = 48;
const $ = id => document.getElementById(id);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- URL helpers (the only places media URLs are built) ---------- */
// Cached thumbs are plain static files (no PHP per image); thumb.php only builds missing ones.
const THUMB_PATH = new Map(), PATH_THUMB = new Map(); // thumb id <-> catalog path
for (const c of COLORS) for (const m of c.media) if (m.t) { THUMB_PATH.set(m.t, m.path); PATH_THUMB.set(m.path, m.t); }
const phpThumbUrl = (path, w) => 'thumb.php?p=' + encodeURIComponent(path) + '&w=' + w;
const thumbUrl = (path, w) => {
  const t = PATH_THUMB.get(path);
  return t ? 'cache/thumbs/' + t + '-' + w + '.jpg' : phpThumbUrl(path, w);
};
const origUrl = path => 'Alicar/' + path.split('/').map(encodeURIComponent).join('/');
// A static thumb that isn't built yet 404s: retry through thumb.php before the image's own
// error handler (which falls back to the original) sees it. Capture phase runs first.
document.addEventListener('error', e => {
  const im = e.target;
  if (!(im instanceof HTMLImageElement)) return;
  const m = /cache\/thumbs\/([0-9a-f]{16})-(\d+)\.jpg$/.exec(im.src);
  const path = m && THUMB_PATH.get(m[1]);
  if (!path) return;
  e.stopPropagation();
  im.src = phpThumbUrl(path, m[2]);
}, true);

/* ---------- DOM helpers ---------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function svg(d, fill) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', d);
  s.appendChild(p);
  return s;
}
function dot(cat) {
  const d = el('span', 'dot');
  d.style.background = cat ? cat.swatch : '#888';
  d.title = cat ? cat.label : '';
  return d;
}
const imgsOf = c => c.media.filter(m => m.type === 'image');
const hasVideo = c => c.media.some(m => m.type === 'video');
const catOf = k => CAT.get(k) || {key: k, label: k, swatch: '#888'};

// precompute searchable text + meta
for (const c of COLORS) {
  c._imgs = imgsOf(c);
  c._vid = hasVideo(c);
  c._hay = [c.code, '#' + c.code, c.name, ...c.categories.flatMap(k => [k, catOf(k).label])].join(' ').toLowerCase();
}

/* ---------- state + hash ---------- */
const state = {cat: '', q: '', sort: 'code', list: [], shown: 0};
let viewerState = null; // {color, index}

function parseHash() {
  const out = {};
  for (const part of location.hash.replace(/^#/, '').split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    if (i < 1) continue;
    try { out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1)); } catch { /* ignore bad escape */ }
  }
  return out;
}
function writeHash() {
  const p = [];
  if (state.cat) p.push('cat=' + encodeURIComponent(state.cat));
  if (state.q) p.push('q=' + encodeURIComponent(state.q));
  if (viewerState) {
    p.push('c=' + encodeURIComponent(viewerState.color.id));
    p.push('i=' + viewerState.index);
  }
  const h = p.length ? '#' + p.join('&') : '';
  if (h !== location.hash) history.replaceState(null, '', location.pathname + location.search + h);
}

/* ---------- header scroll ---------- */
const hdr = $('hdr');
const onScroll = () => hdr.classList.toggle('is-compact', scrollY > 30);
addEventListener('scroll', onScroll, {passive: true});
onScroll();

/* ---------- hero ---------- */
function initStats() {
  const photos = COLORS.reduce((n, c) => n + c._imgs.length, 0);
  const fmt = new Intl.NumberFormat('en-US');
  const ul = $('stats');
  [[COLORS.length, 'Colours'], [CATS.length, 'Categories'], [photos, 'Photos']].forEach(([n, l]) => {
    const li = el('li');
    li.append(el('b', '', fmt.format(n)), el('span', '', l));
    ul.appendChild(li);
  });
}
function initHero() {
  const bg = $('heroBg');
  const pool = COLORS.filter(c => c._imgs.length).sort(() => Math.random() - .5).slice(0, 5);
  if (!pool.length || REDUCED) {
    if (pool.length) { // reduced motion: single static cover
      const im = el('img'); im.alt = '';
      im.addEventListener('error', () => { if (!im.dataset.fb) { im.dataset.fb = '1'; im.src = origUrl(pool[0]._imgs[0].path); } });
      im.onload = () => im.classList.add('on');
      im.src = thumbUrl(pool[0]._imgs[0].path, 1600);
      bg.appendChild(im);
    }
    return;
  }
  const imgs = [];
  let cur = -1;
  const show = i => {
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    cur = i;
  };
  pool.forEach(c => {
    const im = el('img'); im.alt = ''; im.decoding = 'async';
    im.dataset.src = thumbUrl(c._imgs[0].path, 1600);
    im.dataset.orig = origUrl(c._imgs[0].path);
    im.addEventListener('error', () => {
      if (!im.dataset.fb) {
        im.dataset.fb = '1';
        im.src = im.dataset.orig;
      }
    });
    bg.appendChild(im); imgs.push(im);
  });
  const load = im => { if (!im.src) im.src = im.dataset.src; };
  const ready = im => im.complete && im.naturalWidth;
  // Fetch one image ahead instead of all five up front, and stop while nobody can see the hero.
  let visible = true;
  new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; }).observe($('hero'));
  imgs[0].addEventListener('load', () => {
    show(0);
    load(imgs[1 % imgs.length]);
    setInterval(() => {
      if (!visible || document.hidden) return;
      const n = (cur + 1) % imgs.length;
      if (ready(imgs[n])) { show(n); load(imgs[(n + 1) % imgs.length]); }
      else load(imgs[n]);
    }, 6500);
  }, {once: true});
  load(imgs[0]);
}

/* ---------- category chips ---------- */
function initChips() {
  const box = $('catsScroll');
  const all = el('button', 'chip chip--all');
  all.type = 'button'; all.dataset.key = '';
  all.append(el('span', '', 'All'), el('span', 'n', String(COLORS.length)));
  box.appendChild(all);
  for (const c of CATS) {
    const b = el('button', 'chip');
    b.type = 'button'; b.dataset.key = c.key;
    b.append(dot(c), el('span', '', c.key), el('small', '', c.label), el('span', 'n', String(c.count)));
    b.querySelector('.dot').removeAttribute('title');
    box.appendChild(b);
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.cat = b.dataset.key;
    update(true);
  });
}
function syncChips() {
  document.querySelectorAll('#catsScroll .chip').forEach(b => {
    const on = b.dataset.key === state.cat;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on && b.scrollIntoView) {
      const box = $('catsScroll');
      box.scrollTo({left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: REDUCED ? 'auto' : 'smooth'});
    }
  });
}

/* ---------- filtering + rendering ---------- */
function computeList() {
  const q = state.q.trim().toLowerCase().replace(/^#/, '');
  let l = COLORS.filter(c =>
    (!state.cat || c.categories.includes(state.cat)) && (!q || c._hay.includes(q)));
  if (state.sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
  else if (state.sort === 'photos') l.sort((a, b) => b.media.length - a.media.length);
  state.list = l;
}
const grid = $('grid');
let entryIO;
function update(scrollTop) {
  computeList();
  state.shown = 0;
  grid.replaceChildren();
  const n = state.list.length;
  const cnt = $('count');
  cnt.replaceChildren('Showing ', el('b', '', String(n)), n === 1 ? ' colour' : ' colours');
  $('empty').hidden = n > 0;
  syncChips();
  writeHash();
  renderBatch();
  if (scrollTop) {
    const top = $('cats').getBoundingClientRect().top + scrollY - 60;
    if (scrollY > top + 4) scrollTo({top, behavior: REDUCED ? 'auto' : 'smooth'});
  }
}
function renderBatch() {
  const frag = document.createDocumentFragment();
  const end = Math.min(state.shown + BATCH, state.list.length);
  for (let i = state.shown; i < end; i++) frag.appendChild(makeCard(state.list[i], i - state.shown));
  grid.appendChild(frag);
  state.shown = end;
  // sentinel may already be visible after a short batch; re-observe to re-trigger
  sentIO.unobserve($('sentinel')); sentIO.observe($('sentinel'));
}

function makeCard(c, idx) {
  const card = el('button', 'card');
  card.type = 'button';
  card.dataset.id = c.id;
  card.style.transitionDelay = REDUCED ? '0s' : Math.min((idx % 12) * 45, 400) + 'ms';
  const label = (c.code ? '#' + c.code + ' ' : '') + c.name;
  card.setAttribute('aria-label', 'View ' + label);

  const wrap = el('div', 'card__img');
  if (c._imgs.length) {
    wrap.appendChild(layer(c, 0, true));
  } else {
    wrap.classList.add('loaded');
    const fb = el('div', 'card__fallback', c.code || '▶');
    wrap.style.background = catOf(c.categories[0]).swatch;
    wrap.appendChild(fb);
  }
  wrap.appendChild(el('span', 'card__sheen'));
  if (c.code) card.appendChild(Object.assign(el('span', 'badge badge--code', '#' + c.code)));
  const nb = el('span', 'badge badge--n');
  nb.append(String(c._imgs.length || c.media.length));
  if (c._vid) { const v = svg('M8 5v14l11-7z'); v.style.fill = 'currentColor'; v.style.marginLeft = '4px'; nb.append(v); }
  // badges must sit above the image wrapper
  wrap.append(...[card.querySelector('.badge--code'), nb].filter(Boolean));
  card.appendChild(wrap);

  const body = el('div', 'card__body');
  body.appendChild(el('span', 'card__name', c.name));
  const dots = el('span', 'card__dots');
  c.categories.slice(0, 4).forEach(k => dots.appendChild(dot(catOf(k))));
  body.appendChild(dots);
  card.appendChild(body);

  card.addEventListener('click', () => openViewer(c, 0, card));
  if (FINE && !REDUCED && c._imgs.length > 1) hoverCycle(card, wrap, c);
  entryIO.observe(card);
  return card;
}
function layer(c, i, first) {
  const im = el('img');
  im.alt = c.name; im.decoding = 'async'; im.draggable = false;
  if (first) im.loading = 'lazy';
  im.addEventListener('load', () => {
    im.classList.add('show');
    im.parentElement && im.parentElement.classList.add('loaded');
  }, {once: true});
  im.addEventListener('error', () => {
    if (!im.dataset.fb) {
      im.dataset.fb = '1';
      im.src = origUrl(c._imgs[i].path);
    } else {
      im.parentElement && im.parentElement.classList.add('loaded');
    }
  });
  im.src = thumbUrl(c._imgs[i].path, 480);
  return im;
}
function hoverCycle(card, wrap, c) {
  let timer = 0, k = 0, layers = null;
  const go = () => {
    const n = layers.length;
    const next = (k + 1) % n;
    // only advance to a layer that has loaded
    if (!layers[next].complete || !layers[next].naturalWidth) return;
    layers[k].classList.remove('show'); layers[next].classList.add('show'); k = next;
  };
  card.addEventListener('mouseenter', () => {
    if (!layers) {
      layers = [wrap.querySelector('img')];
      const n = Math.min(4, c._imgs.length);
      for (let i = 1; i < n; i++) {
        const im = layer(c, i, false);
        im.classList.remove('show');
        im.addEventListener('load', () => im.classList.remove('show'), {once: true}); // loaded but not shown
        wrap.insertBefore(im, wrap.querySelector('.card__sheen'));
        layers.push(im);
      }
    }
    clearInterval(timer);
    timer = setInterval(go, 900);
  });
  card.addEventListener('mouseleave', () => {
    clearInterval(timer);
    if (layers) { layers.forEach((l, i) => l.classList.toggle('show', i === 0)); k = 0; }
  });
}

/* observers */
entryIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); entryIO.unobserve(e.target); }
}), {rootMargin: '0px 0px -6% 0px', threshold: 0.05});
const sentIO = new IntersectionObserver(es => {
  if (es.some(e => e.isIntersecting) && state.shown < state.list.length) renderBatch();
}, {rootMargin: '700px 0px'});
sentIO.observe($('sentinel'));

/* ---------- search / sort / reset ---------- */
let qTimer = 0;
const qInput = $('q');
qInput.addEventListener('input', () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { state.q = qInput.value.trim(); update(false); }, 150);
});
$('sort').addEventListener('change', e => { state.sort = e.target.value; update(false); });
$('reset').addEventListener('click', () => {
  state.cat = ''; state.q = ''; qInput.value = ''; update(true);
});
addEventListener('keydown', e => {
  if (e.key === '/' && !viewerState && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    e.preventDefault(); qInput.focus();
  }
});

/* ---------- viewer ---------- */
const viewer = $('viewer'), stageMedia = $('stageMedia'), strip = $('strip'), stage = $('stage');
let opener = null, curColor = null, curIdx = 0, vDir = 0;
const preloaded = new Set();

function preload(path) {
  const u = thumbUrl(path, 1600);
  if (preloaded.has(u)) return;
  preloaded.add(u);
  const im = new Image(); im.decoding = 'async'; im.src = u;
}
function openViewer(c, index, openerEl) {
  curColor = c;
  opener = openerEl || opener;
  viewer.hidden = false;
  document.body.classList.add('lock');
  $('vTitle').replaceChildren(...(c.code ? [el('span', '', '#' + c.code)] : []), c.name);
  const cats = $('vCats'); cats.replaceChildren();
  c.categories.forEach(k => {
    const v = el('span', 'vcat'); const ct = catOf(k);
    const d = dot(ct); d.removeAttribute('title');
    v.append(d, ct.key + ' · ' + ct.label); cats.appendChild(v);
  });
  strip.replaceChildren();
  c.media.forEach((m, i) => {
    const b = el('button', 'thumb' + (m.type === 'video' ? ' thumb--vid' : ''));
    b.type = 'button'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', (m.type === 'video' ? 'Video ' : 'Photo ') + (i + 1));
    if (m.type === 'video') { const s = svg('M8 5v14l11-7z'); b.appendChild(s); }
    else {
      const im = el('img'); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.draggable = false;
      im.addEventListener('error', () => {
        if (!im.dataset.fb) {
          im.dataset.fb = '1';
          im.src = origUrl(m.path);
        }
      });
      im.src = thumbUrl(m.path, 480); b.appendChild(im);
    }
    b.addEventListener('click', () => { vDir = i > curIdx ? 1 : -1; show(i); });
    strip.appendChild(b);
  });
  const multi = c.media.length > 1;
  $('vPrev').hidden = $('vNext').hidden = !multi;
  vDir = 0;
  show(Math.max(0, Math.min(c.media.length - 1, index | 0)));
  $('vClose').focus({preventScroll: true});
}
function show(i) {
  const c = curColor, n = c.media.length;
  i = (i + n) % n;
  stageMedia.querySelectorAll('video').forEach(v => v.pause());
  curIdx = i;
  viewerState = {color: c, index: i};
  const m = c.media[i];
  stageMedia.className = 'stage__media' + (vDir > 0 ? ' slide-l' : vDir < 0 ? ' slide-r' : '');
  const frag = document.createDocumentFragment();
  if (m.type === 'video') {
    const v = el('video');
    v.controls = true; v.playsInline = true; v.preload = 'metadata';
    v.src = origUrl(m.path);
    frag.appendChild(v);
  } else {
    const lo = el('img', 'blur'); lo.alt = ''; lo.draggable = false;
    const hi = el('img', 'full'); hi.alt = c.name; hi.draggable = false; hi.decoding = 'async';
    const sp = el('div', 'spin');
    const done = () => { hi.classList.add('show'); sp.remove(); setTimeout(() => lo.remove(), 520); };
    hi.addEventListener('load', done, {once: true});
    hi.addEventListener('error', () => {
      if (!hi.dataset.fb) {
        hi.dataset.fb = '1';
        hi.src = origUrl(m.path);
      } else {
        sp.remove(); hi.remove(); lo.classList.remove('blur');
      }
    });
    lo.addEventListener('error', () => {
      if (!lo.dataset.fb) {
        lo.dataset.fb = '1';
        lo.src = origUrl(m.path);
      }
    });
    lo.src = thumbUrl(m.path, 480);
    hi.src = thumbUrl(m.path, 1600);
    frag.append(lo, hi, sp);
  }
  stageMedia.replaceChildren(frag);
  const sub = $('vSub');
  sub.hidden = !m.sub; sub.textContent = m.sub || '';
  $('vCtr').textContent = (i + 1) + ' / ' + n;
  const open = $('vOpen'); open.href = origUrl(m.path);
  [...strip.children].forEach((b, k) => b.setAttribute('aria-selected', k === i ? 'true' : 'false'));
  const t = strip.children[i];
  if (t) strip.scrollTo({left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: REDUCED || !vDir ? 'auto' : 'smooth'});
  for (const d of [1, -1]) { const nm = c.media[(i + d + n) % n]; if (nm && nm.type === 'image') preload(nm.path); }
  writeHash();
}
function closeViewer() {
  if (viewer.hidden) return;
  stageMedia.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
  stageMedia.replaceChildren();
  viewer.hidden = true;
  document.body.classList.remove('lock');
  const id = curColor && curColor.id;
  viewerState = null; curColor = null;
  writeHash();
  let target = opener && document.body.contains(opener) ? opener : null;
  if (!target && id) target = [...grid.children].find(k => k.dataset.id === id);
  (target || qInput).focus({preventScroll: false});
  opener = null;
}
const step = d => { if (curColor && curColor.media.length > 1) { vDir = d; show(curIdx + d); } };
$('vPrev').addEventListener('click', () => step(-1));
$('vNext').addEventListener('click', () => step(1));
viewer.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeViewer(); });
addEventListener('keydown', e => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
  else if (e.key === 'ArrowRight' && e.target.tagName !== 'VIDEO') step(1);
  else if (e.key === 'ArrowLeft' && e.target.tagName !== 'VIDEO') step(-1);
  else if (e.key === 'Tab') { // focus trap
    const f = [...viewer.querySelectorAll('button:not([hidden]),a[href],video[controls]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!viewer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
// swipe
let sx = 0, sy = 0, st = 0, tracking = false;
stage.addEventListener('touchstart', e => {
  if (e.touches.length !== 1 || e.target.closest('video')) return;
  tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
}, {passive: true});
stage.addEventListener('touchend', e => {
  if (!tracking) return; tracking = false;
  const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st < 800) step(dx < 0 ? 1 : -1);
}, {passive: true});

/* ---------- hash -> state ---------- */
function applyHash(initial) {
  const h = parseHash();
  state.cat = CAT.has(h.cat) ? h.cat : '';
  state.q = h.q || '';
  qInput.value = state.q;
  update(false);
  if (h.c) {
    const c = COLORS.find(x => x.id === h.c);
    if (c) {
      const i = parseInt(h.i, 10) || 0;
      if (viewer.hidden) openViewer(c, i, null);
      else if (curColor !== c) { openViewer(c, i, opener); }
      else if (curIdx !== i) show(i);
    }
  } else if (!viewer.hidden) closeViewer();
}

/* ---------- live viewer count ---------- */
function initPresence() {
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
  const url = 'presence.php?id=' + id;
  let timer = 0;
  const ping = () => fetch(url, {cache: 'no-store'}).then(r => r.ok ? r.json() : null).then(d => {
    if (!d) return;
    $('liveN').textContent = new Intl.NumberFormat('en-US').format(d.online);
    $('live').hidden = false;
  }).catch(() => {});
  const start = () => { clearInterval(timer); ping(); timer = setInterval(ping, 30000); };
  // Background tabs stop pinging (and drop off the count) so idle tabs cost the server nothing.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInterval(timer); navigator.sendBeacon(url + '&leave=1'); }
    else start();
  });
  addEventListener('pagehide', () => navigator.sendBeacon(url + '&leave=1'));
  if (!document.hidden) start();
}

/* ---------- boot ---------- */
initPresence();
initStats();
initChips();
initHero();
applyHash(true);
addEventListener('hashchange', () => {
  // ignore changes we made ourselves via replaceState (they don't fire hashchange); this handles manual edits / back nav
  applyHash(false);
});
})();
