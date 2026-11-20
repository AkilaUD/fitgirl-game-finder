import {
  scanPc, gpuScore, cpuScore, evaluate,
  reqGpuScore, reqCpuScore, ramGb, storageGb
} from './specs.js';

const $ = (sel) => document.querySelector(sel);
const KEY = 'rf.rig.v2';

let games = [];
let filtered = [];
let rig = { gpu: '', cpu: '', ram: null, freeGb: null };
let detected = null;
const state = { q: '', sizeMin: 0, sizeMax: 200, yearMin: null, yearMax: null, genres: new Set(), compat: 'any', sort: 'new', limit: 60 };

/* ---------------- data ---------------- */

const fmtGb = (n) => {
  if (n == null) return '—';
  if (n < 1) return `${Math.round(n * 1024)} MB`;
  return n >= 10 ? `${Math.round(n)} GB` : `${n.toFixed(1)} GB`;
};
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const pctSaved = (g) => (g.origGb && g.sizeGb ? Math.round((1 - g.sizeGb / g.origGb) * 100) : null);

async function init() {
  let data;
  try {
    const r = await fetch('data/games.json');
    data = await r.json();
  } catch (e) {
    $('#count').textContent = 'Could not load data/games.json — open the app through a local server, not the file system.';
    return;
  }
  games = data.games || data;
  games.forEach((g, i) => { g.id = i; });
  buildFacets();
  restoreRig();
  wire();
  loadSuggestions();
  render();
}

// Autocomplete for the hardware fields: model names taken from the requirements themselves.
async function loadSuggestions() {
  try {
    const r = await fetch('data/suggestions.json');
    if (!r.ok) return;
    const s = await r.json();
    fillDatalist('gpuList', s.gpus || []);
    fillDatalist('cpuList', s.cpus || []);
  } catch {}
}

function fillDatalist(id, items) {
  const dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = items.slice(0, 300).map((v) => `<option value="${esc(v)}"></option>`).join('');
}

function buildFacets() {
  const counts = new Map();
  let yMin = 9999, yMax = 0;
  for (const g of games) {
    if (g.date) { const y = Number(g.date.slice(0, 4)); if (y) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); } }
    for (const t of g.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  state.yearMin = yMin;
  state.yearMax = yMax;
  const maxSize = Math.ceil(Math.max(...games.map((g) => g.sizeGb || 0)));
  state.sizeMax = maxSize;
  $('#sizeMax').value = maxSize;
  const ySelA = $('#yearMin'), ySelB = $('#yearMax');
  for (let y = yMax; y >= yMin; y--) {
    ySelA.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
    ySelB.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
  }
  ySelA.value = String(yMin);
  ySelB.value = String(yMax);

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  $('#genreChips').innerHTML = top.map(([t, c]) => `<button class="chip" data-g="${t}">${t} <span class="muted">${c}</span></button>`).join('');
}

/* ---------------- rig ---------------- */

function restoreRig() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && (saved.gpu || saved.cpu || saved.ram)) {
      rig = { gpu: saved.gpu || '', cpu: saved.cpu || '', ram: saved.ram ?? null, freeGb: saved.freeGb ?? null };
      detected = saved.detected || null;
    }
  } catch {}
  syncRigInputs();
  paintRig();
}

function saveRig() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...rig, detected })); } catch {}
}

function hasRig() { return Boolean(rig.gpu || rig.cpu || rig.ram); }
function pcProfile() {
  return { gpuScore: gpuScore(rig.gpu), cpuScore: cpuScore(rig.cpu), ram: rig.ram ? Number(rig.ram) : null, freeGb: rig.freeGb ? Number(rig.freeGb) : null };
}

function syncRigInputs() {
  $('#fGpu').value = rig.gpu || '';
  $('#fCpu').value = rig.cpu || '';
  $('#fRam').value = rig.ram ?? '';
  $('#fDisk').value = rig.freeGb ?? '';
}

