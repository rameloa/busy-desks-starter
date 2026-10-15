#!/usr/bin/env node
// Builds the office page from office/src/ into one self-contained file, office/index.html (what gets published).
// No dependencies. Each line `<!-- include: path -->` in office/src/page.html is replaced by that file, byte for byte,
// then {{key}} placeholders are filled from instance.json (this copy's settings, e.g. {{supabase_project}}).
//   node scripts/build-office.mjs           write office/index.html
//   node scripts/build-office.mjs --check   fail if office/index.html doesn't match the sources (pre-commit and CI)
//   node scripts/build-office.mjs --dev     also write office/dev/index.html: the same page fed by office/dev/snapshot.json
//                                           (example data) instead of the Supabase connector. Never published.
import fs from 'node:fs';
import path from 'node:path';
import {root, loadInstance, fill, walkFiles} from './instance.mjs';

const SRC = path.join(root, 'office/src'), OUT = path.join(root, 'office/index.html');
const DEV_OUT = path.join(root, 'office/dev/index.html'), SNAPSHOT = path.join(root, 'office/dev/snapshot.json');

function build(){
  const page = fs.readFileSync(path.join(SRC, 'page.html'), 'utf8');
  const used = new Set();
  const html = page.replace(/^<!-- include: (\S+) -->\n/gm, (_, rel) => {
    const file = path.join(SRC, rel);
    if (!fs.existsSync(file)) throw new Error('office/src/page.html includes a missing file: ' + rel);
    const text = fs.readFileSync(file, 'utf8');
    if (!text.endsWith('\n')) throw new Error('office/src/' + rel + ' must end with a newline');
    used.add(rel); return text;
  });
  if (/<!-- include:/.test(html)) throw new Error('an include line in office/src/page.html was not resolved (one per line, nothing else on it)');
  // Every source file is included exactly once, so nothing is edited and then silently left out.
  const all = walkFiles(SRC).filter(f => f !== 'page.html');
  const stray = all.filter(f => !used.has(f));
  if (stray.length) throw new Error('not included in office/src/page.html: ' + stray.join(', '));
  return fill(html, loadInstance(), 'office/src');
}

// Dev only: a stand-in for the artifact runtime's mcp, answering the snapshot query from example data.
// Writes (save_setting, fire_trigger) go nowhere; they're logged to the console. ?seed=N makes Math.random repeatable,
// ?demo shows the page's own no-connector demo. window.__office exposes the floor's map and router for tests.
function devPage(html){
  const snap = JSON.parse(fill(fs.readFileSync(SNAPSHOT, 'utf8'), loadInstance(), 'office/dev/snapshot.json'));
  delete snap._example;
  const shim = `<script>
/* DEV BUILD: example data from office/dev/snapshot.json, not the live office. Never publish this file. */
(() => {
  const q = new URLSearchParams(location.search);
  if (q.has('seed')){ let s = (+q.get('seed') || 1) >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  if (q.has('demo')) return;
  const SNAP = ${JSON.stringify(snap)};
  const mcp = {async callTool(server, tool, args){
    if (tool === 'execute_sql' && /save_setting/.test(args.query)){ console.info('[dev] save_setting not sent:', args.query); return {content:[{type:'text', text:'[{"r":{"ok":true}}]'}]}; }
    if (tool === 'execute_sql') return {payload:{snapshot: JSON.parse(JSON.stringify(SNAP))}};
    console.info('[dev] ' + tool + ' not sent:', args); return {content:[{type:'text', text:'{}'}]};
  }};
  window.claude = {use: async name => name === 'mcp' ? mcp : null};
})();
</script>
`;
  const start = '<script>\n(() => {\n', end = '})();\n</script>';
  const i = html.indexOf(start), j = html.lastIndexOf(end);
  if (i < 0 || j < i) throw new Error('could not find the main script in the built page');
  const expose = 'window.__office = {route, lineOk, nearestOpen, idxOf, centre, stationPoint, visitSpot, trayDrop, ROOMS, EXTRA_ROOMS, P, TRAYS, PLANTS, VAC_DOCKS, N,\n' +
    '  get RAW(){ return RAW; }, get BLK(){ return BLK; }, get SEATS(){ return SEATS; }, get ZONES(){ return ZONES; }, get ROSTER(){ return ROSTER; }};\n';
  return html.slice(0, i) + shim + html.slice(i, j) + expose + html.slice(j);
}

const args = process.argv.slice(2);
try {
  const html = build();
  if (args.includes('--check')){
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== html){ console.error('office/index.html is out of date with office/src/. Run: node scripts/build-office.mjs'); process.exit(1); }
    console.log('office/index.html matches office/src/');
  } else {
    fs.writeFileSync(OUT, html); console.log('wrote office/index.html (' + Buffer.byteLength(html) + ' bytes)');
  }
  if (args.includes('--dev')){ fs.mkdirSync(path.dirname(DEV_OUT), {recursive:true}); fs.writeFileSync(DEV_OUT, devPage(html)); console.log('wrote office/dev/index.html (example data, not for publishing)'); }
} catch (err){ console.error('build-office: ' + err.message); process.exit(1); }
