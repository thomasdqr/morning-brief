Generate today's Morning Brief.

Read the file PROMPT.md in the Morning Brief folder (by default ~/Documents/GitHub/morning-brief, or %USERPROFILE%\Documents\GitHub\morning-brief on Windows) and follow it exactly. Call that folder <install>. It tells you who this brief is for and what they do (data/config.json: `profile`, `role`), which apps to read (`tools` in the same file, with a playbook per tool), how to get the artwork (a local curl call), the editorial rules (short bilingual en/fr texts, avatars), the JSON shape, and where to write the file (<install>/data/briefs/YYYY-MM-DD.json).

Rules that always apply:
- Read the apps listed in `config.tools`, and only those. If one is configured but its connector is missing from this session, skip it and note it.
- Read-only on every external service. Never send a message, never edit or assign a task, never comment, never create or change a calendar event.
- If a calendar is configured but its connector is absent, fall back to `curl -s http://localhost:4747/api/calendar` as PROMPT.md describes.
- Never propose a to-do whose id or title is in the `done` map of <install>/data/state.json.
- If a source is unreachable, skip it and note it in the `notes` array. Never invent items.
- Validate that the file you wrote parses: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1]))" <the file>`.
- When the file is written, run: node <install>/scripts/open.mjs
- Reply with one line: the path written, the number of to-dos, the number of events.