function paintRig() {
  const gs = gpuScore(rig.gpu);
  const cs = cpuScore(rig.cpu);
  $('#gpuScoreTag').textContent = rig.gpu ? (gs ? `index ${gs} · ${gs >= 70 ? 'high-end' : gs >= 34 ? 'upper mid-range' : gs >= 16 ? 'mid-range' : gs >= 6 ? 'entry-level' : 'very low'}` : 'not recognised — try the exact model name') : '';
  $('#cpuScoreTag').textContent = rig.cpu ? (cs ? `relative score ${cs.toFixed(1)}` : 'not recognised — try e.g. "Ryzen 5 5600"') : '';

  const d = detected || {};
  const bits = [];
  if (d.source === 'local-server') bits.push('<span class="tag">read from this PC</span>');
  if (d.cpu) bits.push(`<span>CPU <b>${esc(String(d.cpu).replace(/\s+/g, ' '))}</b></span>`);
  if (d.cores) bits.push(`<span><b>${d.cores}</b> threads</span>`);
  if (d.ramGb) bits.push(`<span>RAM <b>${d.ramGb} GB</b></span>`);
  else if (d.ram) bits.push(`<span>RAM <b>${d.ram}${d.ramCapped ? '+' : ''} GB</b> (browser estimate)</span>`);
  if (d.drives && d.drives.length) {
    bits.push(`<span>Drives <b>${d.drives.map((x) => `${x.mount} ${Math.round(x.freeGb)} GB free`).join(' · ')}</b></span>`);
  }
  if (d.screen) bits.push(`<span>Display <b>${d.screen}</b>${d.dpr > 1 ? ` @${d.dpr}x` : ''}</span>`);
  if (d.platform) bits.push(`<span>Platform <b>${d.platform}</b></span>`);
  if (d.source === 'browser') {
    bits.push(helperExpected()
      ? '<span>Browser estimate — the local helper is not running. Start it with <code>node scripts/serve.mjs</code> for the exact CPU model, total RAM and free disk space.</span>'
      : '<span>Browser estimate — a hosted page cannot read your CPU model or free disk space; type them in below, or run the site locally with <code>node scripts/serve.mjs</code> for exact detection.</span>');
  }
  $('#rigDetected').innerHTML = bits.join('');

  $('#clearBtn').hidden = !hasRig();
  const status = $('#rigStatus');

  if (!hasRig()) {
    status.textContent = 'No profile yet — scan to detect your GPU and hardware, or type it in below.';
    $('#rigSummary').innerHTML = '';
    return;
  }
  const pc = pcProfile();
  let runnable = 0, great = 0;
  for (const g of games) {
    if (!g.steam) continue;
    const v = predict(g, pc).verdict;
    if (v === 'rec') { runnable++; great++; }
    else if (v === 'min') runnable++;
  }
  const missing = [];
  if (!rig.gpu) missing.push('graphics card');
  if (rig.freeGb == null) missing.push('free disk space');
  const hint = missing.length ? ` Add your ${missing.join(' and ')} for accurate matching.` : '';
  status.textContent = `Matched against ${games.filter((g) => g.steam).length.toLocaleString()} repacks that have published requirements.${hint}`;
  $('#rigSummary').innerHTML = `<strong>${runnable.toLocaleString()}</strong> repacks should run · <strong>${great.toLocaleString()}</strong> hit recommended specs`;
}

/* ---------------- filtering ---------------- */

function predict(g, pc) {
  if (!g._v) g._v = {};
  return g._v[pcKey(pc)] || (g._v[pcKey(pc)] = evaluate(g, pc));
}
const pcKey = (pc) => `${pc.gpuScore}|${pc.cpuScore}|${pc.ram}|${pc.freeGb}`;

