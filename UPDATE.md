# Update runbook (for Claude Code)

You are updating an existing Morning Brief install on this machine. The person may not be a developer: explain each step in plain words and never leave them with a half-updated install. Their brief history and settings live in `data/`, which is not tracked by git, so nothing of theirs is at risk.

Folder: `~/Documents/GitHub/morning-brief` (call it `$DIR`).

Report at the end, in five lines or fewer: what changed, and anything they still need to click.

## 1. Get the new code

Run `git -C $DIR pull --ff-only`.

- If it fails because they have local edits: show what changed (`git -C $DIR status --short`), and ask whether to keep those edits (stash, pull, reapply) or discard them. Never discard without asking.
- If it fails because the branch diverged, say so and stop rather than guessing.

## 2. Restart the local server

Run `node $DIR/scripts/install.mjs`. It must print `server running: http://localhost:4747`. It leaves `data/config.json` alone, works on macOS, Linux and Windows, and is what picks up any change to `server.mjs`.

## 3. Fill in config fields the new version expects

Read `$DIR/data/config.json` and compare its keys with `$DIR/config.example.json`. For each key present in the example but missing from theirs, add it. Two need them to decide, so ask (AskUserQuestion), and explain why in one line:

- `profile`: what kind of work they do, which decides what the brief puts first. Offer Engineering, Design, Product, Sales, Marketing, Support, Ops, Management, and map to `engineer`, `designer`, `product`, `sales`, `marketing`, `support`, `ops`, `management`, `other`.
- `tools`: which apps the brief should read. Check with ToolSearch which connectors this session actually has, offer those first, and see `SETUP.md` step 3 for the id per app.

Everything else: copy the example's default. Never overwrite a value they already have.

## 4. Refresh the routine prompt

This is the step a plain `git pull` cannot do, and the one most likely to be forgotten: the routine holds its own copy of the prompt, not a link to the file. Read `$DIR/TASK_PROMPT.md` and pass its full content, verbatim, to `update_scheduled_task` for taskId `morning-brief`.

If no such routine exists, they never finished setup: switch to `SETUP.md` from step 8 and say so.

## 5. Check it still works

- `curl -s -o /dev/null -w "%{http_code}" http://localhost:4747/api/brief` must be 200.
- Run `node $DIR/scripts/open.mjs` so they see the page. Tell them to reload the tab if it was already open, since the page is cached in the browser.
- Their existing brief for today still shows: the update does not regenerate it. Tomorrow's run uses the new version. If they want to see the new version now, tell them to click **Run now** on the routine.

## 6. Mention what is new, briefly

Read the recent commit subjects (`git -C $DIR log --oneline -15`) and tell them in two or three lines what they gained, in plain words. Skip refactors and internal cleanups; they only care about what they will notice.
