# Morning Brief

![Morning Brief](docs/screenshot.png)

Your day on one page, every weekday morning: what people are waiting on you for, what is due, what is on your calendar, one thing worth pushing forward, and a painting. Generated locally by Claude Code, with your own Claude subscription. No API keys, no server, no account beyond Claude and the apps you already use.

It reads the apps *you* pick, and prioritises based on what *you* do. Slack or Teams, Google Calendar or Outlook, Notion, Jira, Linear, Asana, Confluence, GitHub, GitLab, Figma, HubSpot, and anything else you name. An engineer's brief leads with review requests and broken builds; a salesperson's leads with deals gone quiet and today's calls.

## You need

- A Mac, with the Claude desktop app and Claude Code (any plan that includes Claude Code).
- Node 20+. The GitHub CLI (`gh`) only if you want GitHub or GitLab in your brief.
- The apps you want it to read, connected in the Claude app (Settings, then Connectors).
- Any browser.

## Install in one prompt

Open Claude Code in the Claude desktop app and paste:

```
Set up Morning Brief for me: clone https://github.com/thomasdqr/morning-brief, then read its SETUP.md and follow it step by step.
```

Claude checks your machine, asks what you do and which apps to read, helps you connect any that are missing, installs a small local server, creates the daily routine, and walks you through the few clicks it cannot do for you. About 5 minutes, most of it Claude working.

## Update in one prompt

Already installed? Paste this in Claude Code:

```
Update Morning Brief for me: run `git -C ~/Documents/GitHub/morning-brief pull`, then read UPDATE.md in that folder and follow it step by step.
```

Your briefs and settings live in `data/`, which git never touches. Claude pulls the new code, restarts the local server, adds any config field the new version expects, and refreshes the routine's prompt. That last one matters: the routine keeps its own copy of the prompt, so a plain `git pull` leaves it on the old instructions.

If you prefer the terminal, `scripts/update.sh` does the code and the server, then tells you what is left for Claude.

## Manual install

1. `git clone https://github.com/thomasdqr/morning-brief ~/Documents/GitHub/morning-brief`
2. `~/Documents/GitHub/morning-brief/scripts/install.sh`
3. Copy `config.example.json` to `data/config.json` and fill it in: your name, your `profile` (what kind of work you do), and `tools` (the apps to read). Connect those apps in the Claude app first: Settings, then Connectors.
4. In Claude Code Desktop, create a scheduled task named `morning-brief`, weekdays at 07:30, with the content of `TASK_PROMPT.md` as its prompt.
5. Sidebar → Routines → open `morning-brief`, set its permission mode to Auto (pick a model there too if you want one), then **Run now**. Click **Allow** for each app and file-access prompt once (remembered after).

## How it works

- `PROMPT.md` is the editorial spec: a playbook per app, what to prioritise per profile, how to write it, the JSON shape. A Claude Code Desktop routine reads it every weekday morning and writes `data/briefs/YYYY-MM-DD.json`.
- `data/config.json` is yours: name, `profile`, `tools`, browser. Change `tools` to add or drop an app, change `profile` to change what gets top billing.
- `server.mjs` is a small Node server (no dependencies) that serves the page at `http://localhost:4747`, remembers checked to-dos, and picks the image of the day.
- `public/index.html` is the page itself. Gear icon, top right: language and image source.
- The yellow buttons open a new Claude Code session in the desktop app with the task pre-filled, so you review before anything runs.

## Good to know

- Claude Code Desktop must be open on weekday mornings for the task to fire. If it's closed, the brief is generated the next time you open it.
- Permission mode and model for the task are set once in its Edit form (Routines sidebar), not by the install script. Auto mode avoids an approval prompt on every Slack/Notion/Calendar call each morning.
- A checked to-do is never proposed again.
- Image sources: The Met, Cleveland Museum of Art, NASA picture of the day, Bing photo of the day, Unsplash (needs a free access key from unsplash.com/developers).
- Tools without a bundled logo still work: the brief shows a small lettered badge instead.
- Everything runs and stays on your machine. `data/` (your briefs, your settings) is never committed.
- No telemetry, no external server beyond the public museum/photo APIs the brief pulls from.

---

<sub>Croissant icon by arista septiana dewi via [The Noun Project](https://thenounproject.com/icon/croissant-8252252/).</sub>
