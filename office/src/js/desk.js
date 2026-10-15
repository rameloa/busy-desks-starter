function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function setStatus(s, text){ $('status').dataset.s = s; $('statusText').textContent = text; }
function regName(id){ const r = (REG.agents || []).find(a => a.id === id); return r ? (r.nickname || r.name) : id; }
function nameOf(id){ return (ROSTER[id] && ROSTER[id].name) || (agents[id] && agents[id].name) || id; }
function showCaption(ev){
  const a = agentFor(ev.agent || 'unknown');
  $('capWho').textContent = a.initial; $('capWho').style.background = a.col;
  $('capText').textContent = ''; const b = el('b', null, a.name + ': '); $('capText').append(b, document.createTextNode(ev.message || ev.kind)); if (ev.why) $('capText').append(el('span','why', 'Why: ' + ev.why));
  $('capWhen').textContent = ev.demo ? 'Demo, not your data' : `${fmtDay(ev.created_at)} · ${fmtTime(ev.created_at)}${liveIds.has(ev.id) ? ' · live' : ''}`;
}
function notice(html){ const n = $('notice'); n.textContent = ''; if (!html){ n.hidden = true; return; } n.hidden = false; n.append(...html); }

function renderDesk(all){
  // Your desk shows only what the Executive sent you; the rest is still moving up the chain.
  // Items you tapped Later on stay hidden until their time comes (tomorrow 7 AM by default).
  const nowMs = Date.now();
  const mine = all.filter(d => d.for_agent === '{{desk}}' && !decided.has(d.id));
  const items = mine.filter(d => !d.snoozed_until || new Date(d.snoozed_until).getTime() <= nowMs);
  const snoozed = mine.length - items.length;
  const waiting = all.filter(d => d.for_agent !== '{{desk}}' && !d.briefed_run_id);
  chainItems = waiting.slice().sort((p,q) => (p.tray === 'act' ? 0 : 1) - (q.tray === 'act' ? 0 : 1) || (p.created_at < q.created_at ? -1 : 1)); deskTotal = items.length;
  held = {}; for (const d of waiting) held[d.for_agent || 'executive'] = (held[d.for_agent || 'executive'] || 0) + 1;
  $('n-chain').textContent = waiting.length; const cl = $('chain'); cl.textContent = '';
  if (!waiting.length) cl.append(el('li','empty','Nothing waiting. Everything filed so far has been reviewed.'));
  for (const d of waiting){ const li = el('li'); li.append(el('span','t', d.title || 'Untitled'));
    const r = el('span','route'); const holder = d.for_agent || 'executive'; const live = ROSTER[holder];
    r.append(document.createTextNode(nameOf(d.source_agent) + ' → '), el('b', null, regName(holder)), document.createTextNode(live ? '' : ' (Iris covers)'));
    li.append(r); cl.append(li); }
  deskCounts = {act:0, review:0, fyi:0};
  for (const k of ['act','review','fyi']){
    const list = items.filter(d => (d.tray || 'fyi') === k); deskCounts[k] = list.length;
    $('n-'+k).textContent = list.length; const box = $('t-'+k); box.textContent = '';
    if (!list.length){ box.append(el('div','empty','Nothing here')); continue; }
    for (const d of list){
      const c = el('div','card'); c.append(el('div','card-t', d.title || 'Untitled'));
      if (d.detail) c.append(el('div','card-d', d.detail));
      const bits = [nameOf(d.source_agent)]; if (d.amount_cents != null) bits.push((d.amount_cents/100).toLocaleString('en-CA',{style:'currency',currency:d.currency||'{{currency}}'})); if (d.due_date) bits.push('Due ' + fmtDate(d.due_date));
      c.append(el('div','card-s', bits.join(' · ')));
      if (!demo) c.append(decideBar(d, k, c));
      box.append(c);
    }
  }
  let sn = $('snoozedNote'); if (!sn){ sn = el('div','snoozed'); sn.id = 'snoozedNote'; document.querySelector('#deskPanel .trays').after(sn); }
  sn.textContent = snoozed ? `${snoozed} snoozed with Later. They come back tomorrow morning.` : ''; sn.hidden = !snoozed;
  updateCounts();
}
/* Done / Later / Ignore: your decision on an item, saved through save_setting({op:'decide'}).
   Done and Ignore close it; Later hides it until tomorrow 7 AM. Iris reads what you ignored
   and stops sending you things like it. */
