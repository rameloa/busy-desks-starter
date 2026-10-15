/* ---------------- replay + live ---------------- */
let events = [], desk = [], lastId = -1, replaying = false, demo = false;
const liveIds = new Set();
function trayFor(ev){
  const d = desk.find(d => d.source_agent === ev.agent && d.run_id === ev.run_id) || desk.find(d => d.source_agent === ev.agent);
  return d ? (d.tray || 'review') : (ev.kind === 'deliver' ? 'fyi' : 'review');
}
function play(list){ for (const e of list){ if (e.kind === 'handoff' || e.kind === 'deliver') e._tray = trayFor(e); scriptEvent(e); } }
// Runs play one after another, so a worker's handoff lands before the Executive comes to collect it.
const runQueue = [];
function queueRuns(runs){ runQueue.push(...runs.filter(r => r.length)); replaying = true; $('replay').disabled = true; }
function nextRun(){ if (runQueue.length && Object.values(agents).every(a => !a.busy())) play(runQueue.shift()); }
function resetFloor(){ runQueue.length = 0; for (const a of Object.values(agents)){ a.tasks = []; a.cur = null; a.path = null; a.carry = null; a.bubble = null; a.emote = null; a.x = a.home.x; a.y = a.home.y; a.sitting = true; a.back = !a.guest; if (!a.guest) a.fx = -1; } }
function replayLast(){
  if (!events.length) return;
  // Replay the latest stretch of work: every run that started within 14 hours of the newest event, oldest first.
  const newest = new Date(events[events.length-1].created_at).getTime();
  const recent = events.filter(e => newest - new Date(e.created_at).getTime() < 14*3600*1000);
  const order = [], byRun = {};
  for (const e of recent){ const k = e.run_id || ('solo'+e.id); if (!byRun[k]){ byRun[k] = []; order.push(k); } byRun[k].push(e); }
  resetFloor(); queueRuns(order.map(k => byRun[k]));
}
function endReplay(){ replaying = false; $('replay').disabled = !events.length && !demo; }
$('replay').addEventListener('click', () => demo ? runDemo() : replayLast());
document.querySelectorAll('.hud .seg button').forEach(b => b.addEventListener('click', () => {
  speed = +b.dataset.speed; document.querySelectorAll('.hud .seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
}));

function parseSnapshot(res){
  let p = res && res.payload, s = null;
  if (p && typeof p === 'object' && !Array.isArray(p)){ if (p.snapshot) return p.snapshot; if (typeof p.result === 'string') s = p.result; else if (Array.isArray(p.result)) return p.result[0].snapshot; }
  if (Array.isArray(p) && p[0] && p[0].snapshot) return p[0].snapshot;
  if (s == null) s = typeof p === 'string' ? p : ((res && res.content) || []).map(c => c.text || '').join('');
  try { const j = JSON.parse(s); if (j && typeof j.result === 'string') s = j.result; else if (Array.isArray(j) && j[0] && j[0].snapshot) return j[0].snapshot; } catch (e) {}
  const m = s.match(/<untrusted-data-[^>]*>\s*([\s\S]*?)\s*<\/untrusted-data/);
  const body = m ? m[1] : s; const a = body.indexOf('['), b = body.lastIndexOf(']');
  if (a < 0 || b < a) throw new Error('Unexpected response from Supabase');
  return JSON.parse(body.slice(a, b+1))[0].snapshot;
}

let mcp = null, firstLoad = true, pollTimer = null, loading = false;
async function load(){
  if (!mcp || loading) return; loading = true;
  try {
    const res = await mcp.callTool(SERVER, TOOL, {project_id: PROJECT, query: QUERY}, {cache:false});
    const snap = parseSnapshot(res);
    const evs = (snap.events || []).slice().sort((a,b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id - b.id));
    applyRegistry({departments:snap.departments || [], agents:snap.agents || []});
    desk = snap.desk || []; renderDesk(desk);
    goals = snap.goals || []; renderGoals(); renderBudgets();
    holdings = snap.holdings || []; prices = snap.prices || []; renderPortfolio(); renderTicker();
    lastRuns = Object.fromEntries((snap.runs || []).map(r => [r.agent, r]));
    timeline = {}; for (const t of (snap.timeline || [])) (timeline[t.agent] = timeline[t.agent] || []).push(t);
    if (selectedId) showAgentCard(selectedId, true);
    const fresh = lastId < 0 ? [] : evs.filter(e => e.id > lastId);
    events = evs; lastId = evs.reduce((m,e) => Math.max(m, e.id), lastId < 0 ? 0 : lastId);
    renderLog(events); renderStaff(events);
    setStatus('live', 'Live'); notice(null);
    $('logHint').textContent = 'Newest first · checked ' + new Date().toLocaleTimeString('en-CA',{timeZone:TZ, hour:'numeric', minute:'2-digit'});
    if (firstLoad){ firstLoad = false; $('replay').disabled = !events.length;
      if (events.length){ replayLast(); } else { $('capText').textContent = 'No runs yet. Agents will spring into action on their next scheduled run.'; }
    } else if (fresh.length){ fresh.forEach(e => liveIds.add(e.id));
      const order = [], byRun = {}; for (const e of fresh){ const k = e.run_id || ('solo'+e.id); if (!byRun[k]){ byRun[k] = []; order.push(k); } byRun[k].push(e); }
      queueRuns(order.map(k => byRun[k])); }
  } catch (err){ handleError(err); }
  finally { loading = false; }
}
function handleError(err){
  const code = err && err.code;
  const p = (t) => el('div', null, t);
  if (code === 'needs_reauth'){ setStatus('warn','Reconnect needed'); notice([p('Your Supabase connection expired. Reconnect Supabase in claude.ai Settings → Connectors, then reopen this page.')]); }
  else if (code === 'server_not_connected' || code === 'selection_required' || code === 'server_not_found'){ setStatus('warn','Not connected'); notice([p('This page reads your office through your Supabase connector. Add or pick Supabase in claude.ai Settings → Connectors.')]); startDemo(); }
  else if (code === 'not_in_manifest' || code === 'blocked_by_policy' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed'){ setStatus('demo','Demo'); notice([p('Supabase is off for this page, so you are watching a demo. Turn it on from this page’s Permissions menu to see your real agents.')]); startDemo(); }
  else if (code === 'approval_required'){ setStatus('warn','Needs approval');
    const b = el('button','btn','Allow and load'); b.type = 'button'; b.addEventListener('click', () => { notice(null); load(); });
    notice([p('Allow this page to read your Busy Desks tables in Supabase. It only runs one read-only query.'), b]); }
  else if (code === 'server_unavailable' || code === 'rate_limited' || (err && err.retryable)){ setStatus('warn','Reconnecting'); }
  else { setStatus('warn','Load failed'); notice([p('Could not read the office data: ' + ((err && err.message) || 'unknown error') + '. It will try again in 30 seconds.')]); }
}
let tick = 0;
function schedule(){ clearInterval(pollTimer); pollTimer = setInterval(() => { tick++; if (document.hidden) return; if (Date.now() < fastUntil || tick % 3 === 0) load(); }, POLL_MS/3); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });

