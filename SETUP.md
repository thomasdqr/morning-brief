# Setup runbook (for Claude Code)

You are installing Morning Brief on this machine for the person talking to you. It runs on macOS, Linux and Windows; check `process.platform` or `uname` early and use the right paths and commands throughout. They may not be a developer: never assume they know git, JSON, or the terminal. Do the steps in order, explain each manual click in plain words, and wait when a step says to wait. Report what you did at the end in five lines or fewer.

Target folder: `~/Documents/GitHub/morning-brief`, or `%USERPROFILE%\Documents\GitHub\morning-brief` on Windows. Call it `$DIR`. Repository: `https://github.com/thomasdqr/morning-brief`.

## 1. Check the machine

- `node --version` must be 20 or newer. If node is missing, tell them to install it from https://nodejs.org, then stop.
- The Claude desktop app must be installed, since the daily routine lives there. macOS: `/Applications/Claude.app`. Windows: under `%LOCALAPPDATA%\Programs` or the Start menu. Linux: the `claude` desktop entry or package. If you cannot find it, ask them rather than assuming.
- `git --version` must work, since the install is a clone and the version check reads it.
- `gh auth status`: only needed if they pick GitHub in step 3. If it fails then, tell them to run `gh auth login` in a terminal.
- On Windows, if this session is running inside WSL, say so and ask them to redo it in a native Windows session: connectors are not available under WSL, and the brief needs them.

## 2. Who is this brief for

Ask with AskUserQuestion, one question at a time:

1. Their first name.
2. What kind of work they do, which decides what the brief prioritises. Offer: Engineering, Design, Product, Sales, Marketing, Support, Ops, Management. Map the answer to one of these `profile` values: `engineer`, `designer`, `product`, `sales`, `marketing`, `support`, `ops`, `management`, `other`.
3. Their job title in their own words, for the `role` field (e.g. "Account Executive"). One short line.

Get their email from `git config user.email`; if empty, ask.

## 3. Which tools should the brief read

Ask with AskUserQuestion, multiSelect, phrased as "Which apps should your brief look at each morning?". Offer the ones that match their profile first, and always include the chat and calendar options:

| Offer | `tools` id |
|---|---|
| Slack | `slack` |
| Microsoft Teams | `teams` |
| Google Calendar | `gcal` |
| Outlook (mail + calendar) | `outlook` |
| Gmail | `gmail` |
| Notion | `notion` |
| Confluence | `confluence` |
| Jira | `jira` |
| Linear | `linear` |
| Asana | `asana` |
| GitHub | `github` |
| GitLab | `gitlab` |
| Figma | `figma` |
| HubSpot | `hubspot` |

Any other tool they name: use a lowercase one-word id. It still works, it just shows a lettered badge instead of a logo.

A brief needs at least one source. Push back once if they pick none.

## 4. Connect what is missing

For each tool they picked, search your own tools (ToolSearch) for that name to see whether its connector is already available in this session. Then:

- Tools already available: tell them which ones, in one line. Nothing to do.
- Tools missing a connector: walk them through it, one at a time, in plain words:
  1. Open the Claude app.
  2. Go to Settings, then Connectors. In some versions this lives under the Customize panel, in the same list as extensions.
  3. Find the tool, click Connect, and sign in when the browser opens.
  4. Come back here and say done.

  Then wait for their confirmation before continuing. Do not create the routine while a picked tool is unconnected: check again with ToolSearch after they confirm, and if it is still missing, offer to either retry or drop that tool from the list.

Keep only the tools that are actually reachable in the final `tools` list, and tell them plainly which ones you dropped.

## 5. Get the code

- If `$DIR` does not exist: `git clone https://github.com/thomasdqr/morning-brief $DIR`.
- If it exists and is a git repo: `git -C $DIR pull --ff-only`.

## 6. Configure

Ask two last questions:

1. Which browser to open the brief in. Empty means the system default, which is the right answer for most people. If they name one, write what their OS needs: the app name on macOS (`Dia`, `Arc`, `Google Chrome`), the binary on Linux (`firefox`, `google-chrome`), the executable on Windows (`chrome`, `msedge`).
2. Only if they picked `github` or `gitlab`: which repo folder Claude should open when they click the yellow button. Default to the current working directory if it looks like a git repo. Otherwise leave `workdir` empty.

Write `$DIR/data/config.json` (create `$DIR/data` if needed):

```json
{ "name": "<first name>", "email": "<email>", "role": "<their words>", "profile": "<profile id>", "tools": ["<tool ids they picked and that work>"], "browser": "<browser or empty>", "workdir": "<absolute path or empty>", "artSource": "met", "unsplashKey": "", "icsUrl": "" }
```

## 7. Install the local server

Run `node $DIR/scripts/install.mjs`. It must print `server running: http://localhost:4747`. It picks the right mechanism per platform: a launchd agent on macOS, a systemd user service on Linux, a Startup entry on Windows. If it fails, it prints the command to run the server in the foreground so you can see the real error. Explain in one line what it did: a small local server that shows the page and remembers which to-dos they ticked.

## 8. Create the routine

Use the scheduled-tasks tool (`create_scheduled_task`) with:

- taskId `morning-brief`
- cronExpression `30 7 * * 1-5`
- description `Generate the Morning Brief, then open it in the browser.`
- prompt: the full content of `$DIR/TASK_PROMPT.md`, verbatim.

If a task with that id already exists, update its prompt instead of creating a new one.

Do NOT try to edit `~/.claude.json` or `~/.claude/settings.json`. It is not needed, and Claude Code blocks an agent editing its own permission files.

## 9. Walk them through the two settings you cannot set

Permission mode and model are not part of `create_scheduled_task`; they exist only in the routine's own Edit form. Say this, plainly:

1. In the Claude app sidebar, open **Routines** and click `morning-brief`.
2. Set its permission mode to **Auto**. Explain why in one line: on the default setting it stops and asks permission for every single call to Slack, the calendar, and so on, which means dozens of clicks every morning.
3. While there, pick the model they want it to use. Nothing is chosen for them.

Wait for them to say it is done.

## 10. First run

Then tell them, in this order:

1. Still on the routine, click **Run now**.
2. The first run asks permission a few times: once per connected app, and once to read and write files in the morning-brief folder. Click **Allow** each time. These are remembered for this routine, so tomorrow it runs silently.
3. It takes about five minutes. When it finishes, the brief opens in their browser at http://localhost:4747.
4. From then on it runs by itself every weekday at 07:30, as long as the Claude app is open. If the app is closed at that time, the brief is generated the next time they open it.

Then run `node $DIR/scripts/open.mjs` so they see the page now. Warn them it says "No brief yet" until the first run finishes.

## 11. Tell them how to change their mind

Close with the two things they are most likely to want later:

- The gear icon at the top right of the page: language, light or dark, and the daily image source.
- To add or remove an app from the brief, or change what it prioritises: ask Claude to edit `data/config.json` in the morning-brief folder (`tools` and `profile`).
