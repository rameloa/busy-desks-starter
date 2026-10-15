/* ---------------- agent cards: meet an agent, call them in ----------------
   Run now fires the agent's own scheduled task through your Claude Code Remote connector.
   The run then logs to Supabase like any scheduled run, so the office animates it for real. */
let selectedId = null, lastRuns = {}, timeline = {}, armed = null, fastUntil = 0;
const runMsg = {};
function clearCard(){ selectedId = null; armed = null; $('infoFacts').hidden = true; $('infoActions').hidden = true; const t = $('infoTimeline'); if (t) t.hidden = true; }
/* Run timeline: every event from the agent's latest run, in order, with its "why" and the ids/links it logged in data. */
function fmtVal(v){ if (v == null) return ''; if (typeof v === 'object') return JSON.stringify(v); return String(v); }
function renderTimeline(id, lr){
  let box = $('infoTimeline');
  if (!box){ box = el('div','tl'); box.id = 'infoTimeline'; $('infoActions').before(box); }
  box.textContent = ''; const list = (timeline[id] || []).filter(t => lr && t.run_id === lr.id);
  if (!lr || demo){ box.hidden = true; return; }
  box.hidden = false; box.append(el('div','tl-h', `Last run, step by step · ${fmtDay(lr.started_at)} ${fmtTime(lr.started_at)}`));
  if (!list.length){ box.append(el('div','empty','No steps logged for this run.')); return; }
  const ol = el('ol');
  for (const t of list){
    const li = el('li'); const k = el('span','k', t.kind); k.dataset.k = t.kind;
    const m = el('span','m', t.message || t.kind); const d = t.data && typeof t.data === 'object' ? t.data : null;
    if (d && d.why) m.append(el('span','why', 'Why: ' + d.why));
    if (d){ const rest = Object.entries(d).filter(([key, v]) => key !== 'why' && v != null && v !== '').slice(0, 8);
      if (rest.length){ const dat = el('span','dat');
        rest.forEach(([key, v], i) => { if (i) dat.append(document.createTextNode(' · ')); const s = fmtVal(v);
          if (typeof v === 'string' && /^https:\/\//.test(v)){ const a = el('a', null, key); a.href = v; a.target = '_blank'; a.rel = 'noopener'; dat.append(a); }
          else dat.append(document.createTextNode(key + ': ' + (s.length > 80 ? s.slice(0, 77) + '…' : s))); });
        m.append(dat); } }
    li.append(el('time', null, fmtTime(t.created_at)), k, m); ol.append(li);
  }
  box.append(ol);
}
function ago(iso){ const m = Math.round((Date.now() - new Date(iso).getTime())/60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m/60); return h < 36 ? h + ' h ago' : fmtDay(iso); }
function showAgentCard(id, refresh){
  const reg = (REG.agents || []).find(a => a.id === id), live = ROSTER[id], g = agents[id];
  if (!reg && !g) return;
  if (!refresh || selectedId !== id) armed = null;
  selectedId = id; if (!refresh) openDrawer('info');
  const nick = (live && live.name) || (reg && (reg.nickname || reg.name)) || (g && g.name) || id;
  const job = (reg && reg.name) || (g && g.team) || '';
  const col = (live && live.col) || (reg && reg.color) || C.muted;
  const dept = reg ? ((REG.departments || []).find(d => d.id === reg.department_id) || {}).name : 'Visitor';
  const head = el('div','info-head'); const av = el('span','av2', (nick[0] || '?').toUpperCase()); av.style.background = col;
  const nm = el('div'); nm.append(document.createTextNode(nick)); if (job && job !== nick) nm.append(el('span','job', job + (dept ? ' · ' + dept : '')));
  head.append(av, nm); $('infoName').textContent = ''; $('infoName').append(head);
  $('infoRole').textContent = (reg && reg.description) || (g && g.role) || '';
  const f = $('infoFacts'); f.textContent = ''; f.hidden = false;
  const fact = (k, v) => { f.append(el('dt', null, k), el('dd', null, v)); };
  const status = reg ? reg.status : 'live';
  fact('Status', status === 'live' ? 'Live' : status === 'paused' ? 'Paused' : 'Planned, not hired yet');
  if (reg && reg.schedule) fact('Runs', reg.schedule);
  const boss = reg && reg.reports_to ? ((REG.agents || []).find(a => a.id === reg.reports_to) || {}) : null;
  if (boss) fact('Reports to', (boss.nickname || boss.name || reg.reports_to) + (boss.status === 'live' ? '' : ' (Iris covers for now)'));
  else if (reg && reg.role === 'executive') fact('Reports to', 'You');
  const lr = lastRuns[id];
  if (lr) fact('Last run', `${ago(lr.started_at)} · ${lr.status === 'done' ? 'done' : lr.status === 'failed' ? 'failed' : 'still running'}${lr.tool_calls != null ? ' · ' + lr.tool_calls + ' tool calls' : ''}`);
  else if (status === 'live') fact('Last run', 'No runs yet');
  renderTimeline(id, lr);
  const box = $('infoActions'); box.textContent = '';
  const taskId = (live && live.taskId) || (reg && reg.scheduled_task_id);
  if (status === 'live' && taskId && !demo){
    box.hidden = false;
    const row = el('div','row');
    const b = el('button', 'btn' + (armed === id ? ' confirm' : ''), armed === id ? `Yes, run ${nick} now` : `Call ${nick} in`); b.type = 'button';
    b.disabled = runMsg[id] && runMsg[id].busy;
    b.addEventListener('click', () => { if (armed !== id){ armed = id; showAgentCard(id, true); return; } armed = null; runNow(id, taskId, nick); });
    row.append(b);
    if (armed === id){ const c = el('button','btn ghost','Cancel'); c.type = 'button'; c.addEventListener('click', () => { armed = null; showAgentCard(id, true); }); row.append(c); }
    box.append(row);
    if (runMsg[id]) box.append(el('div', 'msg ' + (runMsg[id].ok ? 'ok' : runMsg[id].bad ? 'bad' : ''), runMsg[id].text));
    const say = el('div','say'); say.append(document.createTextNode('Or in chat, say '), el('b', null, `“${nick}, run now”`), document.createTextNode('.')); box.append(say);
  } else if (status !== 'live'){ box.hidden = false; const say = el('div','say'); say.append(document.createTextNode('Not hired yet. Ask in chat to '), el('b', null, `hire ${nick}`), document.createTextNode(' when it’s their turn in the build order.')); box.append(say); }
  else box.hidden = true;
}
async function runNow(id, taskId, nick){
  runMsg[id] = {busy:true, text:`Calling ${nick}…`}; showAgentCard(id, true);
  try {
    await mcp.callTool(RUN_SERVER, RUN_TOOL, {trigger_id: taskId}, {cache:false});
    runMsg[id] = {ok:true, text:`${nick} is on the way. The run shows up here within a minute or two.`};
    fastUntil = Date.now() + 5*60*1000; setTimeout(load, 15000);
  } catch (err){
    const code = err && err.code;
    const why = code === 'server_not_connected' || code === 'server_not_found' || code === 'selection_required' ? 'The Claude Code Remote connector isn’t available to this page. Ask in chat instead.'
      : code === 'not_granted' || code === 'blocked_by_policy' || code === 'not_in_manifest' ? 'Running agents is off for this page. Turn it on in the Permissions menu, or ask in chat.'
      : 'Couldn’t start the run' + (err && err.message ? ': ' + err.message : '') + '. Ask in chat instead.';
    runMsg[id] = {bad:true, text:why};
  }
  showAgentCard(id, true);
}

