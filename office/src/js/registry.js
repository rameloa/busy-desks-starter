/* ---------------- registry ----------------
   The office is built from two Supabase tables: departments (rooms, by slot 0-11)
   and agents (staff, by department + seat). Add a row there and the office updates.
   Slots 4, 9, 10, 11 are fixed rooms: your desk, mail room, café, lounge. */
const FIXED_SLOTS = new Set([4,9,10,11]);
const FIXED_INFO = {
  4:{key:'desk', label:'MY DESK', role:'Where everything lands: Act now, Review and FYI trays.', color:'#F2C230'},
  9:{key:'mail', label:'MAIL ROOM', role:'Where agents pick up what arrives in Gmail.', color:'#E09878'},
  10:{key:'cafe', label:'CAFÉ', role:'The micro-kitchen. Coffee between runs.', color:'#C8A07A'},
  11:{key:'lounge', label:'LOUNGE', role:'Banquettes and bistro chairs. Idle agents hang out here.', color:'#5FB3D9'}
};
// Before Supabase answers, every room shows as not staffed yet and nobody is on the floor, so the real registry
// only ever lights rooms up (it never contradicts your office). The demo (no connector) uses the starter staff.
const ROOMS_PLANNED = [
    {id:'exec',name:'Executive',slot:0,status:'planned',color:'#B0569F',description:'Chief of Staff: morning brief, priorities, and your goals with weekly check-ins.'},
    {id:'investments',name:'Investments',slot:1,status:'planned',color:'#1F9E8F',description:'Portfolio analysis, watchlist trends, possible entry points.'},
    {id:'growth',name:'Growth',slot:2,status:'planned',color:'#D9A400',description:'Learning and career.'},
    {id:'finance',name:'Finance',slot:3,status:'planned',color:'#22985A',description:'Spending, bills and subscriptions, tax and records.'},
    {id:'operations',name:'Operations',slot:5,status:'planned',color:'#2F64E0',description:'Inbox, calendar, home admin and travel.'},
    {id:'relationships',name:'Relationships',slot:6,status:'planned',color:'#E0574F',description:'Birthdays, keeping in touch, gifts.'},
    {id:'health',name:'Health',slot:7,status:'planned',color:'#E68A1F',description:'Fitness and food together.'},
    {id:'it-audit',name:'Back Office',slot:8,status:'planned',color:'#5B6B78',description:'Internal IT, audit and costs: checks every agent ran and tracks what each one costs.'}];
const LOADING = {departments:ROOMS_PLANNED, agents:[]};
const DEMO_LIVE = new Set(['exec', 'operations', 'it-audit']);
const DEMO = {departments:ROOMS_PLANNED.map(d => DEMO_LIVE.has(d.id) ? Object.assign({}, d, {status:'live'}) : d), agents:[
    {id:'executive',name:'Executive',nickname:'Iris',department_id:'exec',role:'executive',reports_to:null,status:'live',schedule:'Weekdays 7:41 AM',station:'desk',seat:0,color:'#B0569F',description:'Reviews what the others filed, checks every agent ran, and files one morning brief.'},
    {id:'inbox',name:'Inbox Organizer',nickname:'Ollie',department_id:'operations',role:'worker',reports_to:'executive',status:'live',schedule:'7:12 AM and 6:12 PM',station:'bins',seat:0,color:'#2F64E0',description:'Labels new mail and sends Needs-you items up the chain.'},
    {id:'auditor',name:'Auditor',nickname:'Audrey',department_id:'it-audit',role:'worker',reports_to:'executive',status:'live',schedule:'Daily 7:31 AM',station:'desk',seat:0,color:'#5B6B78',description:'Checks who ran and who failed.'}]};
