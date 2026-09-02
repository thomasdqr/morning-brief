#!/bin/zsh
# Opens the brief in the browser named in data/config.json (falls back to the default browser).
DIR="$(cd "$(dirname "$0")/.." && pwd)"
BROWSER=$(python3 -c "import json; print(json.load(open('$DIR/data/config.json')).get('browser',''))" 2>/dev/null)
URL="http://localhost:${PORT:-4747}"
if [ -n "$BROWSER" ] && [ -d "/Applications/$BROWSER.app" ]; then open -a "$BROWSER" "$URL"; else open "$URL"; fi
