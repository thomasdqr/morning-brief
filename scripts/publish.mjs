// Takes the brief the routine just wrote in its own working directory and files it
// under data/briefs, then opens the page.
//
// Why the detour: a routine runs in its own scratch working directory, and writing
// anywhere else trips the "path is outside allowed working directories" guard. That
// guard is not a permission, so no amount of "always allow" ever settles it. Writing
// inside the working directory is free, so the routine does that and this fixed
// command, approved once, does the filing.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BRIEFS = path.join(ROOT, 'data', 'briefs');

// The brief is normally written straight into data/briefs, which the standing rules
// from scripts/allow.mjs make free. brief.json in the working directory is the
// fallback for an install without those rules; note that a routine's working
// directory is renamed every day, so no approval there can ever stick.
const today = new Date().toLocaleDateString('en-CA');
const candidates = [
  process.argv[2],
  path.join(BRIEFS, `${today}.json`),
  path.join(process.cwd(), 'brief.json'),
].filter(Boolean);

const source = candidates.find((f) => fs.existsSync(f));
if (!source) {
  console.error(`No brief found. Expected ${path.join(BRIEFS, `${today}.json`)} or brief.json in ${process.cwd()}.`);
  process.exit(1);
}

let brief;
try {
  brief = JSON.parse(fs.readFileSync(source, 'utf8'));
} catch (e) {
  console.error(`${source} is not valid JSON: ${e.message}`);
  process.exit(1);
}

const date = /^\d{4}-\d{2}-\d{2}$/.test(brief.date ?? '') ? brief.date : today;
fs.mkdirSync(BRIEFS, { recursive: true });
const target = path.join(BRIEFS, `${date}.json`);
fs.writeFileSync(target, JSON.stringify(brief, null, 2));
if (path.resolve(source) !== path.resolve(target)) fs.rmSync(source, { force: true });

// Keep every avatar this brief carried, so a later run that forgets to look one up
// still shows the face.
const PEOPLE = path.join(ROOT, 'data', 'people.json');
let known = {};
try { known = JSON.parse(fs.readFileSync(PEOPLE, 'utf8')); } catch {}
let learned = 0;
for (const item of [brief.focus, ...(brief.todos ?? []), ...(brief.updates ?? []), ...(brief.events ?? [])]) {
  for (const p of item?.people ?? []) {
    const key = String(p?.name ?? '').trim().toLowerCase();
    if (!key || !p?.avatar || known[key]?.avatar === p.avatar) continue;
    known[key] = { name: p.name, avatar: p.avatar, seen: new Date().toISOString() };
    learned++;
  }
}
if (learned) fs.writeFileSync(PEOPLE, JSON.stringify(known, null, 2));

console.log(`filed ${target} (${brief.todos?.length ?? 0} to-dos, ${brief.events?.length ?? 0} events, ${learned} new avatar${learned === 1 ? '' : 's'} remembered, ${Object.keys(known).length} known)`);

const open = spawn(process.execPath, [path.join(ROOT, 'scripts', 'open.mjs')], { detached: true, stdio: 'ignore' });
open.unref();
