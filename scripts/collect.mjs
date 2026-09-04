// Everything the morning routine needs from this machine, in ONE command.
//
// Why one command: a routine's permission approvals are stored per exact command
// string, so a shell surface that varies every morning never stops asking. This
// script never varies, so it is approved once and then runs untouched.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(ROOT, 'data');
const PORT = process.env.PORT || 4747;

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const run = (cmd, args, cwd) => new Promise((resolve) => {
  execFile(cmd, args, { cwd, timeout: 25000, maxBuffer: 4e6 }, (err, out) => resolve(err ? null : out.trim()));
});
const get = async (route) => {
  try {
    const r = await fetch(`http://localhost:${PORT}${route}`, { signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.json() : { error: `${route} -> ${r.status}` };
  } catch (e) { return { error: e.message }; }
};

const config = readJson(path.join(DATA, 'config.json'), {});
const state = readJson(path.join(DATA, 'state.json'), { done: {} });
const tools = Array.isArray(config.tools) ? config.tools : [];

// The previous brief, so open to-dos keep their id.
const briefs = fs.existsSync(path.join(DATA, 'briefs'))
  ? fs.readdirSync(path.join(DATA, 'briefs')).filter((f) => f.endsWith('.json')).sort()
  : [];
const previous = briefs.length ? readJson(path.join(DATA, 'briefs', briefs[briefs.length - 1]), null) : null;

const out = {
  today: new Date().toLocaleDateString('en-CA'),
  weekday: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
  generatedAt: new Date().toISOString(),
  install: ROOT,
  writeBriefTo: path.join(DATA, 'briefs', `${new Date().toLocaleDateString('en-CA')}.json`),
  config: { name: config.name, role: config.role, profile: config.profile, tools, workdir: config.workdir },
  alreadyDone: Object.entries(state.done ?? {}).map(([id, v]) => ({ id, title: v?.title })),
  openFromPreviousBrief: (previous?.todos ?? []).map((t) => ({ id: t.id, title: t.title?.en ?? t.title })),
  art: await get('/api/art'),
  calendarFallback: tools.some((t) => t === 'gcal' || t === 'outlook') ? await get('/api/calendar') : null,
};

// git forges, if configured. Done here so the routine needs no gh approval of its own.
if (tools.includes('github') || tools.includes('gitlab')) {
  const cwd = config.workdir && fs.existsSync(config.workdir) ? config.workdir : ROOT;
  const [mine, requested] = await Promise.all([
    run('gh', ['pr', 'list', '--author', '@me', '--state', 'open', '--limit', '20', '--json', 'number,title,url,updatedAt,isDraft,reviewDecision,statusCheckRollup'], cwd),
    run('gh', ['pr', 'list', '--search', 'review-requested:@me state:open', '--limit', '20', '--json', 'number,title,url,updatedAt,author'], cwd),
  ]);
  out.github = {
    cwd,
    myOpenPrs: mine ? JSON.parse(mine) : { error: 'gh unavailable or not logged in' },
    reviewsRequestedOfMe: requested ? JSON.parse(requested) : { error: 'gh unavailable or not logged in' },
  };
}

process.stdout.write(JSON.stringify(out, null, 2));
