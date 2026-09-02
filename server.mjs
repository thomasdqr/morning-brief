import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(ROOT, 'data');
const BRIEFS = path.join(DATA, 'briefs');
const STATE = path.join(DATA, 'state.json');
const PORT = Number(process.env.PORT || 4747);

fs.mkdirSync(BRIEFS, { recursive: true });

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));

const latestBrief = () => {
  const files = fs.readdirSync(BRIEFS).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) return null;
  return readJson(path.join(BRIEFS, files[files.length - 1]), null);
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

const readBody = (req) => new Promise((resolve) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
});

// Runs `claude -p` with the subscription. No connectors in headless mode, so the
// prompt has to be self-contained (it is: PROMPT.md asks the generator for that).
const askClaude = (prompt, cwd) => new Promise((resolve) => {
  const child = spawn('claude', ['-p', prompt, '--output-format', 'text', '--allowedTools', 'Read,Glob,Grep,Bash(gh *),Bash(git *),WebFetch,WebSearch'], { cwd, env: process.env });
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stderr.on('data', (c) => { err += c; });
  child.on('close', (code) => resolve({ code, text: out.trim() || err.trim() }));
});


// Google Calendar's connector does not load in scheduled tasks, so the calendar is
// read from the "secret address in iCal format" stored in data/config.json.
const CONFIG = path.join(DATA, 'config.json');
const unfold = (text) => text.replace(/\r?\n[ \t]/g, '');
const icsDate = (raw, tzid) => {
  // 20260902T100000Z | 20260902T100000 (TZID) | 20260902 (all-day)
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  if (!m[4]) return { allDay: true, date: `${m[1]}-${m[2]}-${m[3]}` };
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}`;
  if (m[7]) return { allDay: false, at: new Date(`${iso}Z`) };
  // Floating or TZID time: Google exports Europe/Paris events with TZID. Use the
  // machine's zone for anything that is not UTC, which is right for a Mac in Paris.
  return { allDay: false, at: new Date(iso), tzid };
};
const parseIcs = (text) => {
  const events = [];
  let cur = null;
  for (const line of unfold(text).split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const [name, ...params] = line.slice(0, idx).split(';');
    const value = line.slice(idx + 1);
    const tz = params.find((p) => p.startsWith('TZID='))?.slice(5);
    if (name === 'DTSTART') cur.start = icsDate(value, tz);
    else if (name === 'DTEND') cur.end = icsDate(value, tz);
    else if (name === 'SUMMARY') cur.title = value.replace(/\\,/g, ',').replace(/\\n/g, ' ');
    else if (name === 'DESCRIPTION') cur.description = value.replace(/\\,/g, ',').replace(/\\n/g, '\n').slice(0, 600);
    else if (name === 'LOCATION') cur.location = value.replace(/\\,/g, ',');
    else if (name === 'RRULE') cur.rrule = value;
    else if (name === 'EXDATE') (cur.exdates ??= []).push(value.slice(0, 8));
    else if (name === 'ATTENDEE') {
      const cn = params.find((p) => p.startsWith('CN='))?.slice(3);
      const status = params.find((p) => p.startsWith('PARTSTAT='))?.slice(9);
      (cur.attendees ??= []).push({ name: cn ?? value.replace(/^mailto:/i, ''), email: value.replace(/^mailto:/i, ''), status });
    } else if (name === 'STATUS') cur.status = value;
    else if (name === 'UID') cur.uid = value;
  }
  return events;
};
const localYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
// Does a (possibly recurring) event have an occurrence on `day`? Handles the shapes
// Google emits for a team calendar: one-off, DAILY, WEEKLY (with BYDAY), and UNTIL/COUNT-less MONTHLY by day-of-month.
const occursOn = (ev, day) => {
  if (!ev.start || ev.start.allDay) return false;
  const startDay = localYmd(ev.start.at);
  if (!ev.rrule) return startDay === day;
  if (startDay > day) return false;
  if (ev.exdates?.includes(day.replace(/-/g, ''))) return false;
  const rule = Object.fromEntries(ev.rrule.split(';').map((kv) => kv.split('=')));
  if (rule.UNTIL && rule.UNTIL.slice(0, 8) < day.replace(/-/g, '')) return false;
  const target = new Date(`${day}T12:00:00`);
  const interval = Number(rule.INTERVAL ?? 1);
  const days = Math.round((target - new Date(`${startDay}T12:00:00`)) / 86400000);
  if (rule.FREQ === 'DAILY') return days % interval === 0;
  if (rule.FREQ === 'WEEKLY') {
    const byday = rule.BYDAY ? rule.BYDAY.split(',') : [WEEKDAYS[ev.start.at.getDay()]];
    return byday.includes(WEEKDAYS[target.getDay()]) && Math.floor(days / 7) % interval === 0;
  }
  if (rule.FREQ === 'MONTHLY' && !rule.BYDAY) return target.getDate() === ev.start.at.getDate();
  return false;
};
const calendarFor = async (day) => {
  const config = readJson(CONFIG, {});
  if (!config.icsUrl) return { configured: false, events: [] };
  const res = await fetch(config.icsUrl);
  if (!res.ok) throw new Error(`ics fetch failed: ${res.status}`);
  const all = parseIcs(await res.text());
  const me = (config.email ?? '').toLowerCase();
  const events = all.filter((ev) => occursOn(ev, day) && ev.status !== 'CANCELLED')
    .filter((ev) => !me || !ev.attendees?.some((a) => a.email.toLowerCase() === me && a.status === 'DECLINED'))
    .map((ev) => {
      const start = new Date(ev.start.at); start.setFullYear(...day.split('-').map(Number).map((n, i) => (i === 1 ? n - 1 : n)));
      const dur = ev.end?.at ? ev.end.at - ev.start.at : 0;
      const end = new Date(start.getTime() + dur);
      return { start: hhmm(start), end: dur ? hhmm(end) : undefined, title: ev.title ?? '(no title)', location: ev.location, description: ev.description,
        attendees: (ev.attendees ?? []).filter((a) => a.email.toLowerCase() !== me).map((a) => a.name) };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  return { configured: true, events };
};


// Daily artwork. The source is a setting (data/config.json -> artSource) so the page and the
// generator agree; one fetch per day and source is cached in data/art-cache.json.
const ART_CACHE = path.join(DATA, 'art-cache.json');
const ART_SOURCES = ['met', 'cma', 'nasa', 'bing', 'unsplash'];
const dayOfYear = (day) => Math.floor((new Date(`${day}T12:00:00Z`) - new Date(`${day.slice(0, 4)}-01-01T12:00:00Z`)) / 86400000);
const getJson = async (u, headers = {}) => { const r = await fetch(u, { headers }); if (!r.ok) throw new Error(`${u} -> ${r.status}`); return r.json(); };
const headOk = async (u) => { try { const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } }); return r.ok; } catch { return false; } };
const clean = (v) => (v ?? '').toString().replace(/\s+/g, ' ').trim();

const fetchers = {
  async met(day) {
    const ids = (await getJson('https://collectionapi.metmuseum.org/public/collection/v1/search?q=painting&isPublicDomain=true&hasImages=true&departmentId=11')).objectIDs ?? [];
    for (let k = 0; k < 6; k++) {
      const o = await getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${ids[(dayOfYear(day) * 7 + k) % ids.length]}`);
      const m = o.measurements?.[0]?.elementMeasurements;
      if (!o.primaryImage || (m && m.Height > m.Width)) continue;
      return { image: o.primaryImage, title: o.title, artist: o.artistDisplayName, date: o.objectDate, medium: o.medium, link: o.objectURL,
        caption: [o.title, o.artistDisplayName, o.objectDate].filter(Boolean).join(', ') + `. ${clean(o.medium).toLowerCase()}` };
    }
    throw new Error('met: no landscape image');
  },
  async cma(day) {
    const total = (await getJson('https://openaccess-api.clevelandart.org/api/artworks/?type=Painting&has_image=1&cc0=1&limit=1')).info.total;
    const skip = (dayOfYear(day) * 13) % Math.max(1, total - 20);
    const items = (await getJson(`https://openaccess-api.clevelandart.org/api/artworks/?type=Painting&has_image=1&cc0=1&limit=20&skip=${skip}`)).data
      .filter((a) => a.images?.web?.url && Number(a.images.web.width) > Number(a.images.web.height));
    const a = items[0];
    if (!a) throw new Error('cma: no landscape image in this slice');
    const artist = clean(a.creators?.[0]?.description || '').replace(/\s*\(.*\)\s*$/, '');
    return { image: a.images.web.url, title: a.title, artist, date: a.creation_date, medium: a.technique, link: a.url,
      caption: [a.title, artist, a.creation_date].filter(Boolean).join(', ') + `. ${clean(a.technique).toLowerCase()}` };
  },
  async nasa(day) {
    let d = new Date(`${day}T12:00:00Z`);
    for (let k = 0; k < 6; k++) {
      const iso = d.toISOString().slice(0, 10);
      const o = await getJson(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${iso}`).catch(() => null);
      if (o && o.media_type === 'image') return { image: o.url || o.hdurl, title: o.title, artist: clean(o.copyright).split(/Text:|\s{2,}/)[0].trim() || 'NASA', date: iso, medium: 'Astronomy Picture of the Day',
        link: `https://apod.nasa.gov/apod/ap${iso.slice(2).replace(/-/g, '')}.html`, caption: `${o.title}, ${clean(o.copyright).split(/Text:|\s{2,}/)[0].trim() || 'NASA'}, ${iso}. astronomy picture of the day` };
      d = new Date(d - 86400000);
    }
    throw new Error('nasa: no image');
  },
  async bing() {
    const o = (await getJson('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=fr-FR')).images[0];
    const m = o.copyright.match(/^(.*?)\s*\((.*)\)\s*$/);
    return { image: `https://www.bing.com${o.urlbase}_UHD.jpg`, title: m ? m[1] : o.title, artist: m ? m[2].replace(/^©\s*/, '') : '', date: `${o.startdate.slice(0, 4)}-${o.startdate.slice(4, 6)}-${o.startdate.slice(6, 8)}`, medium: 'photograph',
      link: o.copyrightlink, caption: `${m ? m[1] : o.title}. ${m ? m[2] : ''}`.trim() };
  },
  async unsplash(day, config) {
    if (!config.unsplashKey) throw new Error('unsplash: missing access key');
    const o = await getJson('https://api.unsplash.com/photos/random?orientation=landscape&content_filter=high&topics=bo8jQKTaE0Y', { Authorization: `Client-ID ${config.unsplashKey}` });
    const title = clean(o.description || o.alt_description || 'Untitled');
    return { image: `${o.urls.raw}&w=1800&q=80&fm=jpg`, title, artist: o.user.name, date: day, medium: 'photograph', link: `${o.links.html}?utm_source=morning_brief&utm_medium=referral`,
      caption: `${title}. Photo by ${o.user.name} on Unsplash` };
  },
};

