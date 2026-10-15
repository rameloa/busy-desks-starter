#!/usr/bin/env node
// Fills templates/ with this copy's settings (instance.json) and writes each file to the same path at the repo root:
// templates/prompts/auditor.md -> prompts/auditor.md. Edit the template, never the rendered file.
// prompts/ is rendered whole: a file there with no template (say, after a rename) is reported too.
//   node scripts/render.mjs           write the rendered files
//   node scripts/render.mjs --check   fail if a rendered file doesn't match its template (pre-commit and CI)
import fs from 'node:fs';
import path from 'node:path';
import {root, loadInstance, fill, walkFiles} from './instance.mjs';

const TPL = path.join(root, 'templates');
const WHOLE = ['prompts'];   // folders where every file must come from a template

const check = process.argv.includes('--check');
try {
  const values = loadInstance();
  const files = walkFiles(TPL);
  const stale = [];
  for (const rel of files){
    const out = fill(fs.readFileSync(path.join(TPL, rel), 'utf8'), values, 'templates/' + rel);
    const dest = path.join(root, rel);
    if (check){ if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== out) stale.push(rel); }
    else { fs.mkdirSync(path.dirname(dest), {recursive:true}); fs.writeFileSync(dest, out); }
  }
  const tpl = new Set(files);
  const orphans = WHOLE.filter(d => fs.existsSync(path.join(root, d)))
    .flatMap(d => walkFiles(path.join(root, d)).map(f => d + '/' + f)).filter(f => !tpl.has(f));
  if (stale.length) console.error('out of date with templates/: ' + stale.join(', ') + '\nEdit templates/, then run: node scripts/render.mjs');
  if (orphans.length) console.error('no template for: ' + orphans.join(', ') + '\nAdd one under templates/, or delete the file if its template was renamed or removed.');
  if (stale.length || orphans.length) process.exit(1);
  console.log(check ? files.length + ' rendered files match templates/' : 'wrote ' + files.length + ' files from templates/');
} catch (err){ console.error('render: ' + err.message); process.exit(1); }
