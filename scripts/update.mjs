// Pulls the latest version and restarts the local server.
// The routine's prompt is a copy held by the routine, not a link to TASK_PROMPT.md:
// refreshing it needs Claude, which is why UPDATE.md exists.
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run = (cmd, args) => new Promise((resolve, reject) => {
  execFile(cmd, args, { cwd: ROOT, timeout: 120000 }, (err, stdout, stderr) => {
    process.stdout.write((stdout || '') + (stderr || ''));
    err ? reject(err) : resolve();
  });
});

try {
  await run('git', ['-C', ROOT, 'pull', '--ff-only']);
  await run(process.execPath, [path.join(ROOT, 'scripts', 'install.mjs')]);
} catch {
  console.error('\nUpdate stopped. Fix the error above, or ask Claude to follow UPDATE.md.');
  process.exit(1);
}

console.log(`
Code updated. Still to do, and only Claude can: refresh the routine prompt from TASK_PROMPT.md,
and add any new fields to data/config.json. Ask Claude to follow ${path.join(ROOT, 'UPDATE.md')}.`);