function applyFilters() {
  const pc = pcProfile();
  const q = state.q.trim().toLowerCase();
  filtered = games.filter((g) => {
    if (state.q && !(`${g.title} ${(g.tags || []).join(' ')} ${g.companies || ''}`.toLowerCase().includes(q))) return false;
    if (g.sizeGb == null || g.sizeGb < state.sizeMin || g.sizeGb > state.sizeMax) return false;
    const y = g.date ? Number(g.date.slice(0, 4)) : null;
    if (y && (y < state.yearMin || y > state.yearMax)) return false;
    if (state.genres.size) {
      const tags = (g.tags || []).map((t) => t.toLowerCase());
      let ok = false;
      for (const want of state.genres) if (tags.includes(want.toLowerCase())) { ok = true; break; }
      if (!ok) return false;
    }
    if (state.compat !== 'any') {
      if (!hasRig()) return true;
      const v = predict(g, pc).verdict;
      if (state.compat === 'rec' && v !== 'rec') return false;
      if (state.compat === 'min' && v !== 'rec' && v !== 'min') return false;
    }
    return true;
  });

  const sort = state.sort;
  filtered.sort((a, b) => {
    if (sort === 'small') return (a.sizeGb || 0) - (b.sizeGb || 0);
    if (sort === 'large') return (b.sizeGb || 0) - (a.sizeGb || 0);
    if (sort === 'fit' && hasRig()) {
      const rank = { rec: 0, min: 1, unknown: 2, below: 3, nodata: 4 };
      const ra = rank[predict(a, pc).verdict] ?? 3, rb = rank[predict(b, pc).verdict] ?? 3;
      if (ra !== rb) return ra - rb;
      return (b.date || '').localeCompare(a.date || '');
    }
    return (b.date || '').localeCompare(a.date || '');
  });
  return pc;
}

/* ---------------- rendering ---------------- */

function verdictBadge(v) {
  const map = {
    rec: ['rec', 'Runs great'],
    min: ['min', 'Meets minimum'],
    below: ['below', 'Below minimum'],
    unknown: ['unknown', 'Specs unknown'],
    nodata: ['unknown', 'No spec data'],
  };
  const [cls, label] = map[v] || map.unknown;
  return `<span class="badge ${cls}">${label}</span>`;
}

function card(g, pc) {
  const v = hasRig() ? (g.steam ? predict(g, pc).verdict : 'nodata') : null;
  const saved = pctSaved(g);
  const tags = (g.tags || []).slice(0, 2).join(' · ');
  const thumb = g.img
    ? `<div class="thumb"><img src="${esc(g.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.thumb').classList.add('missing');this.remove()"></div>`
    : `<div class="thumb missing"><span aria-hidden="true">${esc((g.title || '?').trim().charAt(0))}</span></div>`;
  return `<article class="card" data-id="${g.id}">
    ${thumb}
    <div class="card-top">
      <span class="pill">${fmtGb(g.sizeGb)}</span>
      ${v ? verdictBadge(v) : ''}
    </div>
    <h3>${esc(g.title)}</h3>
    <p class="meta">${fmtDate(g.date)}${tags ? ' · ' + esc(tags) : ''}</p>
    <div class="sizes"><s>${fmtGb(g.origGb)}</s> <b>${fmtGb(g.sizeGb)}</b>${saved ? `<span class="save">−${saved}%</span>` : ''}</div>
  </article>`;
}

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render() {
  const pc = applyFilters();
  const n = filtered.length;
  $('#count').innerHTML = `<strong>${n.toLocaleString()}</strong> repack${n === 1 ? '' : 's'}${hasRig() && state.compat !== 'any' ? ' matching your PC' : ''} · ${games.length.toLocaleString()} total`;
  $('#grid').innerHTML = filtered.slice(0, state.limit).map((g) => card(g, pc)).join('');
  $('#empty').hidden = n > 0;
  $('#more').hidden = n <= state.limit;
  $('#more').textContent = `Load more (${Math.max(0, n - state.limit).toLocaleString()} left)`;

  const reco = $('#reco');
  if (hasRig() && pc.gpuScore && n > 0) {
    const picks = filtered.filter((g) => g.steam && predict(g, pc).verdict === 'rec')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 8);
    if (picks.length) {
      reco.hidden = false;
      $('#recoStrip').innerHTML = picks.map((g) => card(g, pc)).join('');
    } else reco.hidden = true;
  } else reco.hidden = true;
}

