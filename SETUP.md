# Setup runbook (for Claude Code)

You are setting up Morning Brief on this Mac for the person talking to you. Do every step below, in order. Ask only when a step says so. Report what you did at the end in five lines or fewer.

Target folder: `~/Documents/GitHub/morning-brief` (call it `$DIR`). Repository: `carbonfact/morning-brief` (private, use `gh`).

## 1. Check the machine

Run in Bash and fix what you can:

- `uname` must be `Darwin`. If not, stop: Morning Brief is macOS only.
- `node --version` must be 20 or newer. If node is missing, tell the user to install it from https://nodejs.org and stop.
- `gh auth status` must be logged in. If not, tell the user to run `gh auth login` in a terminal, then continue when they confirm.
- `ls /Applications/Claude.app` must exist.

## 2. Check the connectors

Search your own tools (ToolSearch) for `slack`, `notion` and `calendar` tools. For each family that is missing, tell the user: open the Claude app, Settings, Connectors, connect it, then come back. Wait for their confirmation before continuing. Slack and Notion are required. Google Calendar is strongly recommended.

## 3. Get the code

- If `$DIR` does not exist: `gh repo clone carbonfact/morning-brief $DIR`.
- If it exists and is a git repo: `git -C $DIR pull --ff-only`.

## 4. Configure

Ask the user, in one question each (use AskUserQuestion when available):

1. Their first name.
2. The browser to open the brief in, as the app name in /Applications (offer: the default browser, Dia, Arc, Google Chrome, Safari).
3. The repository folder Claude should open when they click "Let's do it" (default `~/Documents/GitHub/carbonfact` if it exists).

Get their email from `git config user.email` or `gh api user --jq .email`; if empty, ask. Then write `$DIR/data/config.json`:

```json
{ "name": "<first name>", "email": "<email>", "role": "engineer at Carbonfact", "browser": "<browser or empty>", "workdir": "<absolute path>", "artSource": "met", "unsplashKey": "", "icsUrl": "" }
```

## 5. Install the local server

Run `$DIR/scripts/install.sh`. It must print `server running: http://localhost:4747`. If it fails, read `/tmp/morning-brief.err` and fix.

## 6. Allow the file writes

Add these rules to `permissions.allow` in `~/.claude/settings.json` (create the array if needed, replace `$DIR` with the absolute path, keep every existing entry):

`Read(//$DIR/**)`, `Write(//$DIR/**)`, `Edit(//$DIR/**)`, `Bash(python3 -m json.tool *)`, `Bash(curl -s *)`, `Bash(gh pr list *)`, `Bash(gh pr view *)`, `Bash($DIR/scripts/open.sh)`.

## 7. Create the scheduled task

Use the scheduled-tasks tool (`create_scheduled_task`) with:

- taskId `morning-brief`
- cronExpression `30 7 * * 1-5`
- description `Generate the Morning Brief from Slack, Notion, Google Calendar and GitHub, then open it in the browser.`
- prompt: the full content of `$DIR/TASK_PROMPT.md`, verbatim.

If a task with that id already exists, update its prompt instead.

## 8. First run

Tell the user, in this order:

1. In the Claude app sidebar, section Scheduled, click **Run now** on `morning-brief`.
2. Click **Allow** each time it asks for Slack, Notion or Google Calendar. This is remembered.
3. In about five minutes the brief opens in their browser at http://localhost:4747.
4. The Claude app must be open on weekday mornings. If it is closed, the brief is generated when they open it.

Then run `$DIR/scripts/open.sh` so they see the page (it shows "No brief yet" until the first run finishes).
