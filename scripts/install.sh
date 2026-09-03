#!/bin/zsh
# Installs the local server as a launchd agent for the current user (starts now, restarts at login).
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node || true)"
[ -n "$NODE" ] || { echo "node not found. Install Node 20+ first (https://nodejs.org or nvm)."; exit 1; }
[ -f "$DIR/data/config.json" ] || { mkdir -p "$DIR/data/briefs"; cp "$DIR/config.example.json" "$DIR/data/config.json"; echo "Created data/config.json from the example: edit name, email, browser, workdir."; }
LABEL=com.morning-brief.server
PLIST=~/Library/LaunchAgents/$LABEL.plist
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$DIR/server.mjs</string></array>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>$(dirname "$NODE"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/morning-brief.log</string>
  <key>StandardErrorPath</key><string>/tmp/morning-brief.err</string>
</dict></plist>
PL
launchctl bootout gui/$(id -u)/$LABEL 2>/dev/null || true
launchctl bootstrap gui/$(id -u) "$PLIST"
sleep 1.5
curl -sf -o /dev/null http://localhost:4747/ && echo "server running: http://localhost:4747" || { echo "server did not start, see /tmp/morning-brief.err"; exit 1; }
