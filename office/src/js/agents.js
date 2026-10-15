/* ---------------- scripting ----------------
   Every bubble shows the agent's real event message. Items travel along the chain:
   a worker carries a finding to its boss's desk (agents.reports_to), the Executive
   collects from those desks, and only the Executive drops items in your trays. */
let speed = 1;
const SAY = {start:'On it!', work:'Checking…', found:'Found one!', handoff:'Filed it', report:'Report', deliver:'Delivered', done:'Done ✓', fail:'Uh oh'};
function stationOf(a){ return a.stationPt || P.mail; }
function seatOf(id){ const s = SEATS.find(s => s.agent.id === id); return s ? {x:s.x, y:s.y} : null; }
function visitSpot(id){ const s = seatOf(id); return s ? {x:Math.min(N-1.2, s.x+.7), y:s.y+.35} : null; }
function bossOf(agentId){ const r = (REG.agents || []).find(a => a.id === agentId); return (r && r.reports_to) || 'executive'; }
// Who held an item before the Executive reviewed it: its for_agent if still in the chain, otherwise the source agent's boss.
function firstHolder(d){ return d.for_agent && d.for_agent !== '{{desk}}' ? d.for_agent : bossOf(d.source_agent); }
function sayMs(text){ return Math.min(4200, Math.max(1300, String(text).length * 55)); }
function trayDrop(tray){ return {x:TRAYS[tray].x, y:P.deskDrop.y}; }
function scriptEvent(ev){
  const a = agentFor(ev.agent || 'unknown');
  // Real work wins: drop any errand in progress and start from wherever the agent is.
  a.tasks = a.tasks.filter(t => !t.idle); if (a.cur && a.cur.idle){ a.cur = null; a.path = null; } a.emote = null;
  const T = [{t:'caption', ev}];
  const k = ev.kind, msg = ev.message || SAY[k] || '…', ms = sayMs(msg);
  const isExec = a.rank === 'executive';
  if (k === 'start'){ T.push({t:'stand'},{t:'say', text:msg, ms}); if (!isExec) T.push({t:'walk', to:stationOf(a)}); }
  else if (k === 'work'){ if (!isExec){ T.push({t:'walk', to:stationOf(a)}); if (a.station === 'bins') T.push({t:'toss'}); } T.push({t:'say', text:msg, ms, prog:true}); }
  else if (k === 'found'){ if (!isExec) T.push({t:'walk', to:stationOf(a)},{t:'pick', item:'env'}); T.push({t:'say', text:msg, ms, pop:true}); }
  else if (k === 'handoff'){
    if (!a.carry) T.push({t:'pick', item:'env'});
    const boss = isExec ? null : visitSpot(a.reports || 'executive');
    if (boss){ T.push({t:'walk', to:boss},{t:'drop', tray:null},{t:'say', text:msg, ms}); }
    else { const tray = ev._tray || 'review'; T.push({t:'walk', to:trayDrop(tray)},{t:'drop', tray},{t:'say', text:msg, ms}); }
  }
  else if (k === 'report'){
    if (isExec){
      // Collect: walk to each desk that held items reviewed in this run, then drop the promoted ones in your trays.
      const reviewed = desk.filter(d => d.briefed_run_id === ev.run_id && d.source_agent !== a.id);
      const holders = ev._holders || [...new Set(reviewed.map(firstHolder))].filter(h => h !== a.id);
      for (const h of holders){ const spot = visitSpot(h); if (spot) T.push({t:'walk', to:spot},{t:'pick', item:'env', holder:h}); }
      if (reviewed.length && !holders.length) T.push({t:'pick', item:'env', holder:a.id});
      const trays = ev._trays || [...new Set(reviewed.filter(d => d.for_agent === '{{desk}}').map(d => d.tray || 'review'))];
      for (const tr of trays) T.push({t:'walk', to:trayDrop(tr)},{t:'drop', tray:tr});
      if (!trays.length) T.push({t:'dropAll', quiet:true});
      T.push({t:'say', text:msg, ms});
    } else { const boss = visitSpot(a.reports || 'executive'); T.push({t:'walk', to: boss || P.exec},{t:'say', text:msg, ms}); }
  }
  else if (k === 'deliver'){ const tray = ev._tray || 'fyi'; T.push({t:'pick', item:'env'},{t:'walk', to:trayDrop(tray)},{t:'drop', tray},{t:'say', text:msg, ms}); }
  else if (k === 'done'){ T.push({t:'walk', to:a.home},{t:'sit'},{t:'say', text:msg, ms},{t:'spark'}); }
  else if (k === 'fail'){ T.push({t:'puff'},{t:'say', text:msg, ms:Math.max(ms, 2200), bad:true},{t:'dropAll'},{t:'walk', to:a.home},{t:'sit'}); }
  else { T.push({t:'say', text:msg, ms}); }
  for (const t of T) if (t.t === 'say') t.why = ev.why || '';
  a.tasks.push(...T);
}
function spotIn(z, pad){ return {x: z.x + pad + Math.random()*(z.w - 2*pad), y: z.y + z.h*0.55 + Math.random()*(z.h*0.3)}; }
function homeZone(a){ return ZONES.find(z => a.home.x >= z.x && a.home.x <= z.x+z.w && a.home.y >= z.y && a.home.y <= z.y+z.h); }
function nearestPlant(a){ const ps = PLANTS.map(p => ({x:p[0], y:p[1]+.9}));
  return ps.reduce((m,p) => Math.hypot(p.x-a.x,p.y-a.y) < Math.hypot(m.x-a.x,m.y-a.y) ? p : m); }
