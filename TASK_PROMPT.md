Generate today's Morning Brief.

`<install>` is the Morning Brief folder: by default ~/Documents/GitHub/morning-brief, or %USERPROFILE%\Documents\GitHub\morning-brief on Windows.

Read `<install>/PROMPT.md` and follow it exactly. It tells you who this brief is for and what they do, which apps to read, the editorial rules (short bilingual en/fr texts, avatars), the JSON shape, and where to write the file.

Only two shell commands are allowed in this run, exactly as written, no variations:

```
node <install>/scripts/collect.mjs
node <install>/scripts/open.mjs
```

The first gives you everything local in one JSON: date, config, ticked-off to-dos, yesterday's open ids, today's artwork, the calendar fallback, and your pull requests. The second validates what you wrote and opens the page. Improvising any other shell command (`cat`, `curl`, `gh`, `python3`, `ls`) makes this run stop and ask for permission, which defeats an unattended routine. If you need something those two commands do not provide, use a connector or the Read tool, or leave it out and say so in `notes`.

Rules that always apply:
- Read the apps listed in `config.tools`, and only those. If one is configured but its connector is missing from this session, skip it and note it.
- Read-only on every external service. Never send a message, never edit or assign a task, never comment, never create or change a calendar event.
- Never propose a to-do that appears in the `alreadyDone` list from the first command, by id or by an equivalent subject.
- If a source is unreachable, skip it and note it in the `notes` array. Never invent items.
- Reply with one line: the path written, the number of to-dos, the number of events.
