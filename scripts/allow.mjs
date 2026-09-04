// Grants the morning routine standing permission, so it stops asking.
//
// Run this yourself: it edits ~/.claude/settings.json, your own permission file,
// which is exactly the file an agent must not touch on its own. It prints every
// line it will add, keeps a backup, and never removes anything you already have.
//
//   node scripts/allow.mjs          show what would change
//   node scripts/allow.mjs --yes    apply it
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

// Two fixed commands, plus reading and writing inside the install folder.
// Wildcards matter here: per-task approvals match a command byte for byte, so a
// routine that varies its commands never stops asking. These do not.
const rules = [
  `Bash(node ${ROOT}/scripts/*.mjs)`,
  `Read(/${ROOT}/**)`,
  `Write(/${ROOT}/**)`,
  `Edit(/${ROOT}/**)`,
];

const settings = fs.existsSync(SETTINGS) ? JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) : {};
const permissions = settings.permissions ?? {};
const allow = permissions.allow ?? [];
// The "path is outside allowed working directories" guard is not a permission, so
// no allow rule can satisfy it. This is the setting that does.
const dirs = permissions.additionalDirectories ?? [];

const newRules = rules.filter((r) => !allow.includes(r));
const needsDir = !dirs.includes(ROOT);

if (!newRules.length && !needsDir) {
  console.log('Already granted. The routine has standing permission for its own folder and commands.');
  process.exit(0);
}

console.log(`Will add to ${SETTINGS}:\n`);
newRules.forEach((r) => console.log(`  permissions.allow            + ${r}`));
if (needsDir) console.log(`  permissions.additionalDirectories + ${ROOT}`);
console.log('\nNothing is removed, and a backup is written next to the file.');

if (!process.argv.includes('--yes')) {
  console.log('\nRun it for real with:  node scripts/allow.mjs --yes');
  process.exit(0);
}

if (fs.existsSync(SETTINGS)) fs.copyFileSync(SETTINGS, `${SETTINGS}.backup`);
fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
settings.permissions = { ...permissions, allow: [...allow, ...newRules], additionalDirectories: needsDir ? [...dirs, ROOT] : dirs };
fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));

console.log(`\nDone. ${fs.existsSync(`${SETTINGS}.backup`) ? 'Backup: ' + SETTINGS + '.backup' : ''}`);
console.log('The next run should not ask about its commands or its folder. Connectors still ask once each: answer "always allow".');
