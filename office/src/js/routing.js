/* ---------------- collision & pathing ----------------
   What you see is what blocks. Every wall, glass partition, desk, counter, table, planter and shelf that buildWorld
   draws below head height registers its footprint here, so the walkable map always matches the building on screen.
   People are round bodies (radius NAV_R): the map is grown by that radius for planning, so paths keep a shoulder's
   width from walls and only pass through real door gaps. Movement re-checks the true footprints every step, so
   nobody can be pushed, slid or routed into a wall or a piece of furniture. */
const GR = 4, GN = N*GR, NAV_R = .25;
let RAW = new Uint8Array(GN*GN).fill(1);      // 1 = something solid stands here (or it's outside the building)
let BLK = new Uint8Array(GN*GN).fill(1);      // RAW grown by a body's radius: where a person's centre may not go
let COL = {walk:[], solid:[]};
function resetColliders(){ COL = {walk:[], solid:[]}; OCCL = []; }
function bakeColliders(){
  const raw = new Uint8Array(GN*GN).fill(1);
  const cells = (r, fn) => { // every cell the rectangle overlaps (touching edges don't count)
    const a = Math.max(0, Math.floor(r[0]*GR + 1e-6)), b = Math.min(GN-1, Math.ceil(r[2]*GR - 1e-6) - 1);
    const c = Math.max(0, Math.floor(r[1]*GR + 1e-6)), d = Math.min(GN-1, Math.ceil(r[3]*GR - 1e-6) - 1);
    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) fn(gy*GN + gx);
  };
  for (const r of COL.walk){ // floor: a cell is floor when its centre is on it
    const a = Math.max(0, Math.ceil(r[0]*GR - .5)), b = Math.min(GN-1, Math.floor(r[2]*GR - .5));
    const c = Math.max(0, Math.ceil(r[1]*GR - .5)), d = Math.min(GN-1, Math.floor(r[3]*GR - .5));
    for (let gy = c; gy <= d; gy++) for (let gx = a; gx <= b; gx++) raw[gy*GN + gx] = 0;
  }
  for (const r of COL.solid) cells(r, i => { raw[i] = 1; });
  const blk = new Uint8Array(GN*GN), rc = Math.ceil(NAV_R*GR - 1e-6);
  for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++){
    if (!raw[gy*GN + gx]) continue;
    for (let dy = -rc; dy <= rc; dy++) for (let dx = -rc; dx <= rc; dx++){
      const x = gx+dx, y = gy+dy; if (x >= 0 && y >= 0 && x < GN && y < GN) blk[y*GN + x] = 1; }
  }
  RAW = raw; BLK = blk;
}
const D8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function cellOf(p){ return [Math.max(0, Math.min(GN-1, Math.floor(p.x*GR))), Math.max(0, Math.min(GN-1, Math.floor(p.y*GR)))]; }
function idxOf(p){ const c = cellOf(p); return c[1]*GN + c[0]; }
function solidAt(x, y){ return x < 0 || y < 0 || x >= N || y >= N || RAW[idxOf({x, y})] === 1; }
function centre(i){ return {x:(i % GN + .5)/GR, y:(((i / GN) | 0) + .5)/GR}; }
function lineOk(a, b, grid){
  const d = Math.hypot(b.x-a.x, b.y-a.y), n = Math.max(1, Math.ceil(d/0.08));
  for (let i = 1; i <= n; i++){ const t = i/n; if (grid[idxOf({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t})]) return false; }
  return true;
}
function clear(a, b){ return lineOk(a, b, BLK); }
// Nearest cell a body can stand in, searched outward only through open floor, so it never lands on the far side of a wall.
function nearestOpen(p){
  const s = idxOf(p); if (!BLK[s]) return s;
  const through = !RAW[s], seen = new Uint8Array(GN*GN), q = [s]; seen[s] = 1;
  for (let h = 0; h < q.length && h < 6000; h++){
    const i = q[h], x = i % GN, y = (i / GN) | 0;
    for (const [dx, dy] of D8){ const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue;
      const j = ny*GN + nx; if (seen[j]) continue; seen[j] = 1;
      if (through && RAW[j]) continue; if (!BLK[j]) return j; q.push(j); }
  }
  return s;
}
function route(a, b){
  const bFree = !BLK[idxOf(b)], aFree = !BLK[idxOf(a)];
  if (aFree && bFree && clear(a, b)) return [{x:b.x, y:b.y}];
  const S = nearestOpen(a), G = nearestOpen(b);
  const gs = new Float32Array(GN*GN).fill(1e9), from = new Int32Array(GN*GN).fill(-1), done = new Uint8Array(GN*GN);
  const heap = [[0, S]]; gs[S] = 0;
  const push = (f, i) => { heap.push([f, i]); let k = heap.length-1; while (k > 0){ const p = (k-1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length){ heap[0] = last; let k = 0; for (;;){ const l = 2*k+1, r = l+1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const hx = G % GN, hy = (G / GN) | 0, H = (x, y) => { const ddx = Math.abs(x-hx), ddy = Math.abs(y-hy); return Math.max(ddx,ddy) + .4142*Math.min(ddx,ddy); };
  let best = S, bestH = H(S % GN, (S / GN) | 0);
  while (heap.length){
    const [, i] = pop(); if (done[i]) continue; done[i] = 1; if (i === G){ best = G; break; }
    const x = i % GN, y = (i / GN) | 0, h = H(x, y); if (h < bestH){ bestH = h; best = i; }
    for (const [dx, dy] of D8){
      const nx = x+dx, ny = y+dy; if (nx < 0 || ny < 0 || nx >= GN || ny >= GN) continue;
      const j = ny*GN + nx; if (BLK[j] || done[j]) continue;
      if (dx && dy && (BLK[y*GN+nx] || BLK[ny*GN+x])) continue;   // never cut a corner
      const ng = gs[i] + (dx && dy ? 1.4142 : 1);
      if (ng < gs[j]){ gs[j] = ng; from[j] = i; push(ng + H(nx, ny), j); }
    }
  }
  // Can't reach it (a room with no way in)? Walk to the closest reachable spot instead. Never through a wall.
  const pts = []; for (let i = best; i >= 0; i = from[i]){ pts.push(centre(i)); if (i === S) break; }
  pts.reverse();
  if (best === G && bFree) pts.push({x:b.x, y:b.y});
  const out = []; let cur = a, k = 0;
  if (!aFree){ out.push(pts[0]); cur = pts[0]; k = 1; }                // step out from a chair or a tight spot first
  while (k < pts.length){ let far = k; for (let j = pts.length-1; j > k; j--){ if (clear(cur, pts[j])){ far = j; break; } } out.push(pts[far]); cur = pts[far]; k = far + 1; }
  // Final approach to a spot that's snug against furniture (a chair at a desk, a counter): allowed if nothing solid is in the way.
  if (best === G && !bFree && !RAW[idxOf(b)] && Math.hypot(b.x-cur.x, b.y-cur.y) < 1.1 && lineOk(cur, b, RAW)) out.push({x:b.x, y:b.y});
  if (!out.length) out.push(cur === a ? centre(S) : cur);
  return out;
}
// Move only into open floor; when blocked, slide along the wall instead of stopping dead.
function tryMove(a, nx, ny){
  if (solidAt(a.x, a.y)){ a.x = nx; a.y = ny; return true; }   // already overlapping something (old data): let them step out
  if (!solidAt(nx, ny)){ a.x = nx; a.y = ny; return true; }
  if (!solidAt(nx, a.y)){ a.x = nx; return true; }
  if (!solidAt(a.x, ny)){ a.y = ny; return true; }
  return false;
}
// Personal space: people step aside for each other, keep right when meeting head-on, and never overlap.
function settle(a, dt){
  if (a.sitting) return;
  let px = 0, py = 0;
  const head = a.path && a.path.length ? (() => { const p = a.path[0], dx = p.x-a.x, dy = p.y-a.y, d = Math.hypot(dx,dy) || 1; return {x:dx/d, y:dy/d}; })() : null;
  for (const o of Object.values(agents).concat([you])){
    if (o === a) continue;
    const dx = a.x-o.x, dy = a.y-o.y, d = Math.hypot(dx, dy), R = .62;
    if (d < R){ const k = (R-d)/R; if (d < 1e-3){ const ang = Math.random()*6.283; px += Math.cos(ang); py += Math.sin(ang); } else { px += dx/d*k*1.4; py += dy/d*k*1.4; } }
    if (head && o.path && o.path.length && d < 1.6){
      const q = o.path[0], ox = q.x-o.x, oy = q.y-o.y, od = Math.hypot(ox,oy) || 1;
      const facing = (head.x*ox + head.y*oy)/od, ahead = -(head.x*dx + head.y*dy);
      if (facing < -.4 && ahead > 0){ const side = Math.abs(head.x*dy - head.y*dx); if (side < .7){ px += head.y*.9; py += -head.x*.9; } }
    }
  }
  for (const v of vacs){ const dx = a.x-v.x, dy = a.y-v.y, d = Math.hypot(dx, dy), R = .6;   // step around a robot vacuum too
    if (d < R && d > 1e-3){ const k = (R-d)/R; px += dx/d*k*.8; py += dy/d*k*.8; } }
  if (px || py){ const s = 1.5*speed*dt; tryMove(a, a.x + px*s, a.y + py*s); }
}

