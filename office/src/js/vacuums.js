/* ---------------- robot vacuums ----------------
   Pure floor life, like errands: two little vacuums roam the open floor, give way to people and to each other,
   and drive home to charge when the battery runs low. They are not agents: no names, no words, no events, never
   counted as busy, never carry items or touch the trays. Same solid floor as people (route, tryMove). */
const VAC_DOCKS = [{x:20.5, y:28.7, col:'#F2F3EF', trim:'#2B3036'}, {x:39.5, y:16.7, col:'#30363D', trim:'#C9D1D8'}];
const VAC_R = .42;
let vacs = [], vacRaw = null;
function vacInit(now){
  if (vacRaw === RAW) return; vacRaw = RAW;   // re-snap docks whenever the building (and its walkable map) is rebuilt
  VAC_DOCKS.forEach((d, i) => {
    const dock = centre(nearestOpen(d)), v = vacs[i];
    if (v){ v.dock = dock; v.path = null; if (BLK[idxOf(v)]){ v.x = dock.x; v.y = dock.y; v.mode = 'charge'; } else if (v.mode !== 'charge') v.mode = 'home'; return; }
    vacs[i] = {x:dock.x, y:dock.y, dock, col:d.col, trim:d.trim, mode:'charge', bat:.55 + i*.25, until:now + 3000 + i*7000,
      path:null, to:null, ang:Math.PI*.75, v:0, wait:0, stuck:0, tries:0, pause:0, node:null, dockNode:null};
  });
}
function vacTarget(v){
  for (let k = 0; k < 40; k++){
    const near = Math.random() < .6, x = near ? v.x + (Math.random()-.5)*14 : 1 + Math.random()*(N-2), y = near ? v.y + (Math.random()-.5)*14 : 1 + Math.random()*(N-2);
    if (x < 1 || y < 1 || x > N-1 || y > N-1) continue;
    const i = idxOf({x, y}); if (BLK[i]) continue;
    const c = centre(i); if (Math.hypot(c.x-v.x, c.y-v.y) < 3) continue;
    if (Math.hypot(c.x-P.you.x, c.y-P.you.y) < 1.6) continue;   // leave your chair alone
    return c;
  }
  return {x:v.dock.x, y:v.dock.y};
}
function vacOthers(v){ return Object.values(agents).concat([you], vacs.filter(o => o !== v)); }
function vacStep(v, now, dt){
  if (reduced){ v.x = v.dock.x; v.y = v.dock.y; v.mode = 'charge'; v.path = null; v.v = 0; return; }
  if (v.mode === 'charge'){
    v.bat = Math.min(1, v.bat + dt*speed*.045);
    if (v.bat >= 1 && now > v.until){ v.mode = 'clean'; v.path = null; v.pause = 0; }
    return;
  }
  v.bat = Math.max(0, v.bat - dt*speed*.011);
  if (v.mode === 'clean' && v.bat < .2){ v.mode = 'home'; v.path = null; }
  // Someone walked right up to it? Back off a little so nobody ever stands on a vacuum.
  for (const o of vacOthers(v)){ const dx = v.x-o.x, dy = v.y-o.y, d = Math.hypot(dx, dy), R = o.dock ? 2*VAC_R : .55;
    if (d < R && d > 1e-3) tryMove(v, v.x + dx/d*(R-d)*.5, v.y + dy/d*(R-d)*.5); }
  if (v.pause && now < v.pause) return;
  if (!v.path || !v.path.length){
    if (v.mode === 'home' && Math.hypot(v.x-v.dock.x, v.y-v.dock.y) < .2){
      v.x = v.dock.x; v.y = v.dock.y; v.mode = 'charge'; v.v = 0; v.until = now + (9000 + Math.random()*14000)/speed; return; }
    v.to = v.mode === 'home' ? {x:v.dock.x, y:v.dock.y} : vacTarget(v);
    v.path = route({x:v.x, y:v.y}, v.to); v.stuck = 0; v.tries = 0; v.wait = 0;
    return;
  }
  const p = v.path[0], dx0 = p.x-v.x, dy0 = p.y-v.y, d0 = Math.hypot(dx0, dy0) || 1, hx = dx0/d0, hy = dy0/d0;
  // Give way: anyone just ahead means stop and wait; if they stay put, pick another way (or another spot to clean).
  const blocked = vacOthers(v).some(o => { const rx = o.x-v.x, ry = o.y-v.y, d = Math.hypot(rx, ry); return d < (o.dock ? 1.1 : .95) && rx*hx + ry*hy > .1; });
  if (blocked){ v.v = 0; v.wait += dt*speed;
    if (v.wait > 1.4){ v.wait = 0; v.to = v.mode === 'home' ? {x:v.dock.x, y:v.dock.y} : vacTarget(v); v.path = route({x:v.x, y:v.y}, v.to); }
    return; }
  v.wait = 0;
  // Turn toward the next corner first (a little pivot on the spot), then roll.
  const want = Math.atan2(hy, hx); let da = want - v.ang; while (da > Math.PI) da -= 2*Math.PI; while (da < -Math.PI) da += 2*Math.PI;
  const turn = 5*speed*dt; v.ang += Math.max(-turn, Math.min(turn, da));
  if (Math.abs(da) > .9){ v.v = 0; return; }
  let remain = 0, q = {x:v.x, y:v.y}; for (const w of v.path){ remain += Math.hypot(w.x-q.x, w.y-q.y); q = w; }
  const vmax = 1.15*speed, vt = vmax*Math.min(1, .35 + remain/.8);
  v.v = Math.min(vt, v.v + 3*speed*dt);
  let left = v.v*dt; const x0 = v.x, y0 = v.y;
  while (left > 0 && v.path && v.path.length){
    const w = v.path[0], dx = w.x-v.x, dy = w.y-v.y, d = Math.hypot(dx, dy);
    if (d <= left){ if (!tryMove(v, w.x, w.y)) break; v.path.shift(); left -= d; if (v.path.length) break; }   // stop at each corner to turn
    else { if (!tryMove(v, v.x + dx/d*left, v.y + dy/d*left)) break; left = 0; }
  }
  if (Math.hypot(v.x-x0, v.y-y0) < v.v*dt*.25){ v.stuck += dt; if (v.stuck > 1){ v.stuck = 0; v.tries++; v.v = 0;
    if (v.tries > 3){ v.path = null; } else v.path = route({x:v.x, y:v.y}, v.to); } } else v.stuck = 0;
  if (!v.path || !v.path.length){ v.path = null; v.v = 0; if (v.mode === 'clean') v.pause = now + (600 + Math.random()*1400)/speed; }
}
function vacSvg(col, trim){
  return '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">' +
    '<ellipse cx="20" cy="36.4" rx="11.6" ry="5.4" fill="rgba(0,0,0,.22)"/>' +
    '<path d="M10 32v3a10 5 0 0 0 20 0v-3z" fill="' + shade(col, .62) + '"/>' +
    '<ellipse cx="20" cy="32" rx="10" ry="5" fill="' + col + '" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>' +
    '<ellipse cx="20" cy="31.8" rx="6.6" ry="3.3" fill="none" stroke="' + trim + '" stroke-opacity=".35" stroke-width=".8"/>' +
    '<path d="M17.4 31.4v-1a2.6 1.3 0 0 1 5.2 0v1a2.6 1.3 0 0 1-5.2 0z" fill="' + trim + '"/>' +
    '<ellipse cx="20" cy="30.4" rx="2.6" ry="1.3" fill="' + shade(trim, 1.25) + '"/>' +
    '<circle class="led" r="1.3"/></svg>';
}
function vacDockSvg(){
  return '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">' +
    '<path d="M7 33.5L20 27l13 6.5L20 40z" fill="rgba(40,46,52,.38)"/>' +
    '<path d="M14 29l6-3 6 3v-6l-6-3-6 3z" fill="#2E343B"/><path d="M20 26l6-3v6l-6 3z" fill="#23282E"/>' +
    '<path d="M14 23l6-3 6 3-6 3z" fill="#4A535C"/><circle class="dled" cx="17" cy="26.6" r="1"/></svg>';
}
function vacNode(cls, html, z){
  const spot = document.createElement('div'); spot.className = 'spot ' + cls; spot.innerHTML = html; spot.style.pointerEvents = 'none';
  sprEl.prepend(spot); return {spot};
}
function vacDraw(v, now, propsOn){
  if (!v.dockNode || !v.dockNode.spot.isConnected) v.dockNode = vacNode('vdock', vacDockSvg());
  if (!v.node || !v.node.spot.isConnected){ v.node = vacNode('vac', vacSvg(v.col, v.trim)); v.led = v.node.spot.querySelector('.led'); }
  placeSprite(v.dockNode, v.dock.x, v.dock.y, .2, 0); v.dockNode.spot.style.zIndex = Math.round(1000 + (v.dock.y - v.dock.x)*10) - 2;
  occlude(v.dockNode, v.dock.x, v.dock.y, .2, 0, propsOn);
  placeSprite(v.node, v.x, v.y, .2, 0); occlude(v.node, v.x, v.y, .2, 0, propsOn);
  v.dockNode.spot.classList.toggle('on', v.mode === 'charge');
  const c = Math.cos(v.ang), s = Math.sin(v.ang), lx = 20 + .70711*(c + s)*6.6, ly = 32 + .35355*(s - c)*6.6;
  if (v.mode === 'charge'){ v.led.setAttribute('cx', 20); v.led.setAttribute('cy', 32); }
  else { v.led.setAttribute('cx', lx.toFixed(1)); v.led.setAttribute('cy', ly.toFixed(1)); }
  if (v.node.spot.dataset.m !== v.mode) v.node.spot.dataset.m = v.mode;
  v.node.spot.classList.toggle('rolling', !!v.path && v.v > .05);
}

