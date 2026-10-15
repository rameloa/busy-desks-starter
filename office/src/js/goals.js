/* ---------------- goals & settings ----------------
   Your targets live in the Supabase goals table. The page writes through one narrow
   database function, save_setting(), which can only add, edit or archive a goal, set
   an agent's monthly budget, or record your Done / Later / Ignore on a desk item.
   Agents only read goals; Iris rates them each Monday. */
let goals = [];
const KIND = {spending:'Spending', saving:'Saving & investing', portfolio:'Portfolio', bills:'Bills', other:'Other'};
const STATUS = {not_rated:'Not rated yet', on_track:'On track', at_risk:'At risk', off_track:'Off track', waiting:'Waiting', met:'Met'};
const PERIOD = {month:'/month', quarter:'/quarter', year:'/year', by_date:'', ongoing:''};
const WATCH = {spending:'spend', saving:'bills-lead', bills:'bills-lead', portfolio:'portfolio-analyst', other:'executive'};
const money = (c, cur) => (c/100).toLocaleString('en-CA', {style:'currency', currency:cur || '{{currency}}', maximumFractionDigits: c % 100 ? 2 : 0});
function goalTarget(g){
  const bits = [];
  if (g.amount_cents != null) bits.push((g.kind === 'spending' ? 'Under ' : '') + money(g.amount_cents, g.currency) + (PERIOD[g.period] || ''));
  if (g.pct != null) bits.push(Number(g.pct) + '%');
  if (g.period === 'by_date' && g.target_date) bits.push('by ' + fmtDate(g.target_date, {month:'short', day:'numeric', year:'numeric'}));
  if (g.category) bits.push(g.category);
  return bits.join(' · ');
}
function watcherLine(id){
  const r = (REG.agents || []).find(a => a.id === id); if (!r) return '';
  const n = r.nickname || r.name;
  return r.status === 'live' ? `Watched by ${n}` : `Waiting for ${n} (${r.name}), not hired yet. Iris keeps an eye on it.`;
}
let archiveArmed = null;
function renderGoals(){
  const box = $('goals'); box.textContent = '';
  if (demo){ box.append(el('li','empty','Open this page in claude.ai to set your goals.')); $('addGoal').hidden = true; return; }
  $('addGoal').hidden = !$('goalForm').hidden;
  if (!goals.length){ box.append(el('li','empty','No goals yet. Add your first one: a spending cap, a saving target, a portfolio goal.')); return; }
  let lastKind = null;
  for (const g of goals){
    if (g.kind !== lastKind){ box.append(el('li','kindh', KIND[g.kind] || g.kind)); lastKind = g.kind; }
    const li = el('li');
    const chip = el('span','chip-s', STATUS[g.status] || g.status); chip.dataset.s = g.status;
    li.append(el('div','gt', g.title), chip);
    const t = goalTarget(g); if (t) li.append(el('div','gs', t));
    if (g.status_note) li.append(el('div','gn', g.status_note + (g.rated_at ? ` (Iris, ${fmtDay(g.rated_at)})` : '')));
    li.append(el('div','gs', watcherLine(g.watcher)));
    const bar = el('div','gb');
    const ed = el('button','btn ghost','Edit'); ed.type = 'button'; ed.addEventListener('click', () => openForm(g));
    const ar = el('button','btn ghost' + (archiveArmed === g.id ? ' confirm' : ''), archiveArmed === g.id ? 'Yes, remove it' : 'Remove'); ar.type = 'button';
    if (archiveArmed === g.id){ ar.style.background = 'var(--danger)'; ar.style.color = '#fff'; }
    ar.addEventListener('click', async () => {
      if (archiveArmed !== g.id){ archiveArmed = g.id; renderGoals(); return; }
      archiveArmed = null; ar.disabled = true;
      try { await saveSetting({op:'archive', id:String(g.id)}); goals = goals.filter(x => x.id !== g.id); renderGoals(); load(); }
      catch (err){ ar.disabled = false; ar.textContent = 'Couldn’t remove: ' + saveError(err); }
    });
    bar.append(ed, ar); li.append(bar); box.append(li);
  }
}
let editingId = null;
const F = () => $('goalForm').elements;
function syncForm(){
  const k = F().kind.value, per = F().period.value, show = (f, on) => { $('goalForm').querySelector(`[data-f="${f}"]`).hidden = !on; };
  show('amount', k !== 'bills'); show('pct', k === 'portfolio'); show('period', k !== 'bills');
  show('date', per === 'by_date' && k !== 'bills'); show('category', k !== 'bills');
  $('catLabel').textContent = k === 'spending' ? 'Category' : k === 'saving' ? 'Account' : k === 'portfolio' ? 'Holding or mix' : 'Detail';
  F().category.placeholder = k === 'spending' ? 'e.g. Food, Rides. Blank = all spending' : k === 'saving' ? 'e.g. TFSA, RRSP' : k === 'portfolio' ? 'e.g. Stocks, or one ticker for a max position' : '';
  F().title.placeholder = {spending:'e.g. Keep food under $600 a month', saving:'e.g. Max out my TFSA this year', portfolio:'e.g. Portfolio at $100k by Dec 2027', bills:'e.g. Never pay a bill late', other:'e.g. Cancel unused subscriptions'}[k];
  $('gfWatch').textContent = watcherLine(WATCH[k]);
}
function openForm(g){
  editingId = g ? g.id : null; const f = F();
  $('gfTitle').textContent = g ? 'Edit goal' : 'New goal';
  f.kind.value = g ? g.kind : 'spending'; f.title.value = g ? g.title : '';
  f.amount.value = g && g.amount_cents != null ? String(g.amount_cents/100) : ''; f.pct.value = g && g.pct != null ? String(Number(g.pct)) : '';
  f.period.value = g ? g.period : 'month'; f.target_date.value = g && g.target_date ? g.target_date : '';
  f.category.value = g && g.category || ''; f.note.value = g && g.note || '';
  $('gfMsg').textContent = ''; $('gfMsg').className = 'msg';
  $('goalForm').hidden = false; $('addGoal').hidden = true; syncForm(); f.title.focus();
}
function closeForm(){ editingId = null; $('goalForm').hidden = true; $('addGoal').hidden = false; }
$('addGoal').addEventListener('click', () => openForm(null));
$('gfCancel').addEventListener('click', closeForm);
F().kind.addEventListener('change', syncForm); F().period.addEventListener('change', syncForm);
function num(v){ const s = String(v || '').replace(/[$,\s%]/g, ''); if (!s) return null; const n = Number(s); return isFinite(n) && n >= 0 ? n : NaN; }
$('goalForm').addEventListener('submit', async ev => {
  ev.preventDefault(); const f = F(), msg = $('gfMsg'); const k = f.kind.value;
  const amt = k === 'bills' ? null : num(f.amount.value), pct = k === 'portfolio' ? num(f.pct.value) : null;
  const bad = t => { msg.className = 'msg bad'; msg.textContent = t; };
  if (Number.isNaN(amt)) return bad('Amount should be a number, like 600.');
  if (Number.isNaN(pct) || (pct != null && pct > 100)) return bad('Percent should be between 0 and 100.');
  const per = k === 'bills' ? 'ongoing' : f.period.value;
  if (per === 'by_date' && !f.target_date.value) return bad('Pick the date for this goal.');
  let title = f.title.value.trim();
  if (!title){ const tmp = {kind:k, amount_cents: amt != null ? Math.round(amt*100) : null, pct, period:per, target_date:f.target_date.value, category:f.category.value.trim()};
    title = (KIND[k] || 'Goal') + (goalTarget(tmp) ? ': ' + goalTarget(tmp) : ''); }
  const p = {op:'goal', kind:k, title, amount_cents: amt != null ? String(Math.round(amt*100)) : '', pct: pct != null ? String(pct) : '', period:per,
    target_date: per === 'by_date' ? f.target_date.value : '', category: k === 'bills' ? '' : f.category.value.trim(), note: f.note.value.trim(),
    currency: (editingId && (goals.find(g => g.id === editingId) || {}).currency) || '{{currency}}'};   // an edit keeps the goal's own currency
  if (editingId) p.id = String(editingId);
  $('gfSave').disabled = true; msg.className = 'msg'; msg.textContent = 'Saving…';
  try { await saveSetting(p); closeForm(); await load(); }
  catch (err){ bad('Not saved: ' + saveError(err)); }
  finally { $('gfSave').disabled = false; }
});
function renderBudgets(){
  const box = $('budgets'); if (box.contains(document.activeElement)) return; // don't wipe a value you're typing
  box.textContent = '';
  const live = (REG.agents || []).filter(a => a.status === 'live');
  if (demo || !live.length){ box.append(el('li','empty','Budgets show here once the office is connected.')); return; }
  for (const a of live){
    const li = el('li'); const mid = el('div'); mid.append(el('div','nm', a.nickname || a.name), el('div','sub', a.name));
    const inp = el('input'); inp.inputMode = 'decimal'; inp.placeholder = 'No cap'; inp.setAttribute('aria-label', `Monthly budget for ${a.nickname || a.name}, in US dollars`);
    inp.value = a.monthly_budget_usd != null ? String(Number(a.monthly_budget_usd)) : '';
    const b = el('button','btn ghost','Save'); b.type = 'button'; const m = el('div','msg');
    b.addEventListener('click', async () => {
      const v = num(inp.value); if (Number.isNaN(v) || (v != null && v > 500)){ m.className = 'msg bad'; m.textContent = 'Use a dollar amount between 0 and 500, or leave blank for no cap.'; return; }
      b.disabled = true; m.className = 'msg'; m.textContent = 'Saving…';
      try { await saveSetting({op:'budget', agent:a.id, usd: v == null ? '' : String(v)}); a.monthly_budget_usd = v; m.className = 'msg ok'; m.textContent = v == null ? 'Cap removed.' : `Saved: $${v}/month.`; }
      catch (err){ m.className = 'msg bad'; m.textContent = 'Not saved: ' + saveError(err); }
      finally { b.disabled = false; }
    });
    li.append(mid, inp, b, m); box.append(li);
  }
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  $('tab-goals').hidden = b.dataset.tab !== 'goals'; $('tab-budgets').hidden = b.dataset.tab !== 'budgets';
}));
// The only write this page makes to Supabase: one call to save_setting() with your values as JSON.
async function saveSetting(p){
  if (!mcp) throw new Error('not connected');
  const json = JSON.stringify(p);
  if (json.includes('$set$')) throw new Error('that text can’t be saved');
  const res = await mcp.callTool(SERVER, TOOL, {project_id: PROJECT, query: `select public.save_setting($set$${json}$set$::jsonb) as r;`}, {cache:false});
  const txt = JSON.stringify(res || {});
  // Success only when the function's own {"ok": true} comes back (the text may be escaped once or twice).
  if (!/ok[\\"]*\s*:\s*true/.test(txt)){
    const m = txt.match(/ERROR:?\s*([^"\\]{3,160})/) || txt.match(/(cancelled|denied)/i);
    throw new Error(m ? m[1] : 'Supabase didn’t confirm the save');
  }
  return res;
}
function saveError(err){
  const code = err && err.code;
  if (code === 'not_granted' || code === 'blocked_by_policy' || code === 'approval_required') return 'allow it in this page’s Permissions menu, then try again';
  if (code === 'needs_reauth') return 'reconnect Supabase in Settings → Connectors';
  return (err && err.message) || 'unknown error';
}