const artFor = async (day) => {
  const config = readJson(CONFIG, {});
  const source = ART_SOURCES.includes(config.artSource) ? config.artSource : 'met';
  const cache = readJson(ART_CACHE, {});
  const key = `${day}|${source}`;
  if (cache[key]) return cache[key];
  const art = { source, ...(await fetchers[source](day, config)) };
  if (!(await headOk(art.image))) throw new Error(`${source}: image not reachable`);
  cache[key] = art;
  writeJson(ART_CACHE, cache);
  return art;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'public', 'index.html')), 'text/html; charset=utf-8');
  }



  if (req.method === 'GET' && url.pathname === '/api/art') {
    const day = url.searchParams.get('date') || localYmd(new Date());
    try { return send(res, 200, await artFor(day)); }
    catch (e) { return send(res, 502, { error: e.message }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    const config = readJson(CONFIG, {});
    return send(res, 200, { artSource: ART_SOURCES.includes(config.artSource) ? config.artSource : 'met', hasUnsplashKey: Boolean(config.unsplashKey), sources: ART_SOURCES });
  }

  if (req.method === 'POST' && url.pathname === '/api/settings') {
    const body = await readBody(req);
    const config = readJson(CONFIG, {});
    if (ART_SOURCES.includes(body.artSource)) config.artSource = body.artSource;
    if (typeof body.unsplashKey === 'string') config.unsplashKey = body.unsplashKey.trim();
    writeJson(CONFIG, config);
    return send(res, 200, { artSource: config.artSource ?? 'met', hasUnsplashKey: Boolean(config.unsplashKey), sources: ART_SOURCES });
  }

  if (req.method === 'GET' && url.pathname === '/api/calendar') {
    const day = url.searchParams.get('date') || localYmd(new Date());
    try { return send(res, 200, { date: day, ...(await calendarFor(day)) }); }
    catch (e) { return send(res, 500, { error: e.message }); }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/fonts/')) {
    const file = path.join(ROOT, 'public', 'fonts', path.basename(url.pathname));
    if (!fs.existsSync(file)) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': 'font/woff2', 'cache-control': 'public, max-age=31536000' });
    return res.end(fs.readFileSync(file));
  }

  if (req.method === 'GET' && url.pathname === '/api/brief') {
    const brief = latestBrief();
    const state = readJson(STATE, { done: {} });
    const config = readJson(CONFIG, {});
    return send(res, 200, { brief, done: state.done, name: config.name || '', workdir: config.workdir || path.join(process.env.HOME, 'Documents/GitHub/carbonfact') });
  }

  if (req.method === 'POST' && url.pathname === '/api/todo') {
    const { id, title, done } = await readBody(req);
    if (!id) return send(res, 400, { error: 'id required' });
    const state = readJson(STATE, { done: {} });
    if (done) state.done[id] = { title, doneAt: new Date().toISOString() };
    else delete state.done[id];
    writeJson(STATE, state);
    return send(res, 200, { done: state.done });
  }

  if (req.method === 'POST' && url.pathname === '/api/ask') {
    const { prompt, cwd, lang } = await readBody(req);
    if (!prompt) return send(res, 400, { error: 'prompt required' });
    const workdir = cwd && fs.existsSync(cwd) ? cwd : ROOT;
    const result = await askClaude(`${prompt}\n\nAnswer in ${lang === 'fr' ? 'French' : 'English'}. Be concise: short sentences, a reader who just woke up.`, workdir);
    return send(res, 200, result);
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`morning brief on http://localhost:${PORT}`));
