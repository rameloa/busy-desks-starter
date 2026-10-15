/* ---------------- portfolio (Investments) ----------------
   Holdings come from your latest screenshot (holdings table); prices from price_history (a backfill, then the portfolio agent's daily closes).
   Gains are market value minus book value, kept in each holding's own currency. Read-only: the page never changes holdings. */
const nfmt = (n, d) => Number(n).toLocaleString('en-CA', {minimumFractionDigits:d == null ? 2 : d, maximumFractionDigits:d == null ? 2 : d});
// Money in a holding's own currency, with its narrow symbol ($ for USD and CAD, € for EUR); the currency code sits next to it.
const cfmt = (n, cur) => Number(n).toLocaleString('en-CA', {style:'currency', currency:cur || '{{currency}}', currencyDisplay:'narrowSymbol', minimumFractionDigits:2, maximumFractionDigits:2});
const sgn = (n, d) => (n > 0 ? '+' : n < 0 ? '−' : '') + nfmt(Math.abs(n), d);
const pct = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + nfmt(Math.abs(n) * 100, 1) + '%';
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dlabel = (d) => { const p = String(d).split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]); };
function pfRows(){
  const yr = new Date().getFullYear();
  return holdings.map(h => {
    const ser = prices.filter(p => p.symbol === h.symbol).map(p => ({d:p.price_date, c:+p.close})).sort((a,b) => a.d < b.d ? -1 : 1);
    let last = +h.last_price, lastD = h.as_of;
    const tail = ser[ser.length - 1]; if (tail && tail.d > lastD){ last = tail.c; lastD = tail.d; }
    if (!ser.length || ser[ser.length - 1].d < lastD) ser.push({d:lastD, c:last});
    const qty = +h.quantity, cost = +h.book_value, value = qty * last, gain = value - cost;
    const base = ser.find(p => +p.d.slice(0,4) < yr) || null, first = ser[0];
    const from = base || first, trend = from && from.c ? last / from.c - 1 : null;
    return {sym:h.symbol, name:h.name, acct:h.account, cur:h.currency, qty, cost, value, gain, gp: cost ? gain / cost : 0, last, lastD, avg: qty ? cost / qty : 0,
      ser, trend, ytd: !!base, from: from ? from.d : null};
  });
}
function spark(ser, up){
  const W = 116, H = 40, pad = 4; if (ser.length < 2) return null;
  const cs = ser.map(p => p.c), lo = Math.min(...cs), hi = Math.max(...cs), span = (hi - lo) || 1;
  const X = (i) => pad + i * (W - pad * 2) / (ser.length - 1), Y = (c) => pad + (H - pad * 2) * (1 - (c - lo) / span);
  const pts = ser.map((p, i) => X(i).toFixed(1) + ',' + Y(p.c).toFixed(1)).join(' ');
  const col = up ? 'var(--ok)' : 'var(--danger)', ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('aria-hidden', 'true');
  const add = (tag, at) => { const e = document.createElementNS(ns, tag); for (const k in at) e.setAttribute(k, at[k]); svg.append(e); return e; };
  add('line', {x1:pad, x2:W - pad, y1:Y(cs[0]), y2:Y(cs[0]), stroke:'var(--muted)', 'stroke-width':1, 'stroke-dasharray':'2 3', opacity:.6});
  add('polygon', {points: X(0).toFixed(1) + ',' + (H - pad) + ' ' + pts + ' ' + X(ser.length - 1).toFixed(1) + ',' + (H - pad), fill:col, opacity:.14});
  add('polyline', {points:pts, fill:'none', stroke:col, 'stroke-width':2, 'stroke-linejoin':'round'});
  add('rect', {x:X(ser.length - 1) - 2.5, y:Y(cs[cs.length - 1]) - 2.5, width:5, height:5, fill:col});
  return svg;
}
function renderPortfolio(){
  const list = byId('pfList'), curs = byId('pfCurs'); if (!list) return;
  list.textContent = ''; curs.textContent = '';
  for (const b of document.querySelectorAll('[data-acct]')) b.setAttribute('aria-pressed', String(b.dataset.acct === pfAcct));
  const all = pfRows(), rows = all.filter(r => pfAcct === 'all' || r.acct === pfAcct);
  const asOf = all.reduce((m, r) => r.lastD > m ? r.lastD : m, '');
  byId('pfAsOf').textContent = asOf ? 'Prices as of ' + dlabel(asOf) : '';
  byId('pfTape').textContent = pfAcct === 'all' ? 'My book · all accounts' : 'My book · ' + pfAcct;
  if (!rows.length){
    const li = el('li', 'pf-empty', holdings.length ? 'Nothing in this account.' : 'Your holdings load from Supabase once the office connects. Send Claude a new screenshot to update them.');
    list.append(li); return;
  }
  const usdFirst = (a, b) => a === b ? 0 : a === 'USD' ? -1 : b === 'USD' ? 1 : a < b ? -1 : 1;
  for (const cur of [...new Set(rows.map(r => r.cur))].sort(usdFirst)){
    const rs = rows.filter(r => r.cur === cur); if (!rs.length) continue;
    const cost = rs.reduce((s, r) => s + r.cost, 0), val = rs.reduce((s, r) => s + r.value, 0), g = val - cost, up = g >= 0;
    const box = el('div', 'pf-cur');
    box.append(el('span', 'cc', cur), el('span', 'val', cfmt(val, cur)),
      el('span', 'chg ' + (up ? 'up' : 'down'), (up ? '▲ ' : '▼ ') + sgn(g) + ' (' + pct(cost ? g / cost : 0) + ')'),
      el('span', 'cost', 'Paid ' + cfmt(cost, cur) + ' · ' + rs.length + (rs.length === 1 ? ' holding' : ' holdings')));
    box.setAttribute('aria-label', cur + ': worth ' + nfmt(val) + ', ' + (up ? 'up ' : 'down ') + nfmt(Math.abs(g)) + ' on ' + nfmt(cost) + ' paid');
    curs.append(box);
  }
  rows.sort((a, b) => a.cur === b.cur ? b.value - a.value : usdFirst(a.cur, b.cur));
  for (const r of rows){
    const up = r.gain >= 0, li = el('li');
    const head = el('div', 'pf-head'), sym = el('div', 'pf-sym', r.sym.replace(/\.TO$/, ''));
    const chip = el('span', 'chip-s', r.acct + ' · ' + r.cur); sym.append(chip, el('span', 'pf-pill ' + (up ? 'g-up' : 'g-down'), pct(r.gp)));
    head.append(sym, el('div', 'pf-name', r.name));
    const sp = el('div', 'pf-spark'), tUp = r.trend == null ? up : r.trend >= 0, svg = spark(r.ser, tUp);
    if (svg) sp.append(svg);
    if (r.trend != null){ const t = el('div', tUp ? 'g-up' : 'g-down', pct(r.trend) + ' '); t.append(el('span', 'lbl', r.ytd ? 'YTD' : 'since ' + dlabel(r.from))); sp.append(t); }
    const nums = el('dl', 'pf-nums');
    for (const [k, v, c] of [['Shares', nfmt(r.qty, r.qty % 1 ? 4 : 0)], ['Avg cost', cfmt(r.avg, r.cur)], ['Last', cfmt(r.last, r.cur)], ['Value', cfmt(r.value, r.cur)], ['Paid', cfmt(r.cost, r.cur)], ['Gain', sgn(r.gain), up ? 'g-up' : 'g-down']]){
      const d = el('div'); d.append(el('dt', null, k), el('dd', c || null, v)); nums.append(d); }
    li.append(head, sp, nums); list.append(li);
  }
}
document.querySelectorAll('[data-acct]').forEach(b => b.addEventListener('click', () => { pfAcct = b.dataset.acct; renderPortfolio(); }));
// The LED tape on the Investments wall: each holding's last price and gain since you bought it (real numbers, never chatter).
function renderTicker(){
  const s = worldEl.querySelector('.ticker .f span'); if (!s) return;
  const rows = pfRows(); s.textContent = '';
  const h = document.createElement('b'); h.className = 'tk-h'; h.textContent = 'MY BOOK  '; s.append(h);
  if (!rows.length){ s.append(document.createTextNode('WAITING FOR PRICES')); return; }
  for (const r of rows){
    const a = document.createElement('b'); a.className = 'tk-s'; a.textContent = r.sym.replace(/\.TO$/, '') + ' ' + nfmt(r.last) + ' ';
    const b = document.createElement('b'); b.className = r.gain >= 0 ? 'tk-u' : 'tk-d'; b.textContent = (r.gain >= 0 ? '▲' : '▼') + nfmt(Math.abs(r.gp) * 100, 1) + '%    ';
    s.append(a, b);
  }
}