function idleErrand(a){
  const I = t => Object.assign(t, {idle:true});
  const back = [I({t:'walk', to:a.home}), I({t:'sit'})];
  const z = homeZone(a);
  const mates = Object.values(agents).filter(o => o !== a && !o.busy());
  const opts = ['stroll','stroll','coffee','lounge','plant','stretch','desk','desk'].concat(mates.length ? ['visit','visit'] : []).filter(k => k !== a.lastIdle);
  const k = opts[Math.floor(Math.random()*opts.length)]; a.lastIdle = k;
  const pause = (ms) => I({t:'wait', ms});
  if (k === 'stroll'){ const p1 = z ? spotIn(z, 1) : {x:a.home.x+1, y:a.home.y}, p2 = z ? spotIn(z, 1) : a.home;
    return [I({t:'stand'}), I({t:'walk', to:p1}), pause(700 + Math.random()*900), I({t:'walk', to:p2}), pause(500), ...back]; }
  if (k === 'coffee'){ const c = Math.random() < .5 ? P.cafe : P.cafe2;
    return [I({t:'stand'}), I({t:'walk', to:{x:c.x+(Math.random()-.5)*1.2, y:c.y+(Math.random()-.5)*.5}}), I({t:'emote', e:'☕', ms:2400}), ...back]; }
  if (k === 'lounge'){ const l = Math.random() < .5 ? P.lounge1 : P.lounge2;
    return [I({t:'stand'}), I({t:'walk', to:l}), I({t:'sit'}), I({t:'emote', e:'🎵', ms:2600}), I({t:'stand'}), ...back]; }
  if (k === 'plant'){ const p = nearestPlant(a);
    return [I({t:'stand'}), I({t:'walk', to:p}), I({t:'emote', e:'🌱', ms:1800}), ...back]; }
  // Desk time: stay seated at their own screens a while. Quiet: no bubble, no emote, no busy ring.
  if (k === 'desk'){ return [I({t:'walk', to:a.home}), I({t:'sit'}), pause(6000 + Math.random()*6000)]; }
  if (k === 'stretch'){ return [I({t:'stand'}), I({t:'emote', e:'🙆', ms:1500, hop:true}), I({t:'sit'}), pause(800)]; }
  const m = mates[Math.floor(Math.random()*mates.length)];
  const spot = {x:Math.max(1.2, Math.min(N-1.2, m.x + (m.x > 22 ? -.9 : .9))), y:m.y + .15};
  return [I({t:'stand'}), I({t:'walk', to:spot}), I({t:'emote', e:'👋', ms:1600, hop:true}), pause(600), ...back];
}
function startTask(a, task, now){
  a.cur = task; task.t0 = now;
  if (task.t === 'walk'){ a.sitting = false; a.path = route({x:a.x,y:a.y}, task.to); a.replanAt = now + 350; a.stuck = 0; a.tries = 0; }
  else if (task.t === 'say'){ a.bubble = {text:task.text, why:task.why || '', until: now + task.ms/speed, bad:task.bad, prog:task.prog, pop:task.pop, from:now}; task.end = now + task.ms/speed; }
  else if (task.t === 'emote'){ a.emote = {e:task.e, until: now + task.ms/speed, from:now}; if (task.hop) a.hop = 1; task.end = now + task.ms/speed; }
  else if (task.t === 'caption'){ showCaption(task.ev); a.cur = null; }
  else if (task.t === 'stand'){ a.sitting = false; a.hop = 1; a.cur = null; }
  // At their own desk people face their screens (their back to you); anywhere else they sit facing you.
  else if (task.t === 'sit'){ a.sitting = true; const desk = !a.guest && Math.hypot(a.x - a.home.x, a.y - a.home.y) < .4; a.back = desk; if (desk) a.fx = -1; a.cur = null; }
  else if (task.t === 'pick'){ a.carry = task.item; a.hop = 1; task.end = now + 350/speed; }
  else if (task.t === 'drop'){ a.carry = null; task.end = now + 400/speed;
    if (task.tray){ trayFlash[task.tray] = now; you.hop = 1; you.bubble = {text:'Thanks!', until: now + 1200/speed, from:now}; }
    else burst('ring', a.x - .5, a.y - .9, 1); }
  else if (task.t === 'dropAll'){ if (a.carry && !task.quiet){ puff(a.x, a.y); } a.carry = null; a.cur = null; }
  else if (task.t === 'toss'){ toss(a); task.end = now + 1300/speed; }
  else if (task.t === 'puff'){ puff(a.x, a.y); a.failAt = now; a.cur = null; }
  else if (task.t === 'spark'){ sparkle(a.x, a.y); a.cur = null; }
}
function stepAgent(a, now, dt){
  if (!a.cur && a.tasks.length) startTask(a, a.tasks.shift(), now);
  // Floor life: between real runs every agent keeps moving on small errands (see docs/office-floor-rules.md).
  // Errands use emotes, never words, so nothing on the floor pretends to be work.
  if (!a.cur && !a.tasks.length && now > a.idleAt){ a.tasks.push(...idleErrand(a)); a.idleAt = now + (reduced ? 15000 : 1500 + Math.random()*3500); }
  const c = a.cur; if (!c) return;
  if (c.t === 'walk'){
    if (!a.path || !a.path.length){ a.path = null; a.cur = null; a.v = 0; return; }
    // Pushed off course by someone? If the next corner is no longer in plain sight, find a new way.
    if (now > a.replanAt){ a.replanAt = now + 350;
      if (!lineOk({x:a.x, y:a.y}, a.path[0], RAW)) a.path = route({x:a.x, y:a.y}, c.to); }
    // Real pace: speed up from a standstill, ease off on the last stretch, stop on the spot.
    let remain = 0, q = {x:a.x, y:a.y}; for (const w of a.path){ remain += Math.hypot(w.x-q.x, w.y-q.y); q = w; }
    const vmax = (reduced ? 18 : 3.2) * speed, vt = vmax * Math.min(1, .3 + remain/.9);
    a.v = Math.min(vt, (a.v || 0) + (reduced ? 1e3 : 9*speed)*dt);
    let left = a.v*dt; const x0 = a.x, y0 = a.y;
    while (left > 0 && a.path && a.path.length){
      const p = a.path[0], dx = p.x-a.x, dy = p.y-a.y, d = Math.hypot(dx,dy);
      if (Math.abs(dx) > .02) a.dir = dx > 0 ? 1 : -1;
      if (d <= left){ if (!tryMove(a, p.x, p.y)) break; a.path.shift(); left -= d; }
      else { if (!tryMove(a, a.x + dx/d*left, a.y + dy/d*left)) break; left = 0; }
    }
    { const mx = a.x - x0, my = a.y - y0, sx = .70711*(mx + my), sy = .35355*(my - mx), m = Math.hypot(sx, sy);
      if (m > 1e-4){ if (Math.abs(sx) > .3*m) a.fx = sx > 0 ? 1 : -1; if (sy < -.25*m) a.back = true; else if (sy > .25*m) a.back = false; } }
    a.walkT += dt*speed;
    // Wedged (someone standing in a doorway)? Wait a moment, then look for another way; give up after a few tries.
    if (Math.hypot(a.x-x0, a.y-y0) < a.v*dt*.25){ a.stuck += dt; if (a.stuck > .9){ a.stuck = 0; a.tries++; a.v = 0;
      if (a.tries > 4){ a.path = null; } else a.path = route({x:a.x, y:a.y}, c.to); } } else a.stuck = 0;
    if (!a.path || !a.path.length){ a.path = null; a.cur = null; a.v = 0; }
  } else if (c.t === 'wait'){ if (!c.end) c.end = now + c.ms/speed; if (now >= c.end) a.cur = null; }
  else if (c.end && now >= c.end) a.cur = null;
}

