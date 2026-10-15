/* ---------------- main loop ---------------- */
let last = performance.now(), staffTick = 0;
// If a device can't keep up (under ~24 frames a second over the first seconds), drop small props and decorative animation.
const perf = {t0: 0, n: 0, done: false};
function watchSpeed(now){ if (perf.done) return; if (!perf.t0){ perf.t0 = now; return; } perf.n++;
  if (now - perf.t0 > 5000){ perf.done = true; if (perf.n / ((now - perf.t0) / 1000) < 24) sceneEl.classList.add('lite'); } }
function frame(now){
  const dt = Math.min(.05, (now - last)/1000); last = now; frameNo++; watchSpeed(now);
  for (const a of Object.values(agents)){ stepAgent(a, now, dt); a.hop = Math.max(0, a.hop - dt*4*speed); }
  for (const a of Object.values(agents)) settle(a, dt);
  vacInit(now); for (const v of vacs) vacStep(v, now, dt);
  you.hop = Math.max(0, you.hop - dt*4*speed);
  nextRun();
  if (replaying && !runQueue.length && Object.values(agents).every(a => !a.busy())) endReplay();

  // camera
  G0 = geom();
  const ease = reduced || drag ? 1 : Math.min(1, dt * 7);
  for (const k of ['k','px','py']){ const d = camT[k] - camS[k]; camS[k] = Math.abs(d) < (k === 'k' ? 1e-4 : .05) ? camT[k] : camS[k] + d * ease; }
  const s = G0.fit * camS.k;
  const cl = G0.cx.toFixed(1) + 'px', ct = G0.cy.toFixed(1) + 'px'; if (camEl._l !== cl + ct){ camEl._l = cl + ct; camEl.style.left = cl; camEl.style.top = ct; }
  const camTf = 'scale(' + s.toFixed(4) + ') translate(' + camS.px.toFixed(1) + 'px,' + camS.py.toFixed(1) + 'px)';
  setT(camEl, camTf); setT(sprEl, camTf); if (sprEl._l !== camEl._l){ sprEl._l = camEl._l; sprEl.style.left = cl; sprEl.style.top = ct; }
  // Small furniture and name tags show up close, or whenever a room is focused (on a phone a focused room sits just under 100%).
  // Once on, they stay on down to 60% while still zoomed in past Campus, so zooming around the threshold never makes them blink
  // (back at Campus scale or wider they go off, as before).
  const wasNear = sceneEl.classList.contains('near'), near = s >= 1 || (s >= .6 && (!!focusKey || (wasNear && camS.k > 1))); if (wasNear !== near) sceneEl.classList.toggle('near', near);
  const zp = Math.round(s * 100) + '%'; if (byId('zoomPct').textContent !== zp) byId('zoomPct').textContent = zp;

  // characters on the floor
  const propsOn = near && !sceneEl.classList.contains('lite');
  applyCutaway();
  for (const id of Object.keys(agentNodes)) if (!agents[id]){ const n = agentNodes[id]; n.spot.remove(); n.ring.remove(); n.trail.remove(); delete agentNodes[id]; }
  for (const a of Object.values(agents)){
    const n = nodeFor(a);
    placeSprite(n, a.x, a.y, .2, a.hop); occlude(n, a.x, a.y, .2, a.hop, propsOn);
    n.spot.classList.toggle('walking', !!a.path && !reduced);
    n.spot.classList.toggle('sit', !!a.sitting && !a.path);
    if (n.spot.classList.contains('left') !== (a.fx < 0)) n.spot.classList.toggle('left', a.fx < 0);
    if (n.spot.classList.contains('back') !== !!a.back) n.spot.classList.toggle('back', !!a.back);
    n.spot.classList.toggle('fail', !!(a.failAt && now - a.failAt < 1800));
    n.av.classList.toggle('carrying', !!a.carry);
    const busy = a.busy();
    n.ring.style.display = busy ? '' : 'none';
    if (busy) setT(n.ring, floorMatrix(a.x - .7, a.y - .7, .2));
    const end = a.carry && a.path && a.path.length ? a.path[a.path.length - 1] : null;
    n.trail.style.display = end ? '' : 'none';
    if (end){ const dx = (end.x - a.x)*U, dy = (end.y - a.y)*U; n.trail.style.width = Math.hypot(dx, dy).toFixed(1) + 'px'; setT(n.trail, floorMatrix(a.x, a.y, .2, Math.atan2(dy, dx)*180/Math.PI)); }
  }
  if (!youNode) youNode = makeSprite('You, at your desk', '#C9402A', '#2A1C14', 'star', () => openDrawer('desk'));
  placeSprite(youNode, you.x, you.y, .24, you.hop); occlude(youNode, you.x, you.y, .24, you.hop, propsOn);
  for (const v of vacs) vacDraw(v, now, propsOn);
  for (const k of ['act','review','fyi']){ const el = trayEls[k], on = !!trayFlash[k] && now - trayFlash[k] < 900; if (el && el.classList.contains('flash') !== on) el.classList.toggle('flash', on); }
  for (const [id, els] of Object.entries(stackEls)){ const n = Math.min(4, held[id] || 0); els.forEach((b, i) => { const on = i < n; if ((b.style.display !== 'none') !== on) b.style.display = on ? '' : 'none'; }); }

  // labels
  const placed = [], phone = view.phone;
  const hit = (r) => placed.some(q => r.x < q.x + q.w + 4 && r.x + r.w + 4 > q.x && r.y < q.y + q.h + 4 && r.y + r.h + 4 > q.y);
  const put = (ax, ay, wd, ht, below) => {
    const bx = ax - wd/2, by = below ? ay + 4 : ay - ht - 6, sx = wd/2 + 12, sy = ht + 6;
    const c = below ? [[0,0],[sx,0],[-sx,0],[0,sy],[sx,sy],[-sx,sy]] : [[0,0],[0,-sy],[-sx,0],[sx,0],[-sx,-sy],[sx,-sy],[0,-2*sy],[-2*sx,0],[2*sx,0]];
    for (const o of c){ const r = {x:bx + o[0], y:by + o[1], w:wd, h:ht}; if (!hit(r)){ placed.push(r); return r; } }
    return null;
  };
  { const q = [[19.4,20.4,0],[24.4,20.4,0],[19.4,22,0],[24.4,22,0],[19.4,20.4,1.4],[24.4,22,1.4]].map(t => screenOf(t[0], t[1], t[2]));
    const xs = q.map(t => t[0]), ys = q.map(t => t[1]); placed.push({x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs) - Math.min(...xs), h:Math.max(...ys) - Math.min(...ys)}); }
  const pos = (e, r) => { e.style.left = Math.round(r.x) + 'px'; e.style.top = Math.round(r.y) + 'px'; };
  const people = Object.values(agents).sort((p, q) => (q.busy() - p.busy()));
  const bw = phone ? 190 : 220;
  const bubbleFor = (key, x, y, z, b) => {
    const e = labEl(key, mkBubble), ch = e._t !== b.text + '|' + b.why;
    if (ch){ e._t = b.text + '|' + b.why; e.children[0].textContent = b.text; e.children[1].textContent = b.why ? 'Why: ' + b.why : ''; e.style.width = bw + 'px'; e._h = 0; }
    e.classList.toggle('bad', !!b.bad); e.classList.toggle('popping', !!b.pop && now - b.from < 1200);
    const bar = e.children[2]; bar.hidden = !b.prog; if (b.prog) bar.firstChild.style.width = Math.max(0, Math.min(1, (now - b.from)/(b.until - b.from)))*100 + '%';
    if (!e._h) e._h = e.offsetHeight || 56;
    const h = screenOf(x, y, z + 1.75), r = put(h[0], h[1], bw, e._h, false);
    if (!r){ e.hidden = true; return; }
    pos(e, r); e.children[3].style.left = Math.max(10, Math.min(bw - 22, h[0] - r.x - 6)) + 'px';
  };
  if (s >= .45){
    for (const a of people){ if (a.bubble && now < a.bubble.until) bubbleFor('b:' + a.id, a.x, a.y, .2 + a.hop*.35, a.bubble); else a.bubble = a.bubble && now < a.bubble.until ? a.bubble : null; }
    if (you.bubble && now < you.bubble.until) bubbleFor('b:you', you.x, you.y, .24, Object.assign({why:''}, you.bubble)); else you.bubble = null;
  }
  const tagFor = (key, id, name, x, y, z, work, sel, isYou, lead) => {
    const e = labEl(key, () => mkTag(id));
    if (e._n !== name){ e._n = name; e.lastChild.textContent = name; if (isYou){ e.lastChild.style.cssText = 'background:#C9402A;color:#fff;padding:0 3px'; } }
    e.classList.toggle('work', work); e.classList.toggle('sel', sel); e.classList.toggle('lead', !!lead);
    const f = screenOf(x, y, z), hd = screenOf(x, y, z + 1.6), wd = Math.ceil(name.length * (phone ? 6.6 : 7.9) + (work ? 26 : 16) + (lead ? 12 : 0)), ht = phone ? 17 : 19;
    const r = put(f[0], f[1], wd, ht, true) || put(hd[0], hd[1], wd, ht, false);
    if (!r){ e.hidden = true; return; } pos(e, r);
  };
  for (const a of people){ const work = a.busy(), sel = a.id === selectedId;
    if (near || work || sel) tagFor('t:' + a.id, a.id, a.name.split(' ')[0], a.x, a.y, .2 + a.hop*.35, work, sel, false, a.rank === 'lead' || a.rank === 'executive'); }
  if (near) tagFor('t:you', 'you', 'You', you.x, you.y, .24, false, false, true);
  if (near){
    for (const a of people){ if (!a.emote || now >= a.emote.until || (a.bubble && now < a.bubble.until)){ if (a.emote && now >= a.emote.until) a.emote = null; continue; }
      const e = labEl('e:' + a.id, mkEmote); if (e._e !== a.emote.e){ e._e = a.emote.e; e.firstChild.innerHTML = EMO[a.emote.e] || ''; }
      const h = screenOf(a.x, a.y, 2), r = put(h[0], h[1], 26, 26, false); if (!r){ e.hidden = true; continue; } pos(e, r); }
  }
  if (s >= .6){
    for (const st of SEATS){ const n = held[st.agent.id] || 0; if (!n) continue;
      const e = labEl('c:' + st.agent.id, mkCount); if (e.textContent !== String(n)) e.textContent = String(n);
      const h = screenOf(st.x + .35, st.y - 1.3, 1.4), r = put(h[0], h[1], 20, 20, false); if (!r){ e.hidden = true; continue; } pos(e, r); }
  }
  for (const [k, e] of Object.entries(LAB)) if (e._f !== frameNo && !e.hidden) e.hidden = true;

  // what each person is doing, in the staff strip
  if (now - staffTick > 500){ staffTick = now;
    for (const li of byId('staff').children){ const id = li.dataset.id; if (!id) continue; const a = agents[id];
      let t = 'Hiring'; if (a){ t = a.busy() ? (a.carry ? 'Carrying an item' : 'Working') : a.emote && now < a.emote.until ? (EMO_TEXT[a.emote.e] || 'On a break') : a.path ? 'Walking' : 'At their desk'; }
      const d = li.querySelector('.doing'); if (d && d.textContent !== t) d.textContent = t;
      li.classList.toggle('sel', id === selectedId); } }
  requestAnimationFrame(frame);
}
applyRegistry(LOADING);
requestAnimationFrame(frame);

