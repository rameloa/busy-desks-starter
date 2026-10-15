/* ---------------- camera ----------------
   True 2:1 isometric. Fit fills the window with the building; chips, Fit, the zoom buttons,
   the wheel and pinch all move one camera. Labels are placed in screen space from the same maths. */
const camS = {k:1, px:0, py:0}, camT = {k:1, px:0, py:0};
let focusKey = null, view = {w:1, h:1, phone:false};
let insets = {top:136, bottom:76};
function measure(){
  view = {w:sceneEl.clientWidth || innerWidth, h:sceneEl.clientHeight || innerHeight, phone:(sceneEl.clientWidth || innerWidth) < 760};
  const hud = document.querySelector('.hud'), cap = document.querySelector('.caption'), staff = byId('staff');
  const hb = hud.offsetTop + hud.offsetHeight, chipsTop = hb + 8, top = chipsTop + 52;
  appEl.style.setProperty('--chipsTop', chipsTop + 'px'); appEl.style.setProperty('--panelTop', top + 'px');
  const bottom = view.phone ? (view.h - cap.offsetTop) + 8 : Math.max(76, view.h - Math.min(cap.offsetTop, staff.offsetTop) + 8);
  insets = {top, bottom};
}
measure(); addEventListener('resize', measure); setTimeout(measure, 300); setTimeout(measure, 2000);
function isOpen(){ return !byId('drawer').hidden; }
function geom(){
  const phone = view.phone, open = isOpen() && !phone;
  const top = insets.top, bottom = insets.bottom, side = open ? 404 : 0;
  const aw = view.w - side, ah = Math.max(200, view.h - top - bottom);
  const fit = phone ? (0.97 * view.w) / 1493 : Math.min((0.92 * aw) / 1493, (0.95 * ah) / 830);
  return {fit, cx: aw / 2, cy: top + ah / 2, aw, ah};
}
function proj(x, y, z){ const dx = (x - 22) * U, dy = (y - 22) * U; return [0.70711 * (dx + dy), 0.35355 * (dy - dx) - 0.86603 * (z || 0) * U]; }
let G0 = geom();
function screenOf(x, y, z){ const r = proj(x, y, z), s = G0.fit * camS.k; return [G0.cx + s * (camS.px + r[0]), G0.cy + s * (camS.py + r[1])]; }
function tileAt(sx, sy){
  const s = G0.fit * camS.k, X = (sx - G0.cx) / s - camS.px, Y = (sy - G0.cy) / s - camS.py;
  const a = X / 0.70711, b = Y / 0.35355; return {x:(a - b) / 2 / U + 22, y:(a + b) / 2 / U + 22};
}
function focusOn(bb, key){
  const g = geom(), pts = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]], xs = [], ys = [];
  for (const q of pts) for (const z of [0, 3.2]){ const r = proj(q[0], q[1], z); xs.push(r[0]); ys.push(r[1]); }
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  const s = Math.min((0.74 * g.aw) / bw, (0.72 * g.ah) / bh, 3.2);
  camT.k = s / g.fit; camT.px = -(Math.max(...xs) + Math.min(...xs)) / 2; camT.py = -(Math.max(...ys) + Math.min(...ys)) / 2 + 18 / s;
  focusKey = key || null; focusBB = key ? bb : null; syncChips();
}
function fitAll(){ camT.k = 1; camT.px = 0; camT.py = 0; focusKey = null; syncChips(); }
// Zooming by hand keeps the room you focused (its walls stay cut away); panning or Campus leaves it.
const clampK = k => Math.max(0.6, Math.min(4.5, k));
function zoomBy(f){ camT.k = clampK(camT.k * f); syncChips(); }

