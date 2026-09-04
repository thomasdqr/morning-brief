// Opens the brief in the browser named in data/config.json, or the system default.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = `http://localhost:${process.env.PORT || 4747}`;

// Check today's brief parses before opening, so the routine needs no separate
// validation command of its own. A bad file is worth shouting about.
const briefs = path.join(ROOT, 'data', 'briefs');
try {
  const files = fs.readdirSync(briefs).filter((f) => f.endsWith('.json')).sort();
  if (files.length) {
    const latest = path.join(briefs, files[files.length - 1]);
    JSON.parse(fs.readFileSync(latest, 'utf8'));
    console.log(`${latest} is valid JSON`);
  }
} catch (e) {
  console.error(`The latest brief is not valid JSON: ${e.message}`);
  process.exit(1);
}

let browser = '';
try { browser = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'config.json'), 'utf8')).browser || ''; } catch {}

const open = () => {
  if (process.platform === 'darwin') return browser ? ['open', ['-a', browser, url]] : ['open', [url]];
  if (process.platform === 'win32') return browser ? ['cmd', ['/c', 'start', '', browser, url]] : ['cmd', ['/c', 'start', '', url]];
  // Linux: the browser name is a desktop binary, e.g. firefox or google-chrome.
  return browser ? [browser, [url]] : ['xdg-open', [url]];
};

const [cmd, args] = open();
const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
child.on('error', () => {
  // A wrong browser name should not stop the brief from opening.
  const [fb, fbArgs] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  spawn(fb, fbArgs, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
});
child.unref();
