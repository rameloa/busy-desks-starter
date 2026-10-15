#!/usr/bin/env node
// Local checks for the office page. Needs Playwright with a Chromium (not a repo dependency; it is preinstalled in
// Claude Code cloud sessions). Build first: node scripts/build-office.mjs --dev
//   node office/dev/check.mjs routes                    every desk, station, door and dock reachable on the dev page
//   node office/dev/check.mjs shots <out> [page.html]   screenshots at 390 and 1280 px, light and dark (default: office/index.html)
//   node office/dev/check.mjs same <a.html> <b.html>    screenshot both pages the same way and say whether every pixel matches
// Screenshots run offline (fallback fonts, no CDN), on a fake clock with a seeded Math.random, so the same page gives the same pixels.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

let chromium;
try { ({chromium} = await import('playwright')); }
catch { ({chromium} = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CONFIGS = [{name:'390-light', w:390, h:844, scheme:'light'}, {name:'390-dark', w:390, h:844, scheme:'dark'},
  {name:'1280-light', w:1280, h:800, scheme:'light'}, {name:'1280-dark', w:1280, h:800, scheme:'dark'}];
const launch = () => chromium.launch();

async function shoot(browser, file, cfg, query){
  const ctx = await browser.newContext({viewport:{width:cfg.w, height:cfg.h}, colorScheme:cfg.scheme, deviceScaleFactor:1});
  // Offline: web fonts would arrive at random moments and shift the layout; this way every run uses the same fallback fonts.
  await ctx.route(/^https?:/, r => r.abort());
  const page = await ctx.newPage();
  await page.clock.install({time:new Date('2026-10-14T12:00:00Z')}); await page.clock.pauseAt(new Date('2026-10-14T12:00:01Z'));   // time stands still until runFor
  await page.addInitScript(() => { let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await page.goto(pathToFileURL(path.resolve(file)).href + (query || ''), {waitUntil:'load'});
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(6000);
  const png = await page.screenshot({animations:'disabled', caret:'hide'});
  await ctx.close(); return png;
}

// How many pixels differ between two screenshots, and where.
async function pixelDiff(browser, x, y){
  const page = await browser.newPage();
  const r = await page.evaluate(async ([a, b]) => {
    const load = async s => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i+1] !== B.data[i+1] || A.data[i+2] !== B.data[i+2]){
      n++; const p = i / 4, px = p % A.width, py = (p / A.width) | 0; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
    return {n, box:[x0, y0, x1, y1]};
  }, [x.toString('base64'), y.toString('base64')]);
  await page.close(); return `(${r.n} px differ, within x ${r.box[0]}-${r.box[2]}, y ${r.box[1]}-${r.box[3]})`;
}

const [cmd, a, b] = process.argv.slice(2);
const browser = await launch();
let fail = false;
try {
  if (cmd === 'routes'){
    const ctx = await browser.newContext({viewport:{width:1280, height:800}});
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(path.join(root, 'office/dev/index.html')).href, {waitUntil:'load'});
    await page.waitForFunction(() => window.__office && Object.keys(window.__office.ROSTER).length > 0);
    const res = await page.evaluate(() => {
      const o = window.__office, T = [];
      const add = (name, p) => p && T.push({name, x:p.x, y:p.y});
      for (const s of o.SEATS){ add('desk: ' + s.agent.id, s); add('visit: ' + s.agent.id, o.visitSpot(s.agent.id)); }
      for (const st of ['mail','bins','desk','exec','research','library','gym','kitchen']) add('station: ' + st, o.stationPoint(st));
      for (const k of Object.keys(o.P)) add('spot: ' + k, o.P[k]);
      for (const k of Object.keys(o.TRAYS)) add('tray: ' + k, o.trayDrop(k));
      for (const [s, r] of Object.entries(o.ROOMS)) if (r.door) add('door: room ' + s, {x:(r.door[0] + r.door[1])/2, y:r.y + r.d});
      for (const r of o.EXTRA_ROOMS) if (r.door) add('door: ' + r.key, {x:(r.door[0] + r.door[1])/2, y:r.y + r.d});
      for (const q of o.PLANTS) add('plant ' + q, {x:q[0], y:q[1] + .9});
      for (const d of o.VAC_DOCKS) add('vacuum dock', o.centre(o.nearestOpen(d)));
      const start = o.centre(o.nearestOpen(o.P.deskDrop));   // open floor in the atrium, in front of your desk
      const out = [];
      for (const t of T){
        const path = o.route(start, t); let cur = start, through = false;
        for (const p of path){ if (!o.lineOk(cur, p, o.RAW)) through = true; cur = p; }
        const miss = Math.hypot(cur.x - t.x, cur.y - t.y);
        out.push({name:t.name, ok:miss < .75 && !through, miss:+miss.toFixed(2), through});
      }
      return out;
    });
    const bad = res.filter(r => !r.ok);
    console.log(`${res.length - bad.length}/${res.length} targets reachable from the atrium, no step through anything solid`);
    for (const r of bad) console.log('  NOT OK', r.name, 'ends', r.miss, 'tiles away', r.through ? '(goes through something solid)' : '');
    fail = bad.length > 0;
  } else if (cmd === 'shots'){
    const file = b || path.join(root, 'office/index.html'), q = /dev[\\/]index\.html$/.test(file) ? '?seed=7' : '';
    fs.mkdirSync(a, {recursive:true});
    for (const c of CONFIGS){ fs.writeFileSync(path.join(a, c.name + '.png'), await shoot(browser, file, c, q)); console.log('wrote', path.join(a, c.name + '.png')); }
  } else if (cmd === 'same'){
    // The floor is animated, so now and then one agent ends a frame ahead even on the same page; up to 3 tries each.
    for (const c of CONFIGS){ let x, y, same = false, n = 0;
      while (!same && n < 3){ n++; x = await shoot(browser, a, c); y = await shoot(browser, b, c); same = x.equals(y); }
      console.log(c.name.padEnd(11), same ? 'identical' + (n > 1 ? ' (try ' + n + ')' : '') : 'DIFFERENT ' + await pixelDiff(browser, x, y)); if (!same) fail = true; }
  } else { console.log('usage: check.mjs routes | shots <out> [page.html] | same <a.html> <b.html>'); fail = true; }
} finally { await browser.close(); }
process.exit(fail ? 1 : 0);
