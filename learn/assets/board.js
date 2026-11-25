/* LSDH Learning — draw-on-the-page whiteboard
   Two surfaces:
     • page  : ink that sits on top of the lecture page and scrolls with it
     • board : a blank dotted sheet filling the window, for free drawing
   Keys: D draw on/off · B blank board · P pen · H highlighter · E eraser · L laser
         1–6 colours · [ ] thinner/thicker · Ctrl/Cmd+Z undo · Esc exit            */
(function () {
  'use strict';
  const COLORS = ['#2fb52f', '#e03131', '#1f4fd1', '#1aa7cf', '#d63aa8', '#17191c'];
  const WIDTHS = [2, 3.5, 6];
  const key = 'lsdh-board:' + location.pathname;
  const st = { on: false, sheet: false, tool: 'pen', color: COLORS[0], wi: 1 };
  const ink = { page: [], board: [] };
  try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && s.page) { ink.page = s.page; ink.board = s.board || []; } } catch (_) {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(ink)); } catch (_) {} };

  const main = () => document.querySelector('main') || document.body;
  const originX = () => main().getBoundingClientRect().left + window.scrollX;

  // ---- DOM ----
  const pageCv = document.createElement('canvas'); pageCv.id = 'wb-layer';
  const sheet = document.createElement('div'); sheet.id = 'wb-sheet';
  const boardCv = document.createElement('canvas');
  boardCv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:41;display:none;touch-action:none;cursor:crosshair';
  const sheetBg = document.createElement('div');
  sheetBg.style.cssText = 'position:fixed;inset:0;z-index:40;display:none;background:#fff;background-image:radial-gradient(#d9d6ce 1px,transparent 1px);background-size:28px 28px';
  const laserCv = document.createElement('canvas');
  laserCv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:42;pointer-events:none';

  const icon = {
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    hl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
    er: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19"/><path d="M22 21H7"/></svg>',
    laser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/></svg>',
  };
  const bar = document.createElement('div'); bar.id = 'wb-bar';
  bar.innerHTML =
    '<div class="wb-tools">' +
    `<button data-t="pen" title="Pen (P)">${icon.pen}</button>` +
    `<button data-t="hl" title="Highlighter (H)">${icon.hl}</button>` +
    `<button data-t="er" title="Eraser — removes whole strokes (E)">${icon.er}</button>` +
    `<button data-t="laser" title="Laser pointer (L)">${icon.laser}</button>` +
    '<span class="sep"></span>' +
    COLORS.map((c, i) => `<button class="sw" data-c="${c}" title="Colour ${i + 1}" style="background:${c}"></button>`).join('') +
    '<span class="sep"></span>' +
    '<button data-w title="Line width ([ / ])">—</button>' +
    `<button data-a="undo" title="Undo (Ctrl+Z)">${icon.undo}</button>` +
    '<button data-a="clear" title="Clear this surface">Clear</button>' +
    `<button data-a="sheet" title="Blank whiteboard (B)">${icon.sheet} Board</button>` +
    '<button data-a="png" title="Save board as PNG" style="display:none">Save</button>' +
    '<span class="sep"></span></div>' +
    '<button class="wb-main" data-a="toggle" title="Draw on this page (D)">✎ Draw</button>';

  function mount() {
    document.body.append(pageCv, sheetBg, boardCv, laserCv, bar);
    bar.addEventListener('click', onBar);
    sync(); layout();
    new ResizeObserver(layout).observe(document.body);
    window.addEventListener('resize', layout);
    attach(pageCv, 'page'); attach(boardCv, 'board'); attachLaserOnly();
    document.addEventListener('keydown', onKey);
  }

  // ---- layout & rendering ----
  let pdpr = 1;
  function layout() {
    const w = document.documentElement.scrollWidth, h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    pdpr = Math.min(window.devicePixelRatio || 1, 2, 15000 / h);
    pageCv.width = Math.round(w * pdpr); pageCv.height = Math.round(h * pdpr);
    pageCv.style.width = w + 'px'; pageCv.style.height = h + 'px';
    const d = Math.min(window.devicePixelRatio || 1, 2);
    boardCv.width = innerWidth * d; boardCv.height = innerHeight * d; boardCv._d = d;
    laserCv.width = innerWidth * d; laserCv.height = innerHeight * d; laserCv._d = d;
    render('page'); render('board');
  }
  function surf(s) { return s === 'page' ? { cv: pageCv, d: pdpr, ox: originX(), oy: 0 } : { cv: boardCv, d: boardCv._d || 1, ox: 0, oy: 0 }; }
  function strokePath(g, s, ox, oy) {
    const p = s.p; g.beginPath();
    if (p.length === 1) { g.arc(p[0][0] + ox, p[0][1] + oy, s.w / 2, 0, 7); g.fillStyle = s.c; g.fill(); return; }
    g.moveTo(p[0][0] + ox, p[0][1] + oy);
    for (let i = 1; i < p.length - 1; i++) {
      const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
      g.quadraticCurveTo(p[i][0] + ox, p[i][1] + oy, mx + ox, my + oy);
    }
    const q = p[p.length - 1]; g.lineTo(q[0] + ox, q[1] + oy); g.stroke();
  }
  function paint(g, s, ox, oy) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = s.c; g.lineWidth = s.w;
    if (s.hl) { g.globalAlpha = 0.28; g.globalCompositeOperation = 'multiply'; g.lineCap = 'butt'; }
    strokePath(g, s, ox, oy); g.restore();
  }
  function render(which) {
    const { cv, d, ox, oy } = surf(which), g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(d, 0, 0, d, 0, 0);
    for (const s of ink[which]) paint(g, s, ox, oy);
  }

  // ---- input ----
  function local(which, e) {
    if (which === 'page') return [e.pageX - originX(), e.pageY];
    return [e.clientX, e.clientY];
  }
  function attach(cv, which) {
    let cur = null;
    cv.addEventListener('pointerdown', e => {
      if (!st.on) return; e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      if (st.tool === 'laser') { laserAdd(e); cur = 'laser'; return; }
      if (st.tool === 'er') { cur = 'er'; erase(which, e); return; }
      const hl = st.tool === 'hl';
      const pr = e.pointerType === 'pen' && e.pressure ? (0.55 + e.pressure) : 1;
      cur = { c: st.color, w: (hl ? WIDTHS[st.wi] * 4.5 : WIDTHS[st.wi]) * (hl ? 1 : pr), hl, p: [local(which, e)] };
      ink[which].push(cur); render(which);
    });
    cv.addEventListener('pointermove', e => {
      if (!st.on) return;
      if (st.tool === 'laser' && (cur === 'laser' || e.pointerType === 'mouse')) { laserAdd(e); return; }
      if (!cur) return;
      if (cur === 'er') { erase(which, e); return; }
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) cur.p.push(local(which, ev));
      const { cv: c, d, ox, oy } = surf(which), g = c.getContext('2d');
      g.setTransform(d, 0, 0, d, 0, 0);
      if (cur.hl) render(which); else { const t = { c: cur.c, w: cur.w, p: cur.p.slice(-4) }; paint(g, t, ox, oy); }
    });
    const end = () => { if (cur && cur !== 'laser' && cur !== 'er') { cur.p = cur.p.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]); render(which); } if (cur) save(); cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  function erase(which, e) {
    const [x, y] = local(which, e), R = 12;
    const before = ink[which].length;
    ink[which] = ink[which].filter(s => !s.p.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < (R + s.w / 2) ** 2));
    if (ink[which].length !== before) render(which);
  }

  // ---- laser (fading trail on its own canvas) ----
  let trail = [], raf = 0;
  function laserAdd(e) { trail.push([e.clientX, e.clientY, performance.now()]); if (!raf) raf = requestAnimationFrame(laserTick); }
  function laserTick() {
    const now = performance.now(), g = laserCv.getContext('2d'), d = laserCv._d || 1;
    trail = trail.filter(p => now - p[2] < 650);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, laserCv.width, laserCv.height); g.setTransform(d, 0, 0, d, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = 1 - (now - trail[i][2]) / 650;
      g.strokeStyle = `rgba(230,30,30,${a})`; g.lineWidth = 2 + 5 * a;
      g.shadowColor = 'rgba(255,60,60,.8)'; g.shadowBlur = 10 * a;
      g.beginPath(); g.moveTo(trail[i - 1][0], trail[i - 1][1]); g.lineTo(trail[i][0], trail[i][1]); g.stroke();
    }
    raf = trail.length ? requestAnimationFrame(laserTick) : 0;
  }
  function attachLaserOnly() { /* laser works through the page/board canvases while drawing mode is on */ }

  // ---- state & toolbar ----
  function sync() {
    document.body.classList.toggle('wb-on', st.on);
    pageCv.style.pointerEvents = st.on && !st.sheet ? 'auto' : 'none';
    pageCv.style.cursor = st.tool === 'laser' ? 'none' : 'crosshair';
    boardCv.style.cursor = pageCv.style.cursor;
    sheetBg.style.display = boardCv.style.display = st.sheet ? 'block' : 'none';
    bar.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === st.tool));
    bar.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === st.color));
    const wb = bar.querySelector('[data-w]'); wb.textContent = ['thin', 'medium', 'thick'][st.wi];
    bar.querySelector('[data-a=sheet]').classList.toggle('on', st.sheet);
    bar.querySelector('[data-a=png]').style.display = st.sheet ? '' : 'none';
    bar.querySelector('.wb-main').textContent = st.on ? '✕ Done' : '✎ Draw';
  }
  function setOn(v) { st.on = v; if (!v) st.sheet = false; sync(); }
  function onBar(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) { st.tool = b.dataset.t; }
    else if (b.dataset.c) { st.color = b.dataset.c; if (st.tool === 'er' || st.tool === 'laser') st.tool = 'pen'; }
    else if ('w' in b.dataset) { st.wi = (st.wi + 1) % WIDTHS.length; }
    else switch (b.dataset.a) {
      case 'toggle': setOn(!st.on); return;
      case 'undo': undo(); break;
      case 'clear': { const w = st.sheet ? 'board' : 'page'; if (ink[w].length && confirm('Clear all ink on the ' + (st.sheet ? 'blank board' : 'page') + '?')) { ink[w] = []; render(w); save(); } break; }
      case 'sheet': st.sheet = !st.sheet; if (st.sheet) st.on = true; break;
      case 'png': savePng(); break;
    }
    sync();
  }
  function undo() { const w = st.sheet ? 'board' : 'page'; ink[w].pop(); render(w); save(); }
  function savePng() {
    const c = document.createElement('canvas'); c.width = boardCv.width; c.height = boardCv.height;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(boardCv, 0, 0);
    const a = document.createElement('a'); a.download = 'board.png'; a.href = c.toDataURL('image/png'); a.click();
  }
  function onKey(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.altKey) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { if (st.on) { e.preventDefault(); undo(); } return; }
    if (e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === 'd') return setOn(!st.on);
    if (k === 'escape') return setOn(false);
    if (k === 'b') { st.sheet = !st.sheet; if (st.sheet) st.on = true; return sync(); }
    if (!st.on) return;
    if (k === 'p') st.tool = 'pen'; else if (k === 'h') st.tool = 'hl'; else if (k === 'e') st.tool = 'er'; else if (k === 'l') st.tool = 'laser';
    else if (k >= '1' && k <= '6') { st.color = COLORS[+k - 1]; if (st.tool === 'er' || st.tool === 'laser') st.tool = 'pen'; }
    else if (k === '[') st.wi = Math.max(0, st.wi - 1); else if (k === ']') st.wi = Math.min(2, st.wi + 1);
    else return;
    sync();
  }

  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
