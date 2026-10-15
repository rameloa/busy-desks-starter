/* ---------------- who is in front of whom ----------------
   People are drawn on a flat layer above the building, so on their own they'd always sit on top of it.
   Like a 2D game with a 3D-looking world, each person is cut away wherever something nearer the camera
   (a wall, a counter, a shelf, the mezzanine above) covers them. Glass and chairs never hide anyone.
   Outlines are worked out once when the office is built, in camera-free coordinates, so zooming and
   panning cost nothing; a person's cut-out is only redone when they move. */
let OCCL = [];
function hull(pts){
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]), lo = [], up = [];
  for (const p of pts){ while (lo.length > 1 && cr(lo[lo.length-2], lo[lo.length-1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length-1; i >= 0; i--){ const p = pts[i]; while (up.length > 1 && cr(up[up.length-2], up[up.length-1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function addOccluder(x, y, w, d, h, z, prop, el){
  const pts = [];
  for (const X of [x, x + w]) for (const Y of [y, y + d]) for (const Z of [z, z + h]) pts.push(proj(X, Y, Z));
  const hl = hull(pts), xs = hl.map(q => q[0]), ys = hl.map(q => q[1]);
  OCCL.push({x0:x, y0:y, x1:x + w, y1:y + d, z0:z, z1:z + h, prop, el, cut:false, hull:hl, bb:[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]});
}
// Is box o nearer the camera than a person standing at (x, y) on floor height z?  The camera looks from -x, +y and above.
function inFront(o, x, y, z){
  if (o.z1 <= z + .12) return false;                       // floors, rugs, the step they're on
  const pd = y - x, e = 1e-3;
  const fy = o.y0 >= y - e, fx = o.x1 <= x + e, by = o.y1 <= y + e, bx = o.x0 >= x - e;
  if (fy && bx) return o.y0 - o.x0 > pd;                   // off to the lower right: compare its nearest corner
  if (fx && by) return o.y1 - o.x1 > pd;                   // off to the lower left
  if (fy || fx) return true;
  if (by || bx) return false;
  return o.z0 >= z + .3;                                   // overhead (the mezzanine, a shelf above them)
}
/* Cutaway: when you zoom into a room, walls and tall things standing between you and that room fade
   right down (the way building games lower the walls), and stop hiding the people inside it. */
let cutFor = null, cutList = null, cutVer = 0, focusBB = null;
function applyCutaway(){
  const key = focusKey && focusBB ? focusKey : null; if (key === cutFor && cutList === OCCL) return; cutFor = key; cutList = OCCL; cutVer++;
  for (const o of OCCL){ if (o.cut){ o.cut = false; o.el && o.el.classList.remove('cut'); } }
  if (!key || key === 'desk') return;
  const [x0, y0, x1, y1] = focusBB, pts = [];
  for (let y = y0 + .4; y <= y1 - .2; y += .8) for (let x = x0 + .4; x <= x1 - .2; x += .8) pts.push([x, y, proj(x, y, .2)]);
  for (const o of OCCL){
    if (o.z1 < 1.2 || (o.x0 >= x0 && o.x1 <= x1 && o.y0 >= y0 && o.y1 <= y1)) continue;   // low furniture, or part of the room itself
    for (const [x, y, f] of pts){
      if (o.bb[2] < f[0] - 18 || o.bb[0] > f[0] + 18 || o.bb[3] < f[1] - 52 || o.bb[1] > f[1] + 8) continue;
      if (inFront(o, x, y, .2)){ o.cut = true; o.el && o.el.classList.add('cut'); break; }
    }
  }
}
function occlude(n, x, y, z, hop, propsOn){
  const key = x.toFixed(2) + ',' + y.toFixed(2) + ',' + (hop || 0).toFixed(2) + (propsOn ? 'p' : '') + cutVer;
  if (n._occ === key) return; n._occ = key;
  const f = proj(x, y, z + (hop || 0)*.35);
  const L = f[0] - 18, R = f[0] + 18, T = f[1] - 52, B = f[1] + 8;   // the person, with a little room to spare
  const polys = [];
  for (const o of OCCL){
    if (o.bb[2] < L || o.bb[0] > R || o.bb[3] < T || o.bb[1] > B) continue;
    if (o.cut || (o.prop && !propsOn)) continue;
    if (!inFront(o, x, y, z)) continue;
    const ring = o.hull.map(q => [q[0] - f[0] + 20, q[1] - f[1] + 40]); ring.push(ring[0]);
    polys.push([ring]);
  }
  let clip = '';
  if (polys.length){
    let rings = [];
    try { rings = (window.polygonClipping && polys.length > 1 ? polygonClipping.union(...polys) : polys).flat(); } catch (err) { rings = polys.flat(); }
    // evenodd: the big square is visible, the covered shapes are cut out, holes inside them show through again
    clip = 'path(evenodd,"M-600 -600H640V640H-600Z' + rings.map(r => 'M' + r.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z').join('') + '")';
  }
  if (n._clip !== clip){ n._clip = clip; n.spot.style.clipPath = clip; n.spot.style.webkitClipPath = clip; }
}

