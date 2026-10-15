// Reads instance.json (this copy's own settings) and fills {{key}} placeholders with its values.
// Shared by scripts/render.mjs, build-office.mjs, new-office.mjs and export-public.mjs, with walkFiles().
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Values land inside SQL and JS string literals, so they may not carry quotes, backslashes or line breaks.
// Every setting the templates, the office page and the export use.
const KEYS = ['owner', 'desk', 'gmail', 'city', 'timezone', 'currency', 'supabase_project', 'claude_project', 'office_url'];
const SHAPES = {
  desk: [/^[a-z][a-z0-9-]*$/, 'lowercase letters, digits or hyphens (e.g. "sam")'],
  supabase_project: [/^[A-Za-z0-9-]+$/, 'the project id: letters, digits or hyphens'],
  currency: [/^[A-Z]{3}$/, 'a three-letter currency code (e.g. "EUR")'],
};

export function loadInstance(dir = root){
  const file = path.join(dir, 'instance.json');
  if (!fs.existsSync(file)) throw new Error('instance.json is missing: see SETUP.md, step 1');
  const values = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete values._about;
  for (const [k, v] of Object.entries(values)){
    if (typeof v !== 'string' || !v) throw new Error('instance.json: ' + k + ' must be a non-empty string');
    if (/['"`\\\n\r]|\{\{/.test(v)) throw new Error('instance.json: ' + k + ' can\'t contain quotes, backslashes, line breaks or {{');
    if (SHAPES[k] && !SHAPES[k][0].test(v)) throw new Error('instance.json: ' + k + ' must be ' + SHAPES[k][1]);
  }
  for (const k of KEYS) if (!(k in values)) throw new Error('instance.json: ' + k + ' is missing (see SETUP.md, step 1)');
  // A named zone only (Region/City, or UTC). Offsets like "+05:00" and abbreviations like "EST" are refused: Postgres reads
  // offsets with the opposite sign from the browser, so the page and the database would disagree on the time.
  let named = values.timezone === 'UTC' || /^[A-Za-z]+(\/[A-Za-z0-9_+-]+)+$/.test(values.timezone);
  try { new Intl.DateTimeFormat('en', {timeZone: values.timezone}); } catch { named = false; }
  if (!named) throw new Error('instance.json: timezone must be a named time zone like "Europe/Lisbon", not "' + values.timezone + '"');
  return values;
}

export function fill(text, values, where){
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(where + ': unknown placeholder {{' + key + '}} (add it to instance.json)');
    return values[key];
  });
}

// Every file under dir, as paths relative to it with forward slashes. Skips .git. A symlink counts as the file it points to;
// a symlink to a folder is refused, so nothing is quietly left out.
export function walkFiles(dir){
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(d, {withFileTypes:true})){
    if (e.name === '.git') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (e.isSymbolicLink() && fs.statSync(p).isDirectory()) throw new Error(path.relative(dir, p) + ' is a symlink to a folder; use a real folder');
    out.push(path.relative(dir, p).split(path.sep).join('/'));
  } };
  walk(dir);
  return out.sort();
}