let REG = {departments:[], agents:[]};
let ROSTER = {};   // live agents, keyed by id
let SEATS = [];    // every desk on the floor: {x,y,agent}
let ZONES = [];    // rooms on the floor, for taps, errands and the room chips
let worldSig = '';
function shade(hex, f){ const n = parseInt(String(hex).replace('#',''),16); if (isNaN(n)) return hex; const ch = s => Math.max(0,Math.min(255,Math.round(((n>>s)&255)*f))); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }
function seatPos(slot, seat){ const r = ROOMS[slot]; if (!r || !r.seats) return null; const s = r.seats[seat]; return s ? {x:s[0], y:s[1]} : null; }
function stationPoint(st){
  return ({mail:P.mail, bins:P.bins, desk:P.deskDrop, exec:P.exec, research:{x:9.6,y:25.6}, library:{x:14.8,y:3.2}, gym:{x:40.3,y:40}, kitchen:{x:15.4,y:36.7}})[st] || P.mail;
}
function applyRegistry(reg){
  if (!reg || !reg.departments || !reg.departments.length) return;
  REG = reg;
  const bySlot = {}; for (const d of reg.departments) if (d.slot != null && !FIXED_SLOTS.has(d.slot)) bySlot[d.slot] = d;
  ZONES = Object.keys(ROOMS).map(Number).map(s => {
    const r = ROOMS[s], base = {slot:s, x:r.x, y:r.y, w:r.w, h:r.d};
    if (FIXED_SLOTS.has(s)) return Object.assign(base, FIXED_INFO[s], {plan:false});
    const d = bySlot[s];
    if (d) return Object.assign(base, {key:d.id, label:d.name.toUpperCase(), name:d.name, plan:d.status !== 'live', role:d.description || '', color:d.color || '#8E979E'});
    return Object.assign(base, {key:'open'+s, label:'OPEN ROOM', plan:true, role:'An empty room for a future department. Add a department with this slot to fill it.', color:'#8E979E'});
  }).concat(EXTRA_ROOMS.map(e => Object.assign({slot:null, plan:false, h:e.d}, e)));
  const deptById = Object.fromEntries(reg.departments.map(d => [d.id, d]));
  ROSTER = {}; SEATS = [];
  for (const a of reg.agents){
    const d = deptById[a.department_id]; if (!d || d.slot == null || FIXED_SLOTS.has(d.slot)) continue;
    const home = seatPos(d.slot, a.seat || 0); if (!home) continue;
    SEATS.push({x:home.x, y:home.y, agent:a});
    if (a.status !== 'live') continue;
    const nick = a.nickname || a.name;
    ROSTER[a.id] = {name:nick, job:a.name, taskId:a.scheduled_task_id || null, team:d.name, initial:(nick[0]||'?').toUpperCase(), col:a.color, col2:shade(a.color,.62), home,
      station:a.station, stationPt:stationPoint(a.station), sched:a.schedule || '', role:a.description || '', reports:a.reports_to, rank:a.role};
  }
  // reconcile characters on the floor
  for (const id of Object.keys(agents)){ if (!ROSTER[id] && !agents[id].guest) delete agents[id]; }
  for (const [id, def] of Object.entries(ROSTER)){
    if (agents[id]){ const a = agents[id]; const moved = a.home.x !== def.home.x || a.home.y !== def.home.y; Object.assign(a, def); if (moved && !a.busy()){ a.x = def.home.x; a.y = def.home.y; } }
    else agentFor(id);
  }
  const sig = JSON.stringify(ZONES.map(z => [z.key, z.label, z.plan, z.color])) + JSON.stringify(SEATS.map(s => [s.agent.id, s.agent.status, s.agent.role, s.agent.nickname]));
  if (sig !== worldSig){ worldSig = sig; buildWorld(); buildChips(); renderTicker(); }
}

class Agent {
  constructor(id, def){ Object.assign(this, def); this.id = id; this.x = def.home.x; this.y = def.home.y; this.tasks = []; this.cur = null;
    this.path = null; this.carry = null; this.bubble = null; this.walkT = 0; this.sitting = true; this.back = !def.guest; this.fx = def.guest ? 1 : -1; this.dir = 1; this.idleAt = performance.now() + 800 + Math.random()*3000; this.hop = 0; this.emote = null; this.lastIdle = ''; }
  // Idle errands never count as busy: real runs start right away and the queue never waits on a coffee break.
  busy(){ return (this.cur && !this.cur.idle) || this.tasks.some(t => !t.idle); }
}
const agents = {};
const you = {x:P.you.x, y:P.you.y, hop:0, bubble:null};
function agentFor(id){
  if (agents[id]) return agents[id];
  const def = ROSTER[id] || {guest:true, name: id.charAt(0).toUpperCase()+id.slice(1)+' agent', team:'Visitor', initial:(id[0]||'?').toUpperCase(), col:'#8A5BD6', col2:'#57339A',
    home:{x:11.5+Math.random()*4, y:40.2}, station:'mail', stationPt:P.mail, sched:'', role:'This agent writes to your event stream but has no row in the agents table yet, so it waits in the café. Add it to the registry to give it a desk.'};
  return agents[id] = new Agent(id, def);
}