const decided = new Set();
function decideBar(d, tray, card){
  const bar = el('div','card-b'), m = el('div','msg');
  const opts = tray === 'fyi' ? [['done','Got it']] : [['done','Done'],['later','Later'],['ignore','Ignore']];
  for (const [choice, label] of opts){
    const b = el('button', 'btn' + (choice === 'done' ? '' : ' ghost'), label); b.type = 'button';
    b.setAttribute('aria-label', label + ': ' + (d.title || 'item'));
    b.addEventListener('click', async () => {
      bar.querySelectorAll('button').forEach(x => x.disabled = true); card.classList.add('gone'); m.className = 'msg'; m.textContent = 'Saving…';
      try {
        await saveSetting({op:'decide', id:d.id, choice});
        decided.add(d.id); renderDesk(desk); load();
      } catch (err){
        card.classList.remove('gone'); bar.querySelectorAll('button').forEach(x => x.disabled = false);
        m.className = 'msg bad'; m.textContent = 'Not saved: ' + saveError(err);
      }
    });
    bar.append(b);
  }
  if (tray !== 'fyi'){ const h = el('div','msg'); h.style.color = 'var(--muted)'; h.style.fontWeight = '600'; h.textContent = 'Ignore teaches Iris to skip things like this.'; bar.append(h); }
  bar.append(m); return bar;
}
function renderLog(events){
  const box = $('log'); box.textContent = '';
  if (!events.length){ box.append(el('li','empty','No events yet. They appear here as soon as an agent runs.')); return; }
  for (const e of [...events].reverse().slice(0, 40)){
    const li = el('li', e.kind === 'fail' ? 'fail' : '');
    const tm = el('time', null, `${fmtDay(e.created_at)} ${fmtTime(e.created_at)}`);
    const a = agentFor(e.agent); const ch = el('span','chip', a.name.split(' ')[0]); ch.style.color = a.col;
    const mm = el('span','msg', e.message || e.kind); if (e.why) mm.append(el('span','why', 'Why: ' + e.why)); li.append(tm, ch, mm); box.append(li);
  }
}
function renderStaff(events){
  const box = $('staff'); box.textContent = '';
  const lastBy = {}; for (const e of events) lastBy[e.agent] = e;
  const ids = [...new Set([...Object.keys(ROSTER), ...events.map(e => e.agent)])];
  for (const id of ids){
    const a = agentFor(id), le = lastBy[id];
    const li = el('li'); li.dataset.id = id; const sw = el('span','sw'); sw.style.background = a.col;
    li.addEventListener('click', () => showAgentCard(id));
    const nm = el('div','nm', a.name); if (a.job && a.job !== a.name) nm.append(el('span','job', ' · ' + a.job));
    const mid = el('div'); mid.append(nm, el('div','sub', le ? `Last: ${fmtDay(le.created_at)} ${fmtTime(le.created_at)} · ${a.sched || a.team}` : (a.sched ? `Runs ${a.sched} · no runs yet` : a.team)));
    li.append(sw, mid, el('span','doing',''), el('span','pill live', a.guest ? 'No desk' : 'Live')); box.append(li);
  }
  const deptName = Object.fromEntries((REG.departments || []).map(d => [d.id, d.name]));
  for (const p of (REG.agents || []).filter(a => a.status !== 'live')){
    const li = el('li','planned'); li.dataset.id = p.id; const sw = el('span','sw'); sw.style.background = C.muted;
    li.addEventListener('click', () => showAgentCard(p.id));
    const nm = el('div','nm', p.nickname || p.name); if (p.nickname) nm.append(el('span','job', ' · ' + p.name));
    const mid = el('div'); mid.append(nm, el('div','sub', `${deptName[p.department_id] || 'Unassigned'} · ${p.description || p.role}`));
    li.append(sw, mid, el('span','doing', p.status === 'paused' ? 'Paused' : 'Hiring'), el('span','pill ' + (p.status === 'paused' ? 'wait' : 'plan'), p.status === 'paused' ? 'Paused' : 'Planned')); box.append(li);
  }
}

