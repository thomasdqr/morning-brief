#!/bin/zsh
# Pulls the latest version and restarts the local server.
# The routine's prompt is a copy held by the routine, not a link to TASK_PROMPT.md:
# refreshing it needs Claude, which is why UPDATE.md exists.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$DIR" pull --ff-only
"$DIR/scripts/install.sh"
echo
echo "Code updated. Still to do, and only Claude can: refresh the routine prompt from TASK_PROMPT.md,"
echo "and add any new fields to data/config.json. Ask Claude to follow $DIR/UPDATE.md."
