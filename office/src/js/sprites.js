/* ---------------- characters ---------------- */
const EMO = {
  '☕':'<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/>',
  '🎵':'<path d="M9 18V5l11-2v13"/><rect x="3" y="15" width="6" height="6"/><rect x="14" y="13" width="6" height="6"/>',
  '🌱':'<path d="M12 21v-9"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
  '🙆':'<circle cx="12" cy="4.5" r="2"/><path d="M5 3l7 6 7-6"/><path d="M12 9v6l-3 6M12 15l3 6"/>',
  '👋':'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V4a1.5 1.5 0 0 1 3 0v7"/><path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.6-1.5L8 15"/>'
};
const EMO_TEXT = {'☕':'Coffee', '🎵':'In the lounge', '🌱':'Watering a plant', '🙆':'Stretching', '👋':'Saying hi'};
function lookOf(id){ if (LOOK[id]) return LOOK[id]; let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; return [HAIRS[Math.abs(h) % HAIRS.length], '']; }
function makeSprite(label, col, hair, acc, onClick){
  const spot = document.createElement('div'); spot.className = 'spot';
  const bb = document.createElement('button'); bb.type = 'button'; bb.className = 'bb'; bb.setAttribute('aria-label', label);
  const av = document.createElement('div'); av.className = 'av'; av.style.setProperty('--c', col); av.style.setProperty('--hair', hair);
  if (acc){ const a = document.createElement('div'); a.className = 'acc ' + acc; av.append(a); }
  for (const c of ['head', 'body', 'carry']){ const d = document.createElement('div'); d.className = c; av.append(d); }
  bb.append(av); spot.append(bb); bb.addEventListener('click', onClick);
  const ring = document.createElement('i'); ring.className = 'flat ring2'; ring.style.cssText = 'width:' + (1.4*U) + 'px;height:' + (1.4*U) + 'px;display:none';
  const trail = document.createElement('i'); trail.className = 'flat'; trail.style.cssText = 'height:0;border-top:3px dashed var(--sel);transform-origin:0 0;display:none';
  sprEl.append(trail, ring, spot);
  return {spot, av, ring, trail};
}
function nodeFor(a){
  let n = agentNodes[a.id]; if (n) return n;
  const look = lookOf(a.id);
  n = agentNodes[a.id] = makeSprite(a.name + (a.job && a.job !== a.name ? ', ' + a.job : ''), a.col, look[0], look[1], () => showAgentCard(a.id));
  return n;
}
function setT(el, v){ if (el._t !== v){ el._t = v; el.style.transform = v; } }
function placeSprite(n, x, y, z, hop){ const p = proj(x, y, z + hop*.35); setT(n.spot, 'translate(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px)'); n.spot.style.zIndex = Math.round(1000 + (y - x) * 10); }
// a floor-plane shape (ring, trail) mapped onto the isometric floor with one 2D matrix
// In the people layer's own (camera-free) space; the layer itself carries the camera.
function floorMatrix(x, y, z, rot){ const p = proj(x, y, z); return 'matrix(0.70711,-0.35355,0.70711,0.35355,' + p[0].toFixed(2) + ',' + p[1].toFixed(2) + ')' + (rot ? ' rotate(' + rot.toFixed(1) + 'deg)' : ''); }

/* ---------------- labels: one flat top layer, nudged so nothing overlaps ---------------- */
const LAB = {}; let frameNo = 0;
function labEl(key, make){ let e = LAB[key]; if (!e){ e = make(); e.classList.add('lab'); ovlEl.append(e); LAB[key] = e; } e._f = frameNo; if (e.hidden) e.hidden = false; return e; }
function mkTag(id){ const b = document.createElement('button'); b.type = 'button'; b.className = 'tag2'; b.append(document.createElement('i'), document.createElement('span')); b.addEventListener('click', () => id === 'you' ? openDrawer('desk') : showAgentCard(id)); return b; }
function mkBubble(){ const d = document.createElement('div'); d.className = 'bubble2';
  d.innerHTML = '<div class="bt"></div><div class="bw"></div><div class="bar" hidden><i></i></div><span class="tail"></span><span class="pop" aria-hidden="true">!</span>'; return d; }
function mkEmote(){ const s = document.createElement('span'); s.className = 'emote2'; s.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" aria-hidden="true"></svg>'; return s; }
function mkCount(){ const s = document.createElement('span'); s.className = 'count2'; return s; }

