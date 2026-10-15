/* ---------------- building the office ----------------
   Every piece is a box: a top face plus the two faces you can see, each a plain element turned in 3D.
   Rooms come from the registry (name, colour, staffed or not); the furniture is fixed per room. */
let trayEls = {}, stackEls = {};
function zoneBySlot(s){ return ZONES.find(z => z.slot === s) || {label:'', color:'#8E979E', plan:true}; }
function buildWorld(){
  const frag = document.createDocumentFragment();
  const p = (n) => (Math.round(n * 10) / 10) + 'px';
  const sh = (col, k) => 'color-mix(in srgb, ' + col + ' ' + k + '%, #000)';
  const DIM = 'linear-gradient(rgba(14,20,38,.5),rgba(14,20,38,.5)),';
  let dim = false, noCol = false, noOcc = false;
  resetColliders();
  const face = (cls, style, txt, tst) => { const e = document.createElement('i'); e.className = cls; e.style.cssText = style; if (txt){ const s = document.createElement('span'); s.style.cssText = tst; s.textContent = txt; e.append(s); } return e; };
  const box = (x, y, w, d, h, z, top, front, left, cls, txt, tst, fx, ltxt, ltst) => {
    const X = x * U, Y = y * U, Wd = w * U, D = d * U, Hh = Math.max(1, h * U), Z = z * U, k = dim ? DIM : '';
    const b = document.createElement('div'); b.className = 'box' + (cls ? ' ' + cls : '') + (dim ? ' dimmed' : '');
    b.style.cssText = 'left:' + p(X) + ';top:' + p(Y) + ';width:' + p(Wd) + ';height:' + p(D) + ';transform:translateZ(' + p(Z) + ')';
    b.append(face('t', 'transform:translateZ(' + p(Hh) + ');background:' + k + top),
      face('f', 'top:' + p(D - Hh) + ';height:' + p(Hh) + ';background:' + k + front + (fx ? ';' + fx : ''), txt, tst),
      face('l', 'width:' + p(Hh) + ';background:' + k + left, ltxt, ltst));
    frag.append(b);
    // Anything standing on the floor below head height blocks people; anything opaque and tall enough can hide them.
    if (!noCol && z < .9 && z + h > .3) COL.solid.push([x, y, x + w, y + d]);
    if (!noOcc && h >= .04 && Math.max(w, d) >= .25 && !/\bpaper\b/.test(cls || '')) addOccluder(x, y, w, d, h, z, /\bprop\b/.test(cls || ''), b);
    return b;
  };
    const solid = (x, y, w, d, h, z, col, top, front, cls, left) =>
      box(x, y, w, d, h, z, top || col, front ? 'linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.1)),' + front : sh(col, 84), left || sh(col, 68), cls);
    // house palette
    const G = '#006039', GL = '#127A4E', GD = '#00402A';
    const WHITE = '#F5F3EE', BIRCH = '#E4C998', BRASS = '#C9A44C', CHAR = '#2F3236', BLUSH = '#EBB9B5', CONC = '#D6D6D2';
    const T = {
      concrete: 'var(--px),linear-gradient(0deg,rgba(0,0,0,.05) 0 2px,transparent 2px) 0 0/96px 96px,linear-gradient(90deg,rgba(0,0,0,.05) 0 2px,transparent 2px) 0 0/96px 96px,linear-gradient(135deg,rgba(255,255,255,.28),transparent 50%),' + CONC,
      paving: 'var(--px),linear-gradient(0deg,rgba(0,0,0,.1) 0 2px,transparent 2px) 0 0/24px 24px,linear-gradient(90deg,rgba(0,0,0,.1) 0 2px,transparent 2px) 0 0/48px 24px,#C9C3B6',
      birch: 'var(--px),linear-gradient(0deg,rgba(120,80,30,.16) 0 2px,transparent 2px) 0 0/100% 10px,linear-gradient(90deg,rgba(120,80,30,.1) 0 2px,transparent 2px) 0 0/40px 10px,' + BIRCH,
      deck: 'var(--px),linear-gradient(90deg,rgba(60,35,10,.25) 0 2px,transparent 2px) 0 0/12px 100%,#B98A57',
      terrazzo: 'radial-gradient(#9AA3AA 1.2px,transparent 1.8px) 0 0/7px 7px,radial-gradient(#E0A890 1.1px,transparent 1.7px) 3px 4px/9px 9px,radial-gradient(' + GL + ' 1px,transparent 1.6px) 5px 1px/11px 11px,#EEEAE2',
      darkconcrete: 'var(--px),linear-gradient(135deg,rgba(255,255,255,.08),transparent 55%),#45484D',
      turf: 'repeating-conic-gradient(#5DBA45 0 25%,#54AF3D 0 50%) 0 0/4px 4px',
      leaf: 'var(--px),#3E8E3A',
      palm: 'var(--px),#4FA24A',
      plantwall: 'radial-gradient(circle at 30% 30%,#6DBA5E 0 4px,transparent 4.6px) 0 0/12px 12px,radial-gradient(circle at 70% 70%,#3E8E3A 0 4px,transparent 4.6px) 0 0/12px 12px,' + GD,
      glass: 'rgba(200,232,246,.32)',
      shelf: 'linear-gradient(' + BIRCH + ' 0 12%,transparent 12% 48%,' + BIRCH + ' 48% 56%,transparent 56% 90%,' + BIRCH + ' 90%),repeating-linear-gradient(90deg,#C0563C 0 4px,#3E7FC1 4px 7px,#E2B23B 7px 11px,#4C9A5B 11px 14px,#8A5BD6 14px 17px)',
      mon: 'linear-gradient(var(--screen),var(--screen)) 2px 2px/calc(100% - 4px) calc(100% - 4px) no-repeat,#22272E',
      charts: 'repeating-linear-gradient(90deg,#3FD17A 0 3px,transparent 3px 6px,#E5484D 6px 9px,transparent 9px 12px) 0 70%/100% 45% no-repeat,#0E1418',
      server: 'radial-gradient(#5BE39A 1.3px,transparent 1.9px) 0 0/6px 6px,radial-gradient(#FFB84D 1.2px,transparent 1.8px) 3px 3px/12px 12px,#1E2226',
      cubby: 'linear-gradient(90deg,' + BIRCH + ' 0 3px,transparent 3px) 0 0/16px 100%,linear-gradient(' + BIRCH + ' 0 3px,transparent 3px) 0 0/100% 34%,#3A2A1A',
      fridge: 'linear-gradient(90deg,' + G + ' 0 2px,transparent 2px) 0 0/100% 100%,repeating-linear-gradient(0deg,#CFDCE3 0 2px,transparent 2px 9px),repeating-linear-gradient(90deg,#F2A93B 0 4px,#E5484D 4px 8px,#4FB0E0 8px 12px,#7CC36A 12px 16px,#F4F1EA 16px 18px),#20272C',
      sticky: 'linear-gradient(90deg,#FFE27A 0 8px,transparent 8px 12px,#FF9FB2 12px 20px,transparent 20px 24px,#8FD3FF 24px 32px,transparent 32px 36px) 0 3px/36px 12px,' + WHITE,
      chart: 'linear-gradient(90deg,transparent 0 14%,#4C9A5B 14% 26%,transparent 26% 38%,#4C9A5B 38% 50%,transparent 50% 62%,#E2B23B 62% 74%,transparent 74%) 0 90%/100% 60% no-repeat,#FFFFFF',
      whiteboard: 'linear-gradient(170deg,transparent 0 40%,#3E7FC1 40% 43%,transparent 43%) 0 0/60% 50% no-repeat,linear-gradient(10deg,transparent 0 55%,#E5484D 55% 58%,transparent 58%) 100% 100%/55% 60% no-repeat,#FBFBF8',
      rug: 'var(--px),repeating-conic-gradient(#E9D6C0 0 25%,#E2CDB4 0 50%) 0 0/10px 10px',
      skylight: 'linear-gradient(90deg,transparent 0 31%,rgba(255,255,255,.0) 31% 34%,transparent 34% 64%,rgba(255,255,255,0) 64% 67%,transparent 67%),linear-gradient(rgba(255,252,228,.75),rgba(255,248,214,.55))',
      gift: 'linear-gradient(90deg,transparent 42%,#FFFFFF 42% 58%,transparent 58%),linear-gradient(transparent 42%,#FFFFFF 42% 58%,transparent 58%),',
      // desk screens: a spreadsheet, a bar dashboard, a line chart, and a screen that's switched off
      sheet: 'linear-gradient(#22985A,#22985A) 0 0/100% 3px no-repeat,repeating-linear-gradient(0deg,#C9DCCF 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,#C9DCCF 0 1px,transparent 1px 7px),#FFFFFF',
      bars: 'linear-gradient(90deg,transparent 0 10%,#2BB673 10% 22%,transparent 22% 34%,#2BB673 34% 46%,transparent 46% 58%,#F2C230 58% 70%,transparent 70% 82%,#E5484D 82% 94%,transparent 94%) 0 100%/100% 55% no-repeat,linear-gradient(90deg,transparent 0 34%,#2BB673 34% 46%,transparent 46%) 0 100%/100% 75% no-repeat,#16202A',
      line: 'linear-gradient(160deg,transparent 0 46%,#5BE39A 46% 52%,transparent 52%) 0 30%/50% 60% no-repeat,linear-gradient(20deg,transparent 0 46%,#5BE39A 46% 52%,transparent 52%) 100% 40%/50% 60% no-repeat,repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 1px,transparent 1px 5px),#101820',
      off: 'linear-gradient(135deg,rgba(255,255,255,.12),transparent 45%),#15191D',
      // Back Office screens: a run board (one dot per run, a red one failed), a terminal log, and a cost chart with its budget line
      runs: 'linear-gradient(#5BE39A,#5BE39A) 0 0/100% 3px no-repeat,radial-gradient(circle,#FF6B5E 0 1.6px,transparent 2px) 13px 9px/30px 40px,radial-gradient(circle,#5BE39A 0 1.6px,transparent 2px) 3px 4px/5px 5px,#0E1418',
      log: 'repeating-linear-gradient(0deg,transparent 0 2px,rgba(91,227,154,.75) 2px 3px) 2px 2px/55% calc(100% - 4px) no-repeat,repeating-linear-gradient(0deg,transparent 0 5px,rgba(242,194,48,.75) 5px 6px) 2px 4px/30% calc(100% - 6px) no-repeat,#0B0F12',
      costs: 'linear-gradient(#FF6B5E,#FF6B5E) 0 32%/100% 1px no-repeat,linear-gradient(90deg,transparent 0 8%,#5BE39A 8% 20%,transparent 20% 30%,#5BE39A 30% 42%,transparent 42% 52%,#F2C230 52% 64%,transparent 64% 74%,#5BE39A 74% 86%,transparent 86%) 0 100%/100% 60% no-repeat,linear-gradient(90deg,transparent 0 52%,#F2C230 52% 64%,transparent 64%) 0 100%/100% 75% no-repeat,#0E1418',
      // an inbox (rows with coloured labels), a month calendar, and three wall clocks
      inbox: 'linear-gradient(#2F64E0,#2F64E0) 0 0/100% 3px no-repeat,repeating-linear-gradient(0deg,transparent 0 3px,#DCE3EE 3px 4px) 0 4px/100% calc(100% - 4px) no-repeat,repeating-linear-gradient(0deg,#16A765 0 2px,transparent 2px 4px,#FFAD47 4px 6px,transparent 6px 8px,#4A86E8 8px 10px,transparent 10px 12px) 2px 5px/2px calc(100% - 6px) no-repeat,#FFFFFF',
      // (cal and clocks hang on a side wall: on a side face the picture is turned, its left edge at the floor)
      cal: 'linear-gradient(90deg,transparent 82%,#E5484D 82%),linear-gradient(#2F64E0,#2F64E0) 46% 30%/10% 12% no-repeat,linear-gradient(#16A765,#16A765) 24% 72%/10% 12% no-repeat,repeating-linear-gradient(0deg,#D5DCE6 0 1px,transparent 1px 14.28%) 0 0/82% 100% no-repeat,repeating-linear-gradient(90deg,#D5DCE6 0 1px,transparent 1px 20%) 0 0/82% 100% no-repeat,#FFFFFF',
      clocks: 'linear-gradient(#22272E,#22272E) 62% 16%/30% 1.5px no-repeat,linear-gradient(#22272E,#22272E) 58% 50%/22% 1.5px no-repeat,linear-gradient(90deg,#22272E,#22272E) 60% 84%/26% 1.5px no-repeat,radial-gradient(circle at 55% 16%,#FFFFFF 0 4px,#22272E 4.5px 5.5px,transparent 6px),radial-gradient(circle at 55% 50%,#FFFFFF 0 4px,#22272E 4.5px 5.5px,transparent 6px),radial-gradient(circle at 55% 84%,#FFFFFF 0 4px,#22272E 4.5px 5.5px,transparent 6px),#2B3039',
      // a video call: four tiles, one face each
      call: 'radial-gradient(circle at 50% 42%,#E9B98C 0 3px,transparent 3.5px) 0 0/50% 50% no-repeat,radial-gradient(circle at 50% 42%,#C98A5E 0 3px,transparent 3.5px) 100% 0/50% 50% no-repeat,radial-gradient(circle at 50% 42%,#D9A87C 0 3px,transparent 3.5px) 0 100%/50% 50% no-repeat,radial-gradient(circle at 50% 42%,#8A5A3C 0 3px,transparent 3.5px) 100% 100%/50% 50% no-repeat,linear-gradient(#3B5B8C,#3B5B8C) 0 0/50% 50% no-repeat,linear-gradient(#4C7A5E,#4C7A5E) 100% 0/50% 50% no-repeat,linear-gradient(#7A5A8C,#7A5A8C) 0 100%/50% 50% no-repeat,linear-gradient(#8C6A3B,#8C6A3B) 100% 100%/50% 50% no-repeat',
      bills: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(91,227,154,.35) 3px 4px) 4px 4px/45% calc(100% - 8px) no-repeat,repeating-linear-gradient(0deg,transparent 0 3px,rgba(242,194,48,.45) 3px 4px) 100% 4px/22% calc(100% - 8px) no-repeat,#0E1418'
    };
    const word = (px, col) => 'font:700 ' + px + 'px/1 \'Pixelify Sans\',\'Courier New\',monospace;letter-spacing:.14em;color:' + col + ';white-space:nowrap';
    // small pieces of furniture
    const palm = (x, y) => {
      solid(x - .35, y - .35, .7, .7, .6, .1, G, null, null, '', GD);
      solid(x - .06, y - .06, .12, .12, 1.1, .7, '#7A5A34', null, null, 'prop');
      solid(x - .8, y - .8, 1.6, 1.6, .25, 1.75, '#4FA24A', T.palm, T.palm, '', T.palm);
      solid(x - .45, y - .45, .9, .9, .35, 1.95, '#5DB352', T.palm, T.palm, '', T.palm);
    };
    const pot = (x, y, z) => {
      solid(x, y, .6, .6, .5, z, G, null, null, 'prop', GD);
      solid(x - .15, y - .15, .9, .9, .75, z + .5, '#3E8E3A', T.leaf, T.leaf, 'prop', T.leaf);
    };
    const planterBox = (x, y, w, d, z) => {
      solid(x, y, w, d, .5, z, G, null, null, '', GD);
      solid(x + .05, y + .05, w - .1, d - .1, .45, z + .5, '#3E8E3A', T.leaf, T.leaf, '', T.leaf);
    };
    const bench = (x, y, w, z, monitors, dark) => {
      solid(x, y, w, 1.2, .78, z, BIRCH, T.birch);
      for (let i = 0; i < monitors; i++) {
        const mx = x + .5 + i * (w - 1) / Math.max(1, monitors - 1 || 1);
        solid(mx - .45, y + .1, .9, .18, .6, z + .78, '#22272E', null, T.mon, 'prop');
        noCol = noOcc = true; // chairs: people sit in them and tuck them in
        solid(mx - .3, y + 1.35, .6, .6, .42, z, dark ? '#444A50' : '#5E666D');
        solid(mx - .3, y + 1.85, .6, .14, .9, z, dark ? '#444A50' : '#5E666D');
        noCol = noOcc = false;
      }
    };
    const roundTable = (x, y, z, top) => {
      solid(x + .45, y + .45, .2, .2, .7, z, BRASS);
      solid(x, y, 1.1, 1.1, .08, z + .7, top || WHITE);
    };
    const stool = (x, y, z) => { solid(x + .2, y + .2, .1, .1, .75, z, BRASS); solid(x, y, .5, .5, .14, z + .75, G, GL); };
    const tub = (x, y, z, col) => { solid(x, y, .8, .8, .45, z, col); solid(x, y, .8, .2, .75, z, col); solid(x, y, .2, .8, .75, z, col); };
    const glassRun = (x, y, w, d, h, z) => {
      noOcc = true; box(x, y, w, d, h, z, T.glass, T.glass, T.glass); noOcc = false;
      solid(x, y, w, d, .07, z + h, G);
    };
    const greenPost = (x, y, h, z) => solid(x - .05, y - .05, .1, .1, h, z, G);
    const signPanel = (x, y, w, txt, z) => box(x, y, w, .1, .55, z, G, G, GD, '', txt, word(12, '#F5F3EE') + ';letter-spacing:.1em');
    // a room: white walls, one accent wall in its tab colour, glass partitions to the corridor with a door gap
    const room = (x, y, w, d, o) => {
      const FH = o.FH || .2, H = o.H || 1.6, t = .2;
      solid(x, y, w, d, FH, 0, o.dark ? '#3A3D42' : '#D9D3C6', o.floor);
      if (o.turf) solid(o.turf[0], o.turf[1], o.turf[2], o.turf[3], .04, FH, '#5DBA45', T.turf);
      const acc = o.acc, accentY = o.accentOn !== 'x';
      const wallY = accentY ? acc : (o.dark ? CHAR : WHITE), wallX = accentY ? (o.dark ? CHAR : WHITE) : acc;
      if (!o.noBackY) box(x, y, w, t, H, FH, wallY, wallY, sh(wallY, 70));
      if (!o.noBackX){ const ry = o.rightFrom || y; box(x + w - t, ry, t, d - (ry - y), H, FH, wallX, sh(wallX, 84), o.texX || sh(wallX, 90)); }
      if (o.name && !o.noBackY) signPanel(x + .6, y + t, Math.min(w - 1.2, o.name.length * .55 + 1), o.name, FH + H - .75);
      if (o.allGlass || o.glass !== false) {
        const gh = 1.5, gap = o.door || 1.4;
        const mid = x + w / 2;
        glassRun(x, y + d - .08, mid - gap / 2 - x, .08, gh, FH); glassRun(mid + gap / 2, y + d - .08, x + w - (mid + gap / 2), .08, gh, FH);
        greenPost(mid - gap / 2, y + d - .04, gh, FH); greenPost(mid + gap / 2, y + d - .04, gh, FH);
        if (!o.openX) { glassRun(x, y, .08, d, gh, FH); greenPost(x + .04, y + .04, gh, FH); greenPost(x + .04, y + d - .04, gh, FH); }
      }
      return FH;
    };
    // a HIRING banner along the top of a planned room's glass front: above head height, so it never blocks a corridor
    const hiring = (x, y, label) => {
      const was = dim; dim = false;
      box(x - 1.5, y - .07, 3, .14, .75, 1.75, G, G, GD, '', label + '\nHIRING', word(8, '#F5F3EE') + ';white-space:pre-line;text-align:center;line-height:1.3;letter-spacing:.08em');
      dim = was;
    };
    const tree = (x, y) => {
      solid(x - .3, y - .3, .6, .6, 1.6, .15, '#7A5A34');
      solid(x - 1.1, y - 1.1, 2.2, 2.2, 1.6, 1.75, '#3E8E3A', T.leaf, T.leaf, '', 'linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),' + T.leaf);
      solid(x - .7, y - .7, 1.4, 1.4, .9, 3.35, '#4FA24A', T.palm, T.palm, '', 'linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),' + T.palm);
    };
    // who sits at a room's seat i (from the registry), or null
    const seatAgent = (slot, i) => { const q = seatPos(slot, i); const s = q && SEATS.find((s) => s.x === q.x && s.y === q.y); return s ? s.agent : null; };
    // a screen standing on a desk: bezel, picture, stand
    const screen = (x, y, w, h, z, tex) => {
      solid(x + w / 2 - .04, y + .1, .08, .08, .16, z, '#3A3F45', null, null, 'prop');
      box(x, y, w, .08, h, z + .14, '#22272E', tex, '#22272E', 'prop', '', '', 'box-shadow:inset 0 0 0 1.5px #22272E');
    };
    // an office chair, tucked in front of a desk (people sit in it, so it never blocks or hides anyone)
    const officeChair = (cx, y, z, lead) => {
      const col = lead ? '#5A2E1E' : '#3E4A55', top = lead ? 'linear-gradient(90deg,' + BRASS + ' 0 2px,transparent 2px),#6B3A26' : col;
      noCol = noOcc = true;
      solid(cx - .32, y + 1.33, .64, .64, .05, z, '#2B2F33');
      solid(cx - .05, y + 1.6, .1, .1, .3, z + .05, '#7A8288');
      solid(cx - .3, y + 1.35, .6, .6, .1, z + .34, col, top);
      solid(cx - .28, y + 1.86, .56, .12, lead ? 1.05 : .7, z + .44, col, top);
      if (lead) { solid(cx - .36, y + 1.42, .07, .48, .06, z + .62, col); solid(cx + .29, y + 1.42, .07, .48, .06, z + .62, col); }
      noCol = noOcc = false;
    };
    // a work desk for the person at seat x: dual screens, or for a lead an ultrawide, a laptop and a brass nameplate.
    // Screens are dark when nobody live sits there.
    const workDesk = (cx, y, z, kind, ag, tex) => {   // tex: the two pictures on a dual setup (default spreadsheet + dashboard)
      const exec = kind === 'exec', lead = kind === 'lead' || exec, w = exec ? 2.6 : lead ? 2.4 : 1.8, on = ag && ag.status === 'live', top = z + .78;
      if (exec) solid(cx - w / 2, y, w, 1.2, .78, z, '#7A5634', 'var(--px),linear-gradient(90deg,rgba(255,255,255,.08),transparent 60%),#7A5634', 'linear-gradient(' + BRASS + ' 0 2px,transparent 2px),#6B4A2E', '', '#5E3F27');
      else solid(cx - w / 2, y, w, 1.2, .78, z, BIRCH, T.birch);
      if (exec) {   // the Executive's extras: a desk phone and a tray for the morning brief
        solid(cx - 1.22, y + .15, .34, .28, .08, top, '#2B2F33', 'linear-gradient(#4AA8FF,#4AA8FF) 60% 30%/40% 25% no-repeat,#2B2F33', null, 'prop');
        solid(cx - 1.22, y + .5, .38, .3, .1, top, BRASS, 'linear-gradient(#FFFFFF,#FFFFFF) 50% 50%/70% 60% no-repeat,' + BRASS, null, 'prop');
      }
      if (lead) {
        screen(cx - .9, y + .05, 1.8, .62, top, on ? T.line : T.off);
        solid(cx + .55, y + .55, .5, .34, .03, top, '#9AA3AA', null, null, 'prop'); box(cx + .55, y + .5, .5, .05, .32, top, '#22272E', on ? T.sheet : T.off, '#22272E', 'prop');
        box(cx - 1.1, y + .85, .62, .1, .14, top, BRASS, '#3A2A10', '#8C6F2C', 'prop', (ag && (ag.nickname || ag.name) || '').toUpperCase(), word(5, '#F2C230') + ';letter-spacing:.1em');
        solid(cx + .8, y + .1, .3, .3, .25, top, G, null, null, 'prop', GD); solid(cx + .74, y + .04, .42, .42, .3, top + .25, '#3E8E3A', T.leaf, T.leaf, 'prop', T.leaf);
      } else {
        screen(cx - .76, y + .05, .74, .56, top, on ? (tex ? tex[0] : T.sheet) : T.off);
        screen(cx + .02, y + .05, .74, .56, top, on ? (tex ? tex[1] : T.bars) : T.off);
        solid(cx + .64, y + .72, .12, .12, .12, top, '#FFFFFF', null, null, 'prop');   // a mug
      }
      solid(cx - .3, y + .66, .6, .2, .03, top, '#3A3F45', 'repeating-linear-gradient(90deg,#5A6068 0 2px,#3A3F45 2px 4px)', null, 'prop');
      solid(cx + .38, y + .7, .08, .13, .03, top, '#3A3F45', null, null, 'prop');
      officeChair(cx, y, z, lead);
    };
    // A long desk along a room's wall with a setup and a chair at each seat. What sits on each desk depends on the room
    // (kit); the screens are on only where a live agent sits.
    const deskRow = (slot, x, y, w, z, dark, kit) => {
      if (dark) solid(x, y, w, 1.2, .78, z, '#2F3236', 'var(--px),#3A3F45'); else solid(x, y, w, 1.2, .78, z, BIRCH, T.birch);
      ROOMS[slot].seats.forEach((q, i) => { const ag = seatAgent(slot, i), on = !!(ag && ag.status === 'live');
        kit(q[0], y, z + .78, on, ag); officeChair(q[0], y, z, ag && ag.role === 'lead'); });
    };
    const panel = (x, y, w, h, z, tex) => box(x, y, w, .08, h, z, '#22272E', tex, '#22272E', 'prop', '', '', 'box-shadow:inset 0 0 0 1.5px #22272E');
    const laptop = (x, y, top, tex) => { solid(x, y + .3, .5, .34, .03, top, '#9AA3AA', null, null, 'prop'); panel(x, y + .25, .5, .32, top, tex); };
    const books = (x, y, top) => [['#C0563C', .06], ['#3E7FC1', .05], ['#E2B23B', .06]].forEach((b, i) => solid(x, y, .42, .3, b[1], top + i * .06, b[0], null, null, 'prop'));
    const deskLamp = (x, y, top) => { solid(x, y, .16, .16, .03, top, '#2B2F33', null, null, 'prop'); solid(x + .06, y + .06, .04, .04, .4, top, '#2B2F33', null, null, 'prop');
      solid(x - .04, y - .04, .24, .24, .1, top + .38, '#F2C230', 'radial-gradient(#FFF6D0,#F2C230)', null, 'prop'); };
    const bottle = (x, y, top, col) => solid(x, y, .1, .1, .22, top, col || '#4FB0E0', null, null, 'prop');
    const vase = (x, y, top) => { solid(x, y, .14, .14, .2, top, '#FFFFFF', null, null, 'prop'); solid(x - .08, y - .08, .3, .3, .16, top + .2, '#E5484D', 'radial-gradient(#F2C230 0 2px,#E5484D 2.5px 5px,#3E8E3A 5.5px)', null, 'prop'); };
    const floorLamp = (x, y) => {   // a standing lamp with a warm pool of light on the floor
      solid(x - .5, y - .5, 1.3, 1.3, .01, .2, '#F2D27A', 'radial-gradient(closest-side,rgba(255,226,140,.5),rgba(255,226,140,0))', null, 'prop');
      solid(x, y, .3, .3, .05, .2, '#2B2F33');
      noOcc = true; solid(x + .12, y + .12, .06, .06, 1.3, .25, BRASS);
      solid(x - .09, y - .09, .48, .48, .32, 1.45, '#F4E3B5', 'radial-gradient(circle,#FFF8DC 0 30%,#F2D27A 70%)', 'linear-gradient(#FBEFC8,#E9C877)', '', 'linear-gradient(#F4E3B5,#DDBB6A)'); noOcc = false;
    };


  const Z = (s) => zoneBySlot(s);
  const lit = (s) => { dim = !!Z(s).plan; return Z(s); };
  const named = (s) => Z(s).plan ? '' : Z(s).label;
  const hire = (s) => { const r = ROOMS[s]; if (Z(s).plan && r) hiring(r.x + r.w / 2, r.y + r.d - .04, Z(s).label); };

  // ---------- the slab: a thin plaza strip around one big building ----------
  box(0, 0, N, N, 2, -2, T.paving,
    'linear-gradient(#B9B2A4 0 5px,transparent 5px),var(--px),linear-gradient(#BDB6A8 0 40%,#9C978D 40%)',
    'linear-gradient(270deg,#AFA899 0 5px,transparent 5px),linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18)),var(--px),linear-gradient(270deg,#BDB6A8 0 40%,#9C978D 40%)');
  const B0 = .8, B1 = 43.2;
  COL.walk.push([B0, B0, B1, 34.2], [10, 34, B1, B1], [1.5, 34.2, 10.5, 42.6]);
  solid(B0, B0, B1 - B0, 34 - B0, .1, 0, CONC, T.concrete);
  solid(10, 34, B1 - 10, B1 - 34, .1, 0, CONC, T.concrete);
  const WH = .9;
  box(B0, B0, B1 - B0, .25, WH, .1, WHITE, WHITE, sh(WHITE, 72));
  box(B1 - .25, B0, .25, B1 - B0, WH, .1, WHITE, sh(WHITE, 84), sh(WHITE, 90));
  box(B0, B0 - .02, B1 - B0, .1, 2.6, WH + .1, T.glass, T.glass, T.glass);
  box(B1 - .2, B0, .1, B1 - B0, 2.6, WH + .1, T.glass, T.glass, T.glass);
  for (let gx = B0; gx <= B1; gx += 2.4) greenPost(gx, B0 + .05, 2.7, WH + .1);
  for (let gy = B0; gy <= B1; gy += 2.4) greenPost(B1 - .15, gy, 2.7, WH + .1);
  solid(B0, B0 - .02, B1 - B0, .12, .12, 3.6, G); solid(B1 - .2, B0, .12, B1 - B0, .12, 3.6, G);
  box(30, B0 + .25, 6, .14, 2.8, .1, GD, T.plantwall, GD);
  box(B1 - .4, 24, .14, 6, 2.8, .1, GD, GD, T.plantwall);
  [[B0, B0, .2, 34 - B0], [10, 34, .2, 1.6], [10, 38.4, .2, B1 - 38.4]].forEach((q) => { solid(q[0], q[1], q[2], q[3], .7, .1, WHITE); solid(q[0], q[1], q[2], q[3], .06, .8, G); });
  [[B0, 34, 10 - B0, .2], [10, B1 - .2, B1 - 10, .2]].forEach((q) => { solid(q[0], q[1], q[2], q[3], .7, .1, WHITE); solid(q[0], q[1], q[2], q[3], .06, .8, G); });
  glassRun(10, 35.6, .08, .7, 2.2, .1); glassRun(10, 37.7, .08, .7, 2.2, .1);
  [35.6, 36.3, 37.7, 38.4].forEach((gy) => greenPost(10.04, gy, 2.3, .1));

  // ---------- atrium: my desk, feature wall, bleacher stair, mezzanine ----------
  solid(16.5, 15.5, 11, 12, .14, .1, CONC, T.concrete);
  solid(18.6, 20.2, 6.6, 5.6, .02, .24, '#FFF6D8', T.skylight);
  box(27.2, 15.5, .35, 11.4, 4.4, .24, G, GD, 'linear-gradient(90deg,' + GD + ' 0 6px,transparent 6px),linear-gradient(270deg,' + BRASS + ' 0 3px,transparent 3px),' + G, '', '', '', '', 'MY DESK', word(22, '#F5F3EE') + ';transform:rotate(90deg);letter-spacing:.2em');
  [[16.6, 9], [26.6, 9], [16.6, 15.1], [26.6, 15.1]].forEach((q) => solid(q[0], q[1], .4, .4, 2.3, .1, WHITE));
  solid(16.5, 9, 10.5, 6.5, .3, 2.3, WHITE, T.birch, 'linear-gradient(' + G + ' 0 3px,transparent 3px),' + WHITE, '', 'linear-gradient(270deg,' + G + ' 0 3px,transparent 3px),' + WHITE);
  const MZ = 2.6;
  bench(17.2, 9.6, 6.4, MZ, 4, false);
  roundTable(24.6, 11.6, MZ); [[24, 11.8], [25.9, 12.4]].forEach((q) => tub(q[0], q[1], MZ, BLUSH));
  glassRun(16.5, 15.4, 1.5, .08, 1, MZ); glassRun(26, 15.4, 1, .08, 1, MZ); glassRun(16.5, 9, .08, 6.4, 1, MZ);
  planterBox(16.6, 13.6, .6, 1.6, MZ); planterBox(26.1, 14.6, .8, .7, MZ); planterBox(16.6, 9.6, .6, 1.6, MZ);
  [[15.5, 2.25], [16.2, 1.8], [16.9, 1.35], [17.6, .9], [18.3, .45]].forEach((s, i) => {
    box(18, s[0], 8, .7, s[1], .24, BIRCH, 'linear-gradient(' + G + ' 0 4px,transparent 4px),' + BIRCH, sh(BIRCH, 70));
    ['#E5484D', '#3E7FC1', '#F2C230', GL, '#E9B7B4'].forEach((c, j) => { if ((i + j) % 2 === 0) solid(18.3 + j * 1.55, s[0] + .12, 1.1, .45, .1, .24 + s[1], c, null, null, 'prop'); });
  });
  solid(19.4, 20.4, 5, 1.6, .9, .24, BIRCH, T.birch);
  trayEls = {
    act: solid(19.9, 20.7, .95, .85, .3, 1.14, '#C2410C', null, null, 'tray3d'),
    review: solid(21.4, 20.7, .95, .85, .3, 1.14, '#D38B07', null, null, 'tray3d'),
    fyi: solid(22.9, 20.7, .95, .85, .3, 1.14, '#1D63A8', null, null, 'tray3d')
  };
  solid(17.6, 25.5, 6.6, .9, .45, .24, G, GL);
  solid(17.6, 26.4, 6.6, .35, 1, .24, G, null, 'linear-gradient(' + BRASS + ' 0 2px,transparent 2px),' + G);
  planterBox(17.6, 26.8, 6.6, .45, .24);
  roundTable(18.6, 23.7, .24); roundTable(21.4, 23.7, .24);
  pot(25.6, 25.4, .24); pot(17, 16, .24);

  // ---------- slot 0: Executive, a glass corner office ----------
  { const z = lit(0); room(28, 8, 8, 8, { floor: T.birch, acc: z.color, name: named(0), texX: T.sticky });
    box(29, 8.22, 2.4, .1, .8, .45, '#22272E', '#2B3039', '#22272E', '', 'GOALS', word(10, '#F2C230'));
    // the lounge corner: rug, sofa, coffee table with cups and a magazine, a standing lamp
    solid(32.3, 9.7, 3.4, 2.2, .02, .2, '#E2CDB4', T.rug);
    solid(32.6, 9, 3, .9, .45, .2, BLUSH); solid(32.6, 8.7, 3, .3, 1, .2, BLUSH);
    solid(32.75, 9.15, .5, .35, .12, .65, '#F4F1EA', null, null, 'prop'); solid(34.75, 9.15, .5, .35, .12, .65, '#C9A44C', null, null, 'prop');   // cushions
    solid(33.4, 10.5, 1.4, .8, .35, .2, BIRCH, T.birch);
    solid(33.6, 10.65, .45, .55, .02, .55, '#E5484D', 'linear-gradient(#FFFFFF,#FFFFFF) 50% 20%/70% 18% no-repeat,#E5484D', null, 'prop');
    [[34.3, 10.7], [34.45, 11]].forEach((q) => solid(q[0], q[1], .12, .12, .12, .55, '#FFFFFF', 'radial-gradient(#6B4A2E 0 2px,#FFFFFF 2.5px)', null, 'prop'));
    solid(35.3, 10.3, .3, .3, .05, .2, '#2B2F33');
    noOcc = true; solid(35.42, 10.42, .06, .06, 1.3, .25, BRASS);
    solid(35.21, 10.21, .48, .48, .32, 1.45, '#F4E3B5', 'radial-gradient(circle,#FFF8DC 0 30%,#F2D27A 70%)', 'linear-gradient(#FBEFC8,#E9C877)', '', 'linear-gradient(#F4E3B5,#DDBB6A)'); noOcc = false;
    solid(34.8, 9.8, 1, 1.3, .01, .2, '#F2D27A', 'radial-gradient(closest-side,rgba(255,226,140,.5),rgba(255,226,140,0))', null, 'prop');
    // a bookshelf on the side wall, with a little trophy on top
    box(35.25, 11.4, .45, 2.2, 1.5, .2, BIRCH, sh(BIRCH, 80), T.shelf);
    solid(35.35, 12.3, .25, .25, .25, 1.7, '#F2C230', 'radial-gradient(#FFF0A8 0 2px,#F2C230 3px)', null, 'prop');
    // Iris's desk: walnut, ultrawide, laptop, desk phone, the brief tray, a nameplate and a leather chair.
    // Seats with nobody at them stay open floor: a small round table for one-on-ones sits there instead.
    ROOMS[0].seats.forEach((q, i) => { const ag = seatAgent(0, i); if (ag) workDesk(q[0], 12.6, .2, ag.role === 'executive' ? 'exec' : ag.role === 'lead' ? 'lead' : 'dual', ag); });
    if (!seatAgent(0, 1) && !seatAgent(0, 2)) { roundTable(32, 12.9, .2); tub(33.3, 13, .2, BLUSH); tub(32.15, 14.15, .2, GL);
      solid(32.25, 13.15, .3, .4, .02, .98, '#FFFFFF', 'repeating-linear-gradient(0deg,#FFFFFF 0 3px,#B9D3E8 3px 4px)', null, 'prop'); }
    pot(35, 14.6, .2); dim = false; hire(0); }

  // ---------- slot 3: Finance, plus the mail room (slot 9) ----------
  { const z = lit(3); room(4, 8, 10, 8, { floor: T.birch, acc: z.color, name: named(3) });
    // the wall: a bills-due board and the spending chart
    box(5, 8.22, 3.4, .1, .6, .35, '#0E1418', T.bills, '#0E1418', '', 'DUE THIS WEEK', word(6, '#5BE39A') + ';letter-spacing:.08em');
    box(9.6, 8.22, 2.2, .1, .7, .4, '#FFFFFF', T.chart, '#DDD');
    // one desk per seat: dual screens for the team, a wider desk with an ultrawide, a laptop and a nameplate for the lead
    ROOMS[3].seats.forEach((q, i) => { const ag = seatAgent(3, i); workDesk(q[0], 10, .2, ag && ag.role === 'lead' ? 'lead' : 'dual', ag); });
    [12.8, 14.1].forEach((fy) => box(12.9, fy, .8, 1, 1.2, .2, '#D9DDE0', 'repeating-linear-gradient(0deg,#D9DDE0 0 8px,#9AA3AA 8px 10px)', 'repeating-linear-gradient(90deg,#BFC6CC 0 8px,#8C959C 8px 10px)'));
    solid(13, 12.85, .6, .45, .3, 1.4, '#E9E6DF', 'linear-gradient(#3A3F45,#3A3F45) 50% 30%/70% 25% no-repeat,#E9E6DF', null, 'prop');   // printer on the cabinets
    [['#F2C230', 4.7, 13.4], [GL, 5.8, 14.3], ['#E5484D', 4.8, 14.7]].forEach((q) => solid(q[1], q[2], .9, .9, .42, .2, q[0], 'radial-gradient(circle at 40% 35%,rgba(255,255,255,.35) 0 3px,transparent 4px),' + q[0]));
    dim = false; hire(3); }
  room(4, 16, 5, 5, { floor: T.concrete, acc: Z(9).color, noBackY: true, rightFrom: 17 });
  box(8.1, 17.4, .7, 2.8, 1.9, .2, BIRCH, sh(BIRCH, 80), T.cubby);
  solid(4.8, 18.9, 2.4, 1, 1, .2, BIRCH, T.birch);
  solid(5.3, 16.8, 1.3, .8, .5, .3, '#9AA3AA');
  solid(5.4, 16.9, .5, .5, .4, .8, '#B98A4F', null, null, 'prop'); solid(6, 16.9, .45, .45, .3, .8, '#C9965E', null, null, 'prop');
  // letters waiting in the cubbies, IN and OUT trays and a parcel scale on the counter, parcels on the floor
  box(8.05, 17.45, .05, 2.7, 1.8, .25, 'transparent', 'transparent', 'linear-gradient(90deg,transparent 0 30%,#FFFFFF 30% 42%,transparent 42%) 0 0/16px 34%,linear-gradient(90deg,transparent 0 55%,#F6E3E8 55% 66%,transparent 66%) 0 0/24px 34%', 'prop');
  [[4.95, 'IN'], [5.65, 'OUT']].forEach((q) => box(q[0], 19.05, .6, .45, .14, 1.2, '#C9A44C', 'linear-gradient(#FFFFFF,#FFFFFF) 50% 30%/70% 50% no-repeat,#C9A44C', '#8C6F2C', 'prop', q[1], word(4, '#2B1D0E')));
  solid(6.5, 19.1, .5, .45, .08, 1.2, '#9AA3AA', 'linear-gradient(#5BE39A,#5BE39A) 50% 80%/40% 20% no-repeat,#C9D1D8', null, 'prop'); solid(6.55, 19.15, .35, .3, .2, 1.28, '#C9965E', null, null, 'prop');
  [[4.3, 20.1, .55], [4.4, 20.15, .4]].forEach((q, i) => solid(q[0], q[1], q[2], q[2] * .8, .35, .2 + i * .35, '#C9965E', 'linear-gradient(90deg,transparent 42%,#E9D8A6 42% 58%,transparent 58%),#C9965E'));

  // ---------- slot 5: Operations ----------
  { const z = lit(5); room(28, 28, 8, 8, { floor: T.birch, acc: z.color, name: named(5), turf: [28.6, 30, 6.6, 1.7] });
    // the sorting bins for mail (Ollie tosses letters into them), with label strips
    [['#16A765', 29.2, 'KEEP'], ['#4A86E8', 31, 'NEEDS YOU'], ['#FFAD47', 32.8, 'LATER']].forEach((q) => box(q[1], 28.5, 1.5, 1.1, .9, .2, 'linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,.28)) 50% 50%/80% 70% no-repeat,' + q[0], 'linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.1)),' + q[0], sh(q[0], 68), '', q[2], word(6, '#FFFFFF') + ';letter-spacing:.06em'));
    [[29.5, 28.75], [31.3, 28.8], [33.2, 28.7]].forEach((q) => solid(q[0], q[1], .5, .35, .08, 1.1, '#FFFFFF', 'linear-gradient(135deg,transparent 45%,#D5DCE6 45% 55%,transparent 55%),linear-gradient(45deg,transparent 45%,#D5DCE6 45% 55%,transparent 55%),#FFFFFF', null, 'prop'));
    // the side wall: a month calendar and clocks for home, London and Tokyo (trips and appointments live here)
    box(35.62, 29.2, .08, 2, 1, .45, '#FFFFFF', '#FFFFFF', T.cal);
    box(35.62, 31.6, .08, 2.4, .42, 1.05, '#2B3039', '#2B3039', T.clocks, 'prop');
    box(35.62, 31.6, .08, 2.4, .14, .9, '#22272E', '#22272E', '#22272E', 'prop', '', '', '', 'HOME    LDN    TYO', word(5, '#F5F3EE') + ';letter-spacing:.12em;transform:rotate(90deg)');
    // one desk per seat: an inbox and a calendar on the dual screens
    ROOMS[5].seats.forEach((q, i) => { const ag = seatAgent(5, i); workDesk(q[0], 32, .24, ag && ag.role === 'lead' ? 'lead' : 'dual', ag, [T.inbox, T.cal]); });
    // a mail cart with parcels and envelopes, and a stack of parcels by the door
    solid(34.45, 30.1, .9, .55, .5, .24, '#8E979E', 'linear-gradient(#5E666D,#5E666D) 0 0/100% 2px no-repeat,#AEB6BC', null, '', '#7A8288');
    solid(34.55, 30.15, .4, .4, .3, .74, '#C9965E', 'linear-gradient(90deg,transparent 42%,#E9D8A6 42% 58%,transparent 58%),#C9965E', null, 'prop');
    solid(35, 30.2, .3, .35, .16, .74, '#FFFFFF', null, null, 'prop');
    [[28.4, 34.9, .7, .2], [28.45, 34.95, .55, .5], [29.2, 35.05, .5, .2]].forEach((q) => solid(q[0], q[1], q[2], q[2] * .8, .4, q[3] + .04, '#C9965E', 'linear-gradient(90deg,transparent 42%,#E9D8A6 42% 58%,transparent 58%),#C9965E'));
    pot(35.05, 34.9, .24);
    dim = false; hire(5); }

  // ---------- slot 8: Back Office, the darker tech room ----------
  { const z = lit(8); room(30, 18, 8, 8, { floor: T.darkconcrete, acc: z.color, name: named(8), dark: true });
    // the server corner: two racks, a patch panel, a UPS and a cooling vent in the floor
    [18.5, 19.7].forEach((sy) => box(36.5, sy, 1.1, 1.1, 2.3, .2, '#1E2226', T.server, 'linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),' + T.server, 'blinky'));
    box(36.5, 18.3, 1.1, .15, .3, 1.9, '#2B3039', 'repeating-linear-gradient(90deg,#5BE39A 0 2px,#2B3039 2px 4px,#FFB84D 4px 6px,#2B3039 6px 9px)', '#2B3039', 'prop');
    solid(36.6, 21.1, .6, .5, .7, .2, '#2B3039', 'linear-gradient(#5BE39A,#5BE39A) 20% 30%/20% 12% no-repeat,#2B3039', null, '', '#23282E');
    solid(36.4, 20.85, 1.3, .2, .01, .2, '#3A3F45', 'repeating-linear-gradient(90deg,#55606A 0 2px,#3A3F45 2px 5px)', null, 'prop');
    // the wall: a run board (did everyone run?) and the cost board, both live-looking screens
    box(30.7, 18.22, 2.2, .1, .62, .35, '#0E1418', T.runs, '#0E1418', '', 'RUNS', word(6, '#5BE39A') + ';letter-spacing:.1em');
    box(33.2, 18.22, 2.2, .1, .62, .35, '#0E1418', T.costs, '#0E1418', '', 'COSTS', word(6, '#5BE39A') + ';letter-spacing:.1em');
    // desks: the Auditor watches the runs and the log, the Controller the costs and the spreadsheet; an empty seat has dark screens
    ROOMS[8].seats.forEach((q, i) => { const ag = seatAgent(8, i); const tex = ag && ag.id === 'controller' ? [T.costs, T.sheet] : [T.runs, T.log];
      workDesk(q[0], i < 2 ? 20.2 : 23.4, .2, ag && ag.role === 'lead' ? 'lead' : 'dual', ag, tex); });
    // audit odds and ends: a shredder, archive boxes, a plant to brighten the dark room
    solid(32.6, 20.3, .42, .36, .55, .2, '#3A3F45', 'linear-gradient(#111,#111) 50% 50%/70% 18% no-repeat,#5E666D', null, '', '#2B3039');
    [[35.6, 18.35, .2], [35.6, 18.35, .55], [35.6, 18.85, .2]].forEach((q) => box(q[0], q[1], .6, .45, .35, q[2], '#E9D8A6', '#D8C08A', '#C9AE72', '', 'AUDIT', word(4, '#5E3F27') + ';letter-spacing:.05em'));
    pot(37, 25.1, .2);
    dim = false; hire(8); }

  // ---------- slot 1: Investments ----------
  { const z = lit(1); room(6, 24, 8, 8, { floor: T.darkconcrete, acc: z.color, name: named(1), dark: true });
    // a trading floor: chart walls, an LED ticker tape of your holdings (filled by renderTicker), and two trading pods
    [6.8, 9.2, 11.6].forEach((sx) => box(sx, 24.22, 2.2, .1, .5, .2, '#0E1418', T.charts, '#0E1418'));
    box(6.4, 24.22, 7.2, .1, .36, .68, '#0A0F12', '#0A0F12', '#0A0F12', 'ticker', 'MY BOOK', 'font:700 8px/1 \'Pixelify Sans\',\'Courier New\',monospace;letter-spacing:.06em;white-space:nowrap;color:#F2C230');
    // the trading desk: four screens per seat (charts, a line, a spreadsheet), a keyboard and a phone; dark where nobody sits
    deskRow(1, 7, 26.4, 6, .2, true, (cx, y, t, on) => {
      screen(cx - .76, y + .05, .74, .46, t, on ? T.charts : T.off); screen(cx + .02, y + .05, .74, .46, t, on ? T.line : T.off);
      panel(cx - .76, y + .05, .74, .42, t + .64, on ? T.line : T.off); panel(cx + .02, y + .05, .74, .42, t + .64, on ? T.sheet : T.off);
      solid(cx - .3, y + .66, .6, .2, .03, t, '#3A3F45', 'repeating-linear-gradient(90deg,#5A6068 0 2px,#3A3F45 2px 4px)', null, 'prop');
      solid(cx + .5, y + .7, .22, .3, .06, t, '#2B2F33', null, null, 'prop'); });
    // a little gold bull on a plinth by the door, and a plant
    solid(12.7, 31, .5, .5, .55, .2, '#2F3236', null, null, '', '#23282E');
    solid(12.75, 31.12, .4, .22, .2, .75, '#F2C230', 'linear-gradient(90deg,#FFE58A,#C9A44C)', null, 'prop'); solid(13.08, 31.08, .1, .1, .12, .95, '#F2C230', null, null, 'prop');
    pot(6.4, 31, .2);
    [6.6, 11.2].forEach((dx) => { const dy = 29.4;
      solid(dx, dy, 2.2, 1, .78, .2, '#2F3236', 'var(--px),#3A3F45');
      [dx + .15, dx + 1.15].forEach((mx) => { solid(mx, dy + .1, .9, .14, .5, .98, '#22272E', null, T.charts, 'prop'); solid(mx, dy + .1, .9, .14, .44, 1.5, '#22272E', null, T.charts, 'prop'); }); });
    dim = false; hire(1); }

  // ---------- slot 2: Growth, a lesson screen and a reading nook ----------
  { const z = lit(2); room(9, 1.5, 7, 5, { floor: T.birch, acc: z.color, name: named(2), turf: [9.3, 5.4, 4.6, .9] });
    box(10.2, 1.72, 3.4, .1, .9, .35, '#12181C', '#12181C', '#12181C', '', 'TODAY’S LESSON', word(8, '#8FD3FF') + ';letter-spacing:.06em');
    box(15.4, 2, .4, 2.2, 1.5, .2, BIRCH, sh(BIRCH, 80), T.shelf);
    // study desks: a laptop, a stack of books and a desk lamp at each seat; a globe on the shelf
    deskRow(2, 9.6, 3.2, 4.5, .2, false, (cx, y, t, on) => { laptop(cx - .25, y + .1, t, on ? T.sheet : T.off); books(cx + .25, y + .7, t); deskLamp(cx - .65, y + .2, t); });
    solid(15.45, 2.3, .3, .3, .3, 1.7, '#3E7FC1', 'radial-gradient(circle at 40% 40%,#7CC36A 0 3px,#3E7FC1 4px)', null, 'prop');
    box(14, 1.72, 1.2, .08, .6, .5, '#C9965E', 'radial-gradient(#E5484D 1.5px,transparent 2px) 3px 3px/10px 9px,repeating-linear-gradient(90deg,#FFFFFF 0 6px,transparent 6px 9px),#C9965E', '#B98A57', 'prop');
    tub(9.25, 5.4, .2, GL); solid(15.5, 4.5, .1, .1, 1.1, .2, BRASS, null, null, 'prop'); solid(15.3, 4.3, .5, .5, .25, 1.3, BRASS, '#F7E3A1', null, 'prop');
    dim = false; hire(2); }

  // ---------- Huddle: a glass meeting pod ----------
  room(23.5, 1.5, 6, 5.5, { floor: T.birch, acc: '#9A6A2E', name: 'HUDDLE' });
  // the wall: a whiteboard with sticky notes, and a video-call screen with a camera bar
  box(24.2, 1.72, 2.4, .1, .75, .35, '#FBFBF8', T.whiteboard, '#E6E6E1');
  box(24.3, 1.8, .9, .04, .2, .78, '#FFE27A', T.sticky, '#FFE27A', 'prop');
  box(26.9, 1.72, 2.1, .1, .7, .38, '#22272E', T.call, '#22272E', '', '', '', 'box-shadow:inset 0 0 0 2px #22272E');
  solid(27.75, 1.74, .4, .1, .06, 1.08, '#2B2F33', null, null, 'prop');
  // a walnut meeting table with laptops, notepads, glasses of water and a speakerphone in the middle
  solid(25.2, 3.4, 2.6, 1.3, .72, .2, '#7A5634', 'var(--px),linear-gradient(90deg,rgba(255,255,255,.08),transparent 60%),#7A5634', 'linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.1)),#6B4A2E', '', '#5E3F27');
  solid(26.3, 3.85, .4, .4, .05, .92, '#2B2F33', 'radial-gradient(circle,#4AA8FF 0 2px,#3A3F45 2.5px 4px,#2B2F33 4.5px)', null, 'prop');
  [[25.35, 3.55, 1], [27.15, 4.05, -1]].forEach((q) => { solid(q[0], q[1], .5, .34, .03, .92, '#9AA3AA', null, null, 'prop');
    box(q[0], q[2] > 0 ? q[1] : q[1] + .29, .5, .05, .3, .92, '#22272E', T.sheet, '#22272E', 'prop'); });
  [[25.5, 4.2], [27.2, 3.55]].forEach((q) => solid(q[0], q[1], .32, .4, .02, .92, '#FFFFFF', 'repeating-linear-gradient(0deg,#FFFFFF 0 3px,#B9D3E8 3px 4px)', null, 'prop'));
  [[26.05, 3.6], [26.95, 4.4], [25.9, 4.45]].forEach((q) => solid(q[0], q[1], .1, .1, .16, .92, '#CFE8F2', 'radial-gradient(#9FD3EA 0 2px,#DFF1F8 2.5px)', null, 'prop'));
  // chairs around the table, each with its back away from the table (same footprints as before)
  [[24.4, 3.7, 'l', '#D9A441'], [28.1, 3.7, 'r', '#4C6A8C'], [25.6, 2.6, 't', '#4C6A8C'], [26.9, 5, 'b', '#D9A441']].forEach((q) => {
    const [cx, cy, side, col] = q;
    solid(cx, cy, .55, .55, .42, .2, col, 'linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)),' + col);
    noCol = noOcc = true;
    if (side === 'l') solid(cx, cy, .12, .55, .5, .62, col); else if (side === 'r') solid(cx + .43, cy, .12, .55, .5, .62, col);
    else if (side === 't') solid(cx, cy, .55, .12, .5, .62, col); else solid(cx, cy + .43, .55, .12, .5, .62, col);
    noCol = noOcc = false;
  });
  glassRun(29.3, 1.7, .08, 5.2, 1.5, .2);
  pot(23.8, 6.15, .2);
  // a standing lamp in the front corner, with a warm pool of light on the floor (it replaces the old hanging lamp)
  solid(27.95, 5.35, 1.3, 1.3, .01, .2, '#F2D27A', 'radial-gradient(closest-side,rgba(255,226,140,.55),rgba(255,226,140,0))', null, 'prop');
  solid(28.45, 5.85, .3, .3, .05, .2, '#2B2F33');
  noOcc = true;
  solid(28.57, 5.97, .06, .06, 1.3, .25, BRASS);
  solid(28.36, 5.76, .48, .48, .32, 1.45, '#F4E3B5', 'radial-gradient(circle,#FFF8DC 0 30%,#F2D27A 70%)', 'linear-gradient(#FBEFC8,#E9C877)', '', 'linear-gradient(#F4E3B5,#DDBB6A)');
  noOcc = false;

  // ---------- slot 11: Lounge ----------
  room(37.5, 8.5, 6, 7, { floor: T.birch, acc: Z(11).color, name: Z(11).label });
  solid(37.8, 8.8, 5.2, .9, .45, .2, G, GL); solid(37.8, 8.7, 5.2, .3, 1, .2, G, null, 'linear-gradient(' + BRASS + ' 0 2px,transparent 2px),' + G);
  solid(42.4, 9.7, .9, 3.6, .45, .2, G, GL); solid(42.9, 9.7, .3, 3.6, 1, .2, G, null, null, '', 'linear-gradient(270deg,' + BRASS + ' 0 2px,transparent 2px),' + G);
  solid(38.4, 11, 3.6, 3, .03, .2, '#E2CDB4', T.rug);
  roundTable(38.8, 10.2, .2); roundTable(40.8, 10.6, .2);
  [[38.4, 12], [39.9, 11.9], [40.4, 12.8], [41.9, 11.6]].forEach((q, i) => { solid(q[0], q[1], .55, .55, .42, .2, i % 2 ? GL : BLUSH); solid(q[0], q[1], .55, .12, .9, .2, i % 2 ? GL : BLUSH); });
  planterBox(37.8, 8.25, 5, .35, 1.2);
  [39, 40.6].forEach((lx) => { solid(lx + .22, 10.7, .04, .04, .9, 2.1, '#777', null, null, 'prop'); solid(lx, 10.5, .5, .5, .5, 1.6, '#F4E3B5', 'radial-gradient(circle,#FFF8DC 0 30%,#F2D27A 70%)', 'linear-gradient(#FBEFC8,#E9C877)', 'prop', 'linear-gradient(#F4E3B5,#DDBB6A)'); });
  // tea and a magazine on the tables, a foosball table by the glass, a dartboard on the wall
  solid(39.15, 10.5, .12, .12, .12, .98, '#FFFFFF', 'radial-gradient(#6B4A2E 0 2px,#FFFFFF 2.5px)', null, 'prop'); solid(40.95, 10.8, .45, .55, .02, .98, '#3E7FC1', null, null, 'prop');
  solid(37.85, 13.7, 1.2, .7, .7, .2, '#6B4A2E', 'linear-gradient(#3E8E3A,#3E8E3A) 50% 50%/86% 80% no-repeat,#6B4A2E', null, '', '#5E3F27');
  [.2, .45].forEach((d) => solid(37.75, 13.7 + d, 1.4, .04, .04, .85, '#C9D1D8', null, null, 'prop'));
  solid(37.85, 13.75, 1.2, .6, .02, .9, '#3E8E3A', 'radial-gradient(#E5484D 0 1.5px,transparent 2px) 30% 30%/50% 50% no-repeat,radial-gradient(#3E7FC1 0 1.5px,transparent 2px) 70% 60%/50% 50% no-repeat', null, 'prop');
  box(43.18, 13.6, .1, .6, .6, .9, '#2B2F33', '#2B2F33', 'radial-gradient(circle,#E5484D 0 2px,#F4F1EA 2.5px 4px,#2B2F33 4.5px 6px,#F4F1EA 6.5px 8px,#2B2F33 8.5px)', 'prop');

  // ---------- slot 10: the micro-kitchen café, the busiest spot ----------
  room(10, 34, 8, 7, { floor: T.terrazzo, acc: Z(10).color, name: Z(10).label, openX: true });
  [10.6, 11.8, 13].forEach((fx) => box(fx, 34.24, 1.1, .7, 1.4, .2, '#20272C', T.fridge, '#1A1F23'));
  solid(14.3, 34.4, 3.3, 1, 1, .2, '#EEEAE2', T.terrazzo, 'linear-gradient(' + BRASS + ' 0 2px,transparent 2px),' + G);
  solid(15.1, 34.5, .9, .6, .55, 1.2, '#2F3236', null, 'linear-gradient(' + BRASS + ',' + BRASS + ') 50% 70%/40% 20% no-repeat,#2F3236', 'prop');
  solid(16.4, 34.6, .6, .6, .18, 1.2, '#FFFFFF', 'radial-gradient(#F2A93B 3px,transparent 3.5px) 3px 3px,radial-gradient(#E5484D 3px,transparent 3.5px) 9px 7px,radial-gradient(#7CC36A 3px,transparent 3.5px) 4px 9px,#FFFFFF', null, 'prop');
  [14.5, 15.4, 16.3, 17.1].forEach((sx) => stool(sx, 35.6, .2));
  [[12.2, 36.8], [11.4, 39.4], [15.6, 38.6]].forEach((q, i) => { roundTable(q[0], q[1], .2); tub(q[0] - .9, q[1] + .1, .2, i % 2 ? BLUSH : GL); tub(q[0] + 1.2, q[1] + .1, .2, i % 2 ? GL : BLUSH); });
  [12.2, 14, 15.8].forEach((lx) => { solid(lx + .22, 37.9, .04, .04, .9, 2.2, '#777', null, null, 'prop'); solid(lx, 37.7, .5, .5, .5, 1.7, '#F4E3B5', 'radial-gradient(circle,#FFF8DC 0 30%,#F2D27A 70%)', 'linear-gradient(#FBEFC8,#E9C877)', 'prop', 'linear-gradient(#F4E3B5,#DDBB6A)'); });
  // a chalkboard menu over the counter, a pastry dome, a stack of cups, a water dispenser
  box(14.5, 34.22, 2.9, .08, .6, 1.25, '#2B2F33', 'repeating-linear-gradient(0deg,transparent 0 4px,rgba(245,243,238,.55) 4px 5px) 8px 6px/55% calc(100% - 10px) no-repeat,repeating-linear-gradient(0deg,transparent 0 4px,rgba(242,194,48,.7) 4px 5px) 85% 6px/15% calc(100% - 10px) no-repeat,#2B3530', '#2B2F33', '', 'MENU', word(6, '#F5F3EE') + ';letter-spacing:.1em');
  solid(14.45, 34.55, .5, .5, .06, 1.2, '#E9E4DA', null, null, 'prop'); solid(14.55, 34.65, .3, .3, .25, 1.26, '#F4F1EA', 'radial-gradient(#C9965E 0 3px,#F4F1EA 3.5px)', 'rgba(220,235,240,.7)', 'prop', 'rgba(220,235,240,.6)');
  [0, .08, .16].forEach((d) => solid(17.15, 34.6, .16, .16, .08, 1.2 + d, '#FFFFFF', null, null, 'prop'));
  solid(17.2, 35.75, .4, .4, .9, .2, '#E9E4DA', 'radial-gradient(#9FD3EA 0 4px,#E9E4DA 5px)', null, '', '#D6D1C6'); solid(17.25, 35.8, .3, .3, .35, 1.1, '#9FD3EA', 'linear-gradient(#CFEAF5,#7FC4E0)', null, 'prop');
  planterBox(16.6, 40.15, 1.2, .6, .2);

  // ---------- Terrace: the one outdoor space ----------
  solid(1.5, 35, 8.2, 7.6, .15, 0, '#B98A57', T.deck);
  [[2.6, 36.2], [5.4, 38.8]].forEach((q) => { roundTable(q[0], q[1], .15); tub(q[0] - .9, q[1], .15, '#E9E4DA'); tub(q[0] + 1.2, q[1], .15, '#E9E4DA'); });
  [[1.7, 35.2], [9.3, 35.2], [1.7, 42.3], [9.3, 42.3]].forEach((q) => solid(q[0], q[1], .16, .16, 2.6, .15, '#3A3A3A'));
  solid(1.7, 35.24, 7.7, .06, .06, 2.7, '#3A3A3A', 'radial-gradient(#FFE38A 1.6px,transparent 2.2px) 0 0/12px 100%', 'radial-gradient(#FFE38A 1.6px,transparent 2.2px) 0 0/12px 100%', 'prop');
  solid(1.74, 35.2, .06, 7.1, .06, 2.7, '#3A3A3A', 'radial-gradient(#FFE38A 1.6px,transparent 2.2px) 0 0/100% 12px', null, 'prop', 'radial-gradient(#FFE38A 1.6px,transparent 2.2px) 0 0/12px 100%');
  planterBox(1.8, 41.6, 3.2, .7, .15); planterBox(5.6, 41.6, 3.4, .7, .15);
  tree(3.2, 39.6); tree(8.2, 36.6);
  // a grill, two sun loungers, lanterns on the tables and a pot of herbs
  solid(1.9, 40.7, .8, .5, .7, .15, '#2B2F33', 'repeating-linear-gradient(90deg,#55606A 0 2px,#2B2F33 2px 5px)', null, '', '#23282E'); solid(1.95, 40.75, .7, .4, .25, .85, '#3A3F45', null, null, 'prop');
  [6.6, 7.6].forEach((lx) => { solid(lx, 39.6, .7, 1.6, .3, .15, '#E9E4DA', 'repeating-linear-gradient(0deg,#E9E4DA 0 5px,#F2C230 5px 8px)', null, '', '#D6D1C6');
    noOcc = true; solid(lx, 39.6, .7, .3, .35, .45, '#E9E4DA', 'repeating-linear-gradient(90deg,#E9E4DA 0 5px,#F2C230 5px 8px)'); noOcc = false; });
  [[2.95, 36.45], [5.75, 39.05]].forEach((q) => { solid(q[0], q[1], .16, .16, .22, .93, '#3A3A3A', 'radial-gradient(#FFE38A 0 2px,#3A3A3A 3px)', 'linear-gradient(#FFE38A,#F2B030)', 'prop', 'linear-gradient(#FFE38A,#F2B030)'); });
  solid(9.0, 40.3, .45, .45, .35, .15, '#C0563C', null, null, '', '#A84A33'); solid(8.95, 40.25, .55, .55, .25, .5, '#5DB352', T.leaf, T.leaf, 'prop', T.leaf);

  // ---------- slot 7: Health ----------
  { const z = lit(7); room(37.5, 36, 6, 6, { floor: T.birch, acc: z.color, name: named(7) });
    // desks: a laptop, a water bottle and an apple at each seat; a STEPS board on the wall
    deskRow(7, 38, 36.6, 4.6, .2, false, (cx, y, t, on) => { laptop(cx - .25, y + .1, t, on ? T.bars : T.off); bottle(cx + .4, y + .3, t); solid(cx + .45, y + .75, .14, .14, .14, t, '#E5484D', null, null, 'prop'); });
    box(38.2, 36.22, 2.2, .08, .55, .45, '#0E1418', T.bars, '#0E1418', '', 'STEPS', word(6, '#5BE39A') + ';letter-spacing:.1em');
    // an exercise ball and kettlebells by the dumbbell rack
    solid(41.5, 40.9, .65, .65, .6, .2, '#2BB3C2', 'radial-gradient(circle at 35% 35%,#8FE3EC,#2BB3C2 70%)', 'linear-gradient(#2BB3C2,#1F8C98)', '', 'linear-gradient(#2BB3C2,#1F8C98)');
    [[42.1, 41.6, '#3A3F45'], [42.4, 41.65, '#E5484D']].forEach((q) => { solid(q[0], q[1], .22, .22, .2, .2, q[2]); solid(q[0] + .06, q[1] + .06, .1, .1, .1, .4, q[2], null, null, 'prop'); });
    solid(38.4, 39.8, .8, 2, .04, .2, '#8A6BD6'); solid(39.6, 39.8, .8, 2, .04, .2, '#2BB3C2');
    box(42.6, 39.4, .5, 2, 1.3, .2, '#2F3236', '#3B4650', 'repeating-linear-gradient(90deg,transparent 0 6px,#8E979E 6px 12px),#2F3236');
    dim = false; hire(7); }

  // ---------- slot 6: Relationships ----------
  { const z = lit(6); room(24, 36.5, 6, 5.5, { floor: T.birch, acc: z.color, name: named(6) });
    // desks: a laptop, a vase of flowers and a stack of cards at each seat
    deskRow(6, 24.5, 37, 4.6, .2, false, (cx, y, t, on) => { laptop(cx - .25, y + .1, t, on ? T.cal : T.off); vase(cx + .45, y + .3, t);
      solid(cx + .3, y + .72, .3, .22, .06, t, '#F6E3E8', null, null, 'prop'); });
    // balloons tied to the gift table, and a birthday board
    noCol = noOcc = true;
    [['#E5484D', 25.2, 40.3, 1.9], ['#F2C230', 25.6, 40.1, 2.1], ['#4FB0E0', 26, 40.4, 1.85]].forEach((q) => { solid(q[1] + .12, q[2] + .12, .02, .02, q[3] - .9, .9, '#888', null, null, 'prop');
      solid(q[1], q[2], .28, .28, .34, q[3], q[0], 'radial-gradient(circle at 35% 35%,rgba(255,255,255,.6) 0 2px,' + q[0] + ' 3px)', null, 'prop', 'linear-gradient(' + q[0] + ',' + shade(q[0], .75) + ')'); });
    noCol = noOcc = false;
    box(24.7, 36.72, 1.6, .08, .5, .5, '#FFFFFF', T.cal, '#DDD', '', 'BIRTHDAYS', word(5, '#B42318') + ';letter-spacing:.06em');
    box(29.1, 36.72, .7, .1, .6, .45, '#FFFFFF', 'radial-gradient(#E5484D 2px,transparent 2.5px) 6px 6px/12px 10px,#F6E3E8', '#DDD');
    solid(25, 40, 1.4, 1, .7, .2, '#F1ECE0');
    [['#E5484D', 25.1, 40.1], ['#4FB0E0', 25.6, 40.4]].forEach((q) => solid(q[1], q[2], .45, .45, .35, .9, q[0], T.gift + q[0], T.gift + q[0], 'prop'));
    solid(28.6, 40.8, .12, .12, .8, .2, '#555'); solid(28.35, 40.6, .6, .5, .45, 1, '#C8372D', null, null, '', 'linear-gradient(#F4F1EA,#F4F1EA) 50% 30%/50% 18% no-repeat,#A82E25');
    dim = false; hire(6); }

  // ---------- indoor palms and planters along the corridors ----------
  dim = false;
  PLANTS.forEach((q) => palm(q[0], q[1]));
  planterBox(14.6, 24, .6, 3, .1);

  // ---------- paper stacks: items waiting in the chain sit on the holder's desk ----------
  stackEls = {};
  for (const s of SEATS){ stackEls[s.agent.id] = [0, 1, 2, 3].map(i => { const b = box(s.x + .05, s.y - 1.55 + i * .02, .6, .45, .06, .98 + i * .07, '#FFFFFF', '#F1ECE0', '#E3DCCB', 'paper'); b.style.display = 'none'; return b; }); }

  bakeColliders();
  worldEl.textContent = '';
  worldEl.append(frag);
  agentNodes = {}; youNode = null;
}
let agentNodes = {}, youNode = null;

let held = {}, deskCounts = {act:0, review:0, fyi:0}, chainItems = [], deskTotal = 0;