/* ---------------- modal ---------------- */

function checkField(kind, text, pc) {
  if (!text) return 'unknown';
  if (kind === 'gpu') { const need = reqGpuScore(text); return need == null || pc.gpuScore == null ? 'unknown' : pc.gpuScore >= need * 0.95 ? 'pass' : 'fail'; }
  if (kind === 'cpu') { const need = reqCpuScore(text); return need == null || pc.cpuScore == null ? 'unknown' : pc.cpuScore >= need * 0.97 ? 'pass' : 'fail'; }
  if (kind === 'ram') { const need = ramGb(text); return need == null || pc.ram == null ? 'unknown' : pc.ram >= need ? 'pass' : 'fail'; }
  if (kind === 'storage') { const need = storageGb(text); return need == null || pc.freeGb == null ? 'unknown' : pc.freeGb >= need ? 'pass' : 'fail'; }
  return 'unknown';
}

function reqBlock(title, req, pc, extraClass = '') {
  if (!req) return `<div class="req-block ${extraClass}"><h4>${title}</h4><p class="req-note">Not published for this game.</p></div>`;
  const rows = [['OS', 'os', req.os], ['Processor', 'cpu', req.cpu], ['Memory', 'ram', req.ram], ['Graphics', 'gpu', req.gpu], ['DirectX', 'dx', req.dx], ['Storage', 'storage', req.storage]];
  const comparable = new Set(['cpu', 'ram', 'gpu', 'storage']);
  const html = rows.filter((r) => r[2]).map(([label, kind, val]) => {
    const st = hasRig() && comparable.has(kind) ? checkField(kind, val, pc) : '';
    return `<div class="req-row"><dt>${label}</dt><dd>${esc(val)}${st ? `<span class="dot ${st}" title="${st === 'pass' ? 'Your PC meets this' : st === 'fail' ? 'Below this' : 'Could not compare'}"></span>` : ''}</dd></div>`;
  }).join('');
  const notes = req.notes ? `<p class="req-note">${esc(req.notes)}</p>` : '';
  return `<div class="req-block ${extraClass}"><h4>${title}</h4>${html || '<p class="req-note">Empty listing.</p>'}${notes}</div>`;
}

