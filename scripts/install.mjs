// Installs the local server so it starts now and comes back at login.
// One script for macOS, Linux and Windows: each has its own way of keeping a
// user-level process alive, and Node already knows which one we are on.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const SERVER = path.join(ROOT, 'server.mjs');
const LABEL = 'morning-brief';
const PORT = process.env.PORT || 4747;

const run = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 20000 }, (err, stdout, stderr) => resolve({ ok: !err, out: (stdout || '') + (stderr || '') }));
});
const startDetached = () => {
  const child = spawn(NODE, [SERVER], { detached: true, stdio: 'ignore', windowsHide: true, cwd: ROOT });
  child.unref();
};
const alive = async () => {
  try {
    const r = await fetch(`http://localhost:${PORT}/`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
};

// data/config.json is the user's own; never overwrite it.
fs.mkdirSync(path.join(ROOT, 'data', 'briefs'), { recursive: true });
const config = path.join(ROOT, 'data', 'config.json');
if (!fs.existsSync(config)) {
  fs.copyFileSync(path.join(ROOT, 'config.example.json'), config);
  console.log('Created data/config.json from the example: fill in name, profile and tools.');
}

const installers = {
  async darwin() {
    const plist = path.join(os.homedir(), 'Library', 'LaunchAgents', `com.${LABEL}.server.plist`);
    fs.mkdirSync(path.dirname(plist), { recursive: true });
    fs.writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.${LABEL}.server</string>
  <key>ProgramArguments</key><array><string>${NODE}</string><string>${SERVER}</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>${path.dirname(NODE)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>${os.homedir()}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${path.join(os.tmpdir(), 'morning-brief.log')}</string>
  <key>StandardErrorPath</key><string>${path.join(os.tmpdir(), 'morning-brief.err')}</string>
</dict></plist>
`);
    const domain = `gui/${process.getuid()}`;
    await run('launchctl', ['bootout', `${domain}/com.${LABEL}.server`]);
    const boot = await run('launchctl', ['bootstrap', domain, plist]);
    return boot.ok ? 'launchd agent installed' : `launchctl failed: ${boot.out.trim()}`;
  },

  async linux() {
    const unitDir = path.join(os.homedir(), '.config', 'systemd', 'user');
    const systemd = await run('systemctl', ['--user', '--version']);
    if (!systemd.ok) {
      startDetached();
      return 'started in the background (no systemd found, so it will not come back after a reboot)';
    }
    fs.mkdirSync(unitDir, { recursive: true });
    fs.writeFileSync(path.join(unitDir, `${LABEL}.service`), `[Unit]
Description=Morning Brief local server

[Service]
ExecStart=${NODE} ${SERVER}
Restart=always
WorkingDirectory=${ROOT}

[Install]
WantedBy=default.target
`);
    await run('systemctl', ['--user', 'daemon-reload']);
    const en = await run('systemctl', ['--user', 'enable', '--now', `${LABEL}.service`]);
    // Without this the unit only runs while the user is logged in.
    await run('loginctl', ['enable-linger', os.userInfo().username]);
    return en.ok ? 'systemd user service installed' : `systemctl failed: ${en.out.trim()}`;
  },

  async win32() {
    // A .vbs in the Startup folder runs node with no console window, and needs no admin.
    const startup = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
    fs.mkdirSync(startup, { recursive: true });
    const vbs = path.join(startup, `${LABEL}.vbs`);
    fs.writeFileSync(vbs, `Set s = CreateObject("WScript.Shell")\r\ns.Run """${NODE}"" ""${SERVER}""", 0, False\r\n`);
    startDetached();
    return `startup entry written to ${vbs}`;
  },
};

const installer = installers[process.platform];
if (!installer) {
  console.error(`Unsupported platform: ${process.platform}. Run "node server.mjs" yourself and keep it running.`);
  process.exit(1);
}

const how = await installer();
for (let i = 0; i < 12 && !(await alive()); i++) await new Promise((r) => setTimeout(r, 500));

if (await alive()) {
  console.log(`server running: http://localhost:${PORT} (${how})`);
} else {
  console.error(`server did not start (${how}).`);
  console.error(`Try running it in the foreground to see why: "${NODE}" "${SERVER}"`);
  process.exit(1);
}
