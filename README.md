# Morning Brief

![Morning Brief](docs/screenshot.png)

**Your day on one page, every weekday morning.** Who is waiting on you, what is due, what is on your calendar, the one thing worth pushing forward, and a painting to wake up to.

It reads the apps you already use, and leads with what matters for *your* job. Slack or Teams, your calendar, Notion, Jira, Linear, GitHub, Figma, HubSpot, whatever you name. An engineer opens theirs to review requests and broken builds. A salesperson opens theirs to deals gone quiet and today's calls.

It runs on your own machine, on your own Claude subscription. No API keys, no accounts, nothing leaves your laptop.

## Install it in one prompt

Open Claude Code in the Claude desktop app and paste this:

```
Set up Morning Brief for me: clone https://github.com/thomasdqr/morning-brief, then read its SETUP.md and follow it step by step.
```

Claude asks what you do and which apps to read, connects the ones you are missing, sets everything up, and tells you the two or three things only you can click. About five minutes, most of it Claude working while you watch.

You need a Mac, Windows or Linux machine, the Claude desktop app with Claude Code, and Node 20+.

## Good to know

- It fires every weekday at 7:30, as long as the Claude app is open. Closed at the time? Your brief is waiting the next time you open it.
- Tick a to-do and it never comes back the next day.
- Gear icon, top right: language, light or dark, and where the daily picture comes from.
- The little line at the very bottom tells you when a new version is out. Click it and Claude updates you.
- Tired of it asking permission every morning? Run `node scripts/allow.mjs --yes` once and it stops for good.

<details>
<summary>For the curious: what is actually on your machine, and how to install by hand</summary>

Four files do the work:

- `PROMPT.md` is the editorial brain: a playbook per app, what to lead with per profile, the writing rules, the JSON shape. A Claude Code routine reads it each morning and writes `data/briefs/YYYY-MM-DD.json`.
- `data/config.json` is yours: your name, your `profile` (what kind of work you do), `tools` (which apps to read), your browser. Change those two lists and the brief changes with them.
- `server.mjs` is a dependency-free Node server on `http://localhost:4747`. It serves the page, remembers what you ticked, and picks the picture. `scripts/install.mjs` keeps it alive the way each OS expects: a launchd agent, a systemd user service, or a Startup entry.
- `public/index.html` is the page. The yellow buttons open a fresh Claude Code session with the task written out, so you always review before anything runs.

Manual install:

1. `git clone https://github.com/thomasdqr/morning-brief ~/Documents/GitHub/morning-brief`
2. `node ~/Documents/GitHub/morning-brief/scripts/install.mjs`
3. Copy `config.example.json` to `data/config.json` and fill in `name`, `profile` and `tools`. Connect those apps in the Claude app first: Settings, then Connectors.
4. In Claude Code, create a routine named `morning-brief`, weekdays at 07:30, with the content of `TASK_PROMPT.md` as its prompt.
5. Routines → `morning-brief` → pick a model → **Run now**, and answer **always allow** to each request. That first run is what makes every later one silent.

Two details worth knowing if something misbehaves: the routine keeps its own copy of the prompt, so `git pull` alone leaves it on old instructions (`UPDATE.md` handles that), and on Windows you want Claude Code running natively rather than under WSL, where connectors are unavailable.

Picture sources: The Met, Cleveland Museum of Art, NASA, Bing, or Unsplash with a free key. An app with no bundled logo still works, it just shows a lettered badge.

</details>

---

<sub>Croissant icon by arista septiana dewi via [The Noun Project](https://thenounproject.com/icon/croissant-8252252/).</sub>