function openGame(id) {
  const g = games.find((x) => x.id === Number(id));
  if (!g) return;
  const pc = pcProfile();
  const ev = hasRig() && g.steam ? evaluate(g, pc) : null;
  const saved = pctSaved(g);
  const steam = g.steam || null;
  $('#mBody').innerHTML = `
    ${g.img ? `<div class="m-banner"><img src="${esc(g.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.m-banner').remove()"></div>` : ''}
    <h2 class="m-title" id="mTitle">${esc(g.title)}</h2>
    <div class="m-meta">
      <span>${fmtDate(g.date)}</span>
      ${g.tags?.length ? `<span>${esc(g.tags.join(', '))}</span>` : ''}
      ${g.companies ? `<span>by ${esc(g.companies)}</span>` : ''}
      ${g.languages ? `<span>${esc(g.languages)}</span>` : ''}
    </div>
    ${ev ? `<div class="m-yourpc">${verdictBadge(ev.verdict)}<span class="pill">Your GPU index <b>${pc.gpuScore ?? '—'}</b></span><span class="pill">Your RAM <b>${pc.ram ?? '—'} GB</b></span></div>` : ''}
    <div class="m-stats">
      <div class="stat"><span>Repack size</span><b>${fmtGb(g.sizeGb)}</b></div>
      <div class="stat"><span>Original size</span><b>${fmtGb(g.origGb)}</b></div>
      <div class="stat"><span>Saved</span><b>${saved != null ? '−' + saved + '%' : '—'}</b></div>
    </div>
    <div class="req-cols">
      ${reqBlock('Minimum', steam?.min, pc)}
      ${reqBlock('Recommended', steam?.rec, pc, 'rec')}
    </div>
    <p class="req-note">${steam ? 'Requirements from the Steam store listing.' : 'No Steam listing matched, so no requirements are available for this one.'} Cyan dot: your hardware clears it. Pink: it falls short.</p>
    <div class="m-actions">
      <a class="btn primary" href="${g.url}" target="_blank" rel="noopener">Open repack page</a>
      ${steam?.appid ? `<a class="btn ghost" href="https://store.steampowered.com/app/${steam.appid}" target="_blank" rel="noopener">Steam page</a>` : ''}
      ${steam?.appid ? `<a class="btn ghost" href="https://store.steampowered.com/app/${steam.appid}/?l=english" target="_blank" rel="noopener">Reviews &amp; screenshots</a>` : ''}
    </div>`;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------------- events ---------------- */

function wire() {
  $('#q').addEventListener('input', (e) => { state.q = e.target.value; state.limit = 60; render(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('#sizeMin').addEventListener('input', (e) => { state.sizeMin = Number(e.target.value) || 0; state.limit = 60; render(); });
  $('#sizeMax').addEventListener('input', (e) => { state.sizeMax = Number(e.target.value) || 200; state.limit = 60; render(); });
  $('#yearMin').addEventListener('change', (e) => { state.yearMin = Number(e.target.value); state.limit = 60; render(); });
  $('#yearMax').addEventListener('change', (e) => { state.yearMax = Number(e.target.value); state.limit = 60; render(); });
  $('#more').addEventListener('click', () => { state.limit += 60; render(); });

  $('#sizePresets').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-max]');
    if (!b) return;
    state.sizeMin = Number(b.dataset.min || 0);
    state.sizeMax = Number(b.dataset.max);
    $('#sizeMin').value = state.sizeMin;
    $('#sizeMax').value = state.sizeMax;
    state.limit = 60;
    render();
  });

  $('#compat').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    if (!hasRig() && b.dataset.v !== 'any') { flashRig(); return; }
    [...$('#compat').children].forEach((c) => c.classList.toggle('on', c === b));
    state.compat = b.dataset.v;
    state.limit = 60;
    render();
  });

  $('#genreChips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-g]');
    if (!b) return;
    const g = b.dataset.g;
    if (state.genres.has(g)) state.genres.delete(g); else state.genres.add(g);
    b.classList.toggle('on');
    state.limit = 60;
    render();
  });

  $('#resetFilters').addEventListener('click', () => {
    state.q = ''; state.sizeMin = 0; state.sizeMax = 200; state.genres.clear(); state.compat = 'any'; state.sort = 'new'; state.limit = 60;
    state.yearMin = Number($('#yearMin').options[$('#yearMin').options.length - 1].value);
    state.yearMax = Number($('#yearMax').options[0].value);
    $('#q').value = ''; $('#sizeMin').value = 0; $('#sizeMax').value = 200;
    $('#yearMin').value = String(state.yearMin); $('#yearMax').value = String(state.yearMax);
    $('#sort').value = 'new';
    [...$('#genreChips').querySelectorAll('.chip')].forEach((c) => c.classList.remove('on'));
    [...$('#compat').children].forEach((c, i) => c.classList.toggle('on', i === 0));
    render();
  });

  for (const [id, key] of [['#fGpu', 'gpu'], ['#fCpu', 'cpu']]) {
    $(id).addEventListener('input', (e) => { rig[key] = e.target.value.trim(); saveRig(); paintRig(); render(); });
  }
  for (const [id, key] of [['#fRam', 'ram'], ['#fDisk', 'freeGb']]) {
    $(id).addEventListener('input', (e) => { rig[key] = e.target.value === '' ? null : Number(e.target.value); saveRig(); paintRig(); render(); });
  }

  $('#ramChips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ram]');
    if (!b) return;
    rig.ram = Number(b.dataset.ram);
    $('#fRam').value = rig.ram;
    saveRig(); paintRig(); render();
  });

  $('#scanBtn').addEventListener('click', runScan);
  $('#scanTop').addEventListener('click', runScan);
  $('#clearBtn').addEventListener('click', () => {
    rig = { gpu: '', cpu: '', ram: null, freeGb: null };
    detected = null;
    localStorage.removeItem(KEY);
    syncRigInputs(); paintRig(); render();
  });

  $('#grid').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openGame(c.dataset.id); });
  $('#recoStrip').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openGame(c.dataset.id); });
  $('#mClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

function flashRig() {
  $('#rig').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#rig').animate([{ borderColor: 'rgba(255,107,122,.8)' }, { borderColor: '#211829' }], { duration: 1200 });
}

// /api/system is served only by scripts/serve.mjs. A static host such as Vercel has no such
// route — and a remote server could not read this machine's hardware anyway — so ask for it
// only when the page is running on a local/private address. ?helper=1 forces the probe on
// another host (e.g. serve.mjs behind a domain), ?helper=0 turns it off.
const PRIVATE_HOST =
  /^(localhost|(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|\[::1\]|::1|[a-z0-9-]+\.local)$/i;

function helperExpected() {
  const forced = new URLSearchParams(location.search).get('helper');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return PRIVATE_HOST.test(location.hostname || '');
}

async function readSystemInfo() {
  if (!helperExpected()) return null;
  try {
    const res = await fetch('/api/system', { cache: 'no-store', headers: { Accept: 'application/json' } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function runScan() {
  const btn = $('#scanBtn');
  btn.disabled = true;
  btn.textContent = 'Scanning…';
  try {
    // The local helper server can read what a browser cannot: CPU model, real RAM, every drive.
    const local = await readSystemInfo();
    const browser = await scanPc();
    detected = { ...browser, ...(local || {}) };

    if (local) {
      detected.source = 'local-server';
      if (local.cpu) rig.cpu = String(local.cpu).replace(/\s+/g, ' ').replace(/\s*\(R\)|\s*\(TM\)/gi, '').replace(/\s*CPU\s*@.*$/i, '').trim();
      if (local.ramGb) rig.ram = Math.round(local.ramGb);
      const gpus = (local.gpus || [])
        .filter((g) => !/virtual|basic display|remote|mirror/i.test(g))
        .sort((a, b) => (gpuScore(b) || 0) - (gpuScore(a) || 0));
      if (gpus[0]) rig.gpu = String(gpus[0]).replace(/\s*\((r|tm)\)/gi, '').replace(/\s+/g, ' ').trim();
      else if (browser.gpu) rig.gpu = browser.gpu;
      if (local.drives && local.drives.length) rig.freeGb = Math.round(local.freeGb);
      else if (browser.freeGb) rig.freeGb = Math.round(browser.freeGb);
    } else {
      detected.source = 'browser';
      if (browser.gpu) rig.gpu = browser.gpu;
      // Only trust an exact memory figure: the API caps out at 8 GB and would
      // under-report bigger machines to every game's RAM requirement.
      if (browser.ram && !browser.ramCapped && !rig.ram) rig.ram = browser.ram;
    }

    syncRigInputs();
    saveRig();
    paintRig();
    render();
  } catch (e) {
    $('#rigStatus').textContent = 'The scan was blocked by your browser. Type your specs in manually.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scan my PC';
  }
}

// Contact form: posts to the local helper server, which relays it through Resend.
// The API key stays on the server; the page never sees it.
function wireContactForm() {
  const form = $('#contactForm');
  if (!form) return;
  const status = $('#contactStatus');
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const message = String(data.message || '').trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.className = 'contact-status err';
      status.textContent = 'Please add your name, a valid email address and a message.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Sending…';
    status.className = 'contact-status';
    status.textContent = '';
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `Sending failed (HTTP ${r.status}).`);
      form.reset();
      status.className = 'contact-status ok';
      status.textContent = 'Message sent — thanks! I will reply to the address you left.';
    } catch (err) {
      status.className = 'contact-status err';
      status.textContent = /^Failed to fetch/.test(err.message)
        ? 'The mail endpoint is not reachable. Run the app with node scripts/serve.mjs, or email nexorasoftwarestudio@gmail.com directly.'
        : err.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Send message';
    }
  });
}

wireContactForm();
init();
