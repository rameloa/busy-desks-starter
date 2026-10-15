/* ---------------- room chips ---------------- */
function chipZones(){ const order = ['desk']; const z = ZONES.slice();
  return [z.find(q => q.key === 'desk')].concat(z.filter(q => q.slot != null && !FIXED_SLOTS.has(q.slot) && !q.plan), z.filter(q => q.key === 'cafe' || q.key === 'lounge' || q.key === 'mail'), z.filter(q => q.slot == null), z.filter(q => q.slot != null && !FIXED_SLOTS.has(q.slot) && q.plan)).flat().filter(Boolean); }
function buildChips(){
  const box = byId('chips'); box.textContent = '';
  const mk = (label, col, key, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip2'; b.dataset.key = key || '';
    const dot = document.createElement('b'); dot.style.background = col; b.append(dot, document.createTextNode(label)); b.addEventListener('click', fn); box.append(b); };
  mk('Campus', 'var(--hud-muted)', '', fitAll);
  for (const z of chipZones()){ const name = z.key === 'desk' ? 'My desk' : (z.name || (z.label.charAt(0) + z.label.slice(1).toLowerCase()));
    mk(name + (z.plan && z.label !== 'OPEN ROOM' ? ' · hiring' : ''), z.color, z.key, () => focusOn(z.key === 'desk' ? [16.5, 8, 36, 27.5] : [z.x, z.y, z.x + z.w, z.y + z.h], z.key)); }
  syncChips();
}
function syncChips(){ for (const b of byId('chips').children) b.setAttribute('aria-pressed', String((b.dataset.key || null) === focusKey)); }

/* ---------------- side panel ---------------- */
function openDrawer(panel){
  const d = byId('drawer'); d.hidden = false; appEl.classList.add('open');
  for (const s of byId('dbody').querySelectorAll(':scope > section')) s.hidden = s.dataset.panel !== panel;
  if (d.dataset.panel !== panel){ d.dataset.panel = panel; byId('dbody').scrollTop = 0; }   // a new panel starts at its top
  const top = {info:null, desk:'desk', stream:'stream', goals:'goals', portfolio:'portfolio'}[panel];
  for (const b of document.querySelectorAll('.tabs-main .hbtn')) b.setAttribute('aria-pressed', String(b.dataset.open === top));
}
function closeDrawer(){ byId('drawer').hidden = true; appEl.classList.remove('open'); clearCard();
  for (const b of document.querySelectorAll('.tabs-main .hbtn')) b.setAttribute('aria-pressed', String(b.dataset.open === 'floor')); }
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
  const w = b.dataset.open;
  if (w === 'floor') return closeDrawer();
  if (w === 'chain'){ openDrawer('desk'); byId('chainBox').scrollIntoView({block:'start'}); for (const x of document.querySelectorAll('.tabs-main .hbtn')) x.setAttribute('aria-pressed', String(x === b)); return; }
  openDrawer(w);
}));
// Phones: drag the sheet's handle down to close it; the sheet follows your finger.
{ const d = byId('drawer'), g = byId('drawerGrab'); let y0 = null;
  g.addEventListener('pointerdown', e => { y0 = e.clientY; try { g.setPointerCapture(e.pointerId); } catch (err) {} });
  g.addEventListener('pointermove', e => { if (y0 != null) d.style.transform = 'translateY(' + Math.max(0, e.clientY - y0) + 'px)'; });
  const end = e => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; d.style.transform = ''; if (e.type === 'pointerup' && dy > 60) closeDrawer(); };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end); }
byId('drawerClose').addEventListener('click', closeDrawer);
byId('zoomIn').addEventListener('click', () => zoomBy(1.3));
byId('zoomOut').addEventListener('click', () => zoomBy(1/1.3));
byId('zoomFit').addEventListener('click', fitAll);
function updateCounts(){ byId('hudAct').textContent = deskCounts.act; byId('hudReview').textContent = deskCounts.review; byId('hudFyi').textContent = deskCounts.fyi; byId('hudChain').textContent = chainItems.length; }

/* ---------------- drag, pinch, wheel, taps ---------------- */
const ptrs = {}; let drag = null, pinch = null, moved = 0;
sceneEl.addEventListener('pointerdown', e => {
  if (e.target.closest('button,a')) return;
  ptrs[e.pointerId] = {x:e.clientX, y:e.clientY}; moved = 0;
  const ids = Object.keys(ptrs);
  if (ids.length === 1) drag = {x:e.clientX, y:e.clientY, px:camT.px, py:camT.py};
  if (ids.length === 2){ const a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = {d:Math.hypot(a.x-b.x, a.y-b.y), k:camT.k}; drag = null; }
  try { sceneEl.setPointerCapture(e.pointerId); } catch (err) {}
});
sceneEl.addEventListener('pointermove', e => {
  if (!ptrs[e.pointerId]) return;
  ptrs[e.pointerId] = {x:e.clientX, y:e.clientY};
  const ids = Object.keys(ptrs);
  if (pinch && ids.length >= 2){ const a = ptrs[ids[0]], b = ptrs[ids[1]]; camT.k = clampK(pinch.k * Math.hypot(a.x-b.x, a.y-b.y) / pinch.d); moved = 99; }
  else if (drag){ const s = G0.fit * camT.k, dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
    if (moved > 4){ sceneEl.classList.add('dragging'); camT.px = drag.px + dx / s; camT.py = drag.py + dy / s; camS.px = camT.px; camS.py = camT.py; focusKey = null; } }
});
function endPtr(e){
  const wasTap = drag && moved <= 4 && Object.keys(ptrs).length === 1;
  delete ptrs[e.pointerId];
  if (!Object.keys(ptrs).length){ drag = null; pinch = null; sceneEl.classList.remove('dragging'); syncChips(); }
  if (wasTap && e.type === 'pointerup') tapFloor(e);
}
sceneEl.addEventListener('pointerup', endPtr); sceneEl.addEventListener('pointercancel', endPtr);
sceneEl.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015)); }, {passive:false});
function tapFloor(e){
  const r = sceneEl.getBoundingClientRect(), t = tileAt(e.clientX - r.left, e.clientY - r.top);
  const z = ZONES.find(z => t.x >= z.x && t.x <= z.x + z.w && t.y >= z.y && t.y <= z.y + z.h);
  if (!z) return;
  clearCard();
  if (z.key === 'desk'){ openDrawer('desk'); return; }
  if (z.key === 'investments'){ openDrawer('portfolio'); return; }
  byId('infoName').textContent = z.name || (z.label.charAt(0) + z.label.slice(1).toLowerCase());
  byId('infoRole').textContent = (z.plan && z.label !== 'OPEN ROOM' ? 'Hiring. ' : '') + z.role;
  openDrawer('info');
}

