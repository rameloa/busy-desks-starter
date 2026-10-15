#!/usr/bin/env node
// Builds a setup kit for a new office from starter/ and instance.json, into my-office/ (gitignored):
// the database schema and starter registry, the agent contract, and the three starter prompts, all with your
// settings filled in. SETUP.md walks through using it.
//   node scripts/new-office.mjs
import fs from 'node:fs';
import path from 'node:path';
import {root, loadInstance, fill} from './instance.mjs';

const OUT = path.join(root, 'my-office');
try {
  const v = loadInstance();
  const files = [
    ['templates/supabase/schema.sql', '1-schema.sql'],
    ['starter/seed.sql', '2-seed.sql'],
    ['starter/agent-contract.md', 'agent-contract.md'],
    ['starter/prompts/auditor.md', 'prompts/auditor.md'],
    ['starter/prompts/executive.md', 'prompts/executive.md'],
    ['starter/prompts/inbox-organizer.md', 'prompts/inbox-organizer.md'],
  ];
  for (const [src, dest] of files){
    const out = path.join(OUT, dest);
    fs.mkdirSync(path.dirname(out), {recursive:true});
    fs.writeFileSync(out, fill(fs.readFileSync(path.join(root, src), 'utf8'), v, src));
  }
  console.log('wrote my-office/ for ' + v.owner + ' (' + files.length + ' files). Next: SETUP.md, step 3.');
} catch (err){ console.error('new-office: ' + err.message); process.exit(1); }
