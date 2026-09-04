# Morning Brief: generation spec

You are generating today's Morning Brief for the person described in `<install>/data/config.json`, where `<install>` is the Morning Brief folder, by default `~/Documents/GitHub/morning-brief` (`%USERPROFILE%\Documents\GitHub\morning-brief` on Windows). Read that file first: `name`, `email`, `role`, `profile` (what kind of work they do) and `tools` (which apps to read). Below, "the user" means that person.
The brief is shown in a local web page. You produce ONE JSON file. Nothing else.

## Steps

1. Run this one command, exactly as written, and read its JSON output:

   ```
   node <install>/scripts/collect.mjs
   ```

   It hands you everything this machine can tell you: today's date and weekday, the person's config (`name`, `role`, `profile`, `tools`), the to-dos they already ticked off, the ids of to-dos still open from yesterday, the artwork for today, the calendar fallback if a calendar is configured, and their open pull requests and review requests if a git forge is configured. Do not re-read those files yourself, and do not run `gh`, `curl` or `cat` on your own: this command is approved once and then never asks again, whereas every improvised shell command asks for permission and stalls the run.

2. Gather what only the connectors can give you: the apps in `config.tools`, and only those. Read-only: never post, send, assign, comment, or modify anything anywhere. Use the playbook below. If a tool is configured but its connector is missing from this session, skip it and say so in `notes`. If `config.tools` is missing or empty (a config written before tools existed), fall back to every chat, calendar and task connector you do have, and say so in `notes`. Same for a missing `profile`: use the `other` rules.

3. NEVER propose a to-do that appears in `alreadyDone`, by id or by a clearly identical subject. Reuse the ids in `openFromPreviousBrief` for anything still open, so ticking a box keeps working across days.

4. Write the JSON to the `writeBriefTo` path the command gave you. Copy its `art` object into `art` as is.

5. Run this one command, exactly as written:

   ```
   node <install>/scripts/open.mjs
   ```

   It checks your file parses and then opens the brief in the browser from the config. If it reports invalid JSON, fix the file and run it again.

## Tool playbook

Each item you emit carries a `source`: the tool id it came from, exactly as written in `config.tools`.

| Tool id | What to read, last 48h unless stated | Look for |
|---|---|---|
| `slack` / `teams` | Messages mentioning the user, DMs, replies in threads they posted in | Who asked what, and whether the user already answered. Fetch each named person's avatar URL when the API offers one |
| `gcal` / `outlook` | Today's events, 00:00 to 23:59 local, ordered by start. If the connector is missing, step 1's `calendarFallback` may hold them | Skip all-day events and ones the user declined. Note attendees and whether the user has not replied yet |
| `gmail` | Unread or recent mail addressed directly to the user | Threads waiting on their reply. Ignore newsletters and automated notifications |
| `notion` / `confluence` | Pages and tasks assigned to the user, comments mentioning them | Not-done tasks, overdue dates, questions left on their pages |
| `jira` / `linear` / `asana` | Issues assigned to the user, and ones they reported that moved | Due or overdue, blocked, waiting on them, changed status since yesterday |
| `github` / `gitlab` | Already in step 1's output (`github.myOpenPrs`, `github.reviewsRequestedOfMe`). Use the connector only for review comments it does not cover | Their open PRs, reviews requested of them, new review comments |
| `figma` | Files and comments where they are mentioned | Comments awaiting an answer, review requests |
| `hubspot` / other CRM | Deals and contacts they own | Stalled deals, tasks due, follow-ups promised |

Any tool id not in this table: read the obvious "assigned to me / mentions me / due today" surfaces, and treat it like the closest row above.

## What matters depends on the profile

`config.profile` decides what belongs in the brief. Same rule everywhere: something a person is waiting on, or a deadline, beats an FYI.

- `engineer`: PRs waiting on them, broken builds, blocked tickets, the one piece of code worth pushing forward today.
- `designer`: files and comments awaiting feedback, handoffs blocked on a spec, reviews scheduled today.
- `product`: decisions others are blocked on, specs due, tickets missing acceptance criteria, meetings needing an agenda.
- `sales`: deals gone quiet, follow-ups promised, calls today and what was said last time.
- `marketing`: launches dated today or this week, content awaiting review, campaign numbers someone asked about.
- `support`: tickets breaching soon, escalations, bug reports that need an owner.
- `ops`: approvals waiting on them, recurring deadlines, processes stuck at their step.
- `management`: people blocked on their decision, one-on-ones today, commitments made to others.
- `other` or unset: prefer anything where a named person is waiting on the user, then anything with a date today or overdue.

## Editorial rules: short, for someone who just woke up

- Every text field is an object `{ "en": "...", "fr": "..." }`. Same meaning in both. French is natural French, not word for word. `tu` form. Use the user's first name only when it reads naturally.
- Titles: max 8 words. One concrete action or fact. No trailing period.
- Bodies: ONE sentence, max 15 words. Who, what, since when. Nothing else.
- `summary`: one sentence, max 18 words: the shape of the day.
- No emoji. No em dashes. No jargon a sleepy reader would trip on. No internal codes the user would not recognise instantly.
- `focus`: the single most valuable piece of work to push today, judged by the profile rules above. `prompt` is a complete, self-contained instruction in English that a fresh Claude session could act on (names, links, numbers, file paths). It is not shown, so it can be long.
- `todos`: 3 to 6 items, most urgent first. Optional `tag`: a short project or area name. `id` is a stable kebab-case slug from the subject, not from the date. `people` lists the humans involved with `name` and, when found, `avatar` (https URL). Include `url` (deep link into the source app) when you have one.
- `updates`: 0 to 4 things that changed and the user should know but need not act on.
- `events`: today's events, chronological, 24h `HH:MM`. `people` like todos. `prepPrompt` is a self-contained English instruction to prepare the user for that meeting. Not shown.
- If a source is unreachable, leave its items out and add a short note in `notes` (plain string, English). Never invent items.

## JSON shape

```json
{
  "date": "2026-09-02",
  "weekday": "Wednesday",
  "generatedAt": "2026-09-02T07:31:00+02:00",
  "summary": { "en": "Light Wednesday, one design sync at 10am then a clear runway.", "fr": "Mercredi léger, un point design à 10h puis la voie est libre." },
  "art": { "source": "met", "image": "https://images.metmuseum.org/...", "title": "For the Track", "artist": "John Frederick Peto", "date": "1895", "medium": "Oil on canvas", "link": "https://www.metmuseum.org/art/collection/search/...", "caption": "For the Track, John Frederick Peto, 1895. oil on canvas" },
  "focus": {
    "source": "linear",
    "title": { "en": "Draft the Q3 roadmap doc", "fr": "Rédiger le doc de roadmap Q3" },
    "body": { "en": "Priya asked for a first draft before Friday's planning review.", "fr": "Priya a demandé un premier jet avant la revue de vendredi." },
    "prompt": "Draft a first version of the Q3 roadmap doc. Context: ... (long, English, self-contained)"
  },
  "todos": [
    { "id": "answer-alex-on-access", "source": "slack", "url": "https://example.slack.com/archives/...", "tag": "Onboarding",
      "title": { "en": "Answer Alex on the access request", "fr": "Répondre à Alex sur la demande d'accès" },
      "body": { "en": "Asked yesterday, Sam routed it to you, no reply yet.", "fr": "Demandé hier, Sam te l'a transmis, pas encore de réponse." },
      "people": [ { "name": "Alex", "avatar": "https://..." }, { "name": "Sam" } ] }
  ],
  "updates": [
    { "title": { "en": "...", "fr": "..." }, "tag": "Roadmap", "source": "jira", "url": "https://...",
      "body": { "en": "...", "fr": "..." }, "people": [ { "name": "Jordan", "avatar": "https://..." } ] }
  ],
  "events": [
    { "start": "10:00", "end": "10:30", "source": "gcal", "title": { "en": "...", "fr": "..." }, "body": { "en": "...", "fr": "..." },
      "people": [ { "name": "Robin", "avatar": "https://..." } ], "url": "https://meet.google.com/...", "prepPrompt": "..." }
  ],
  "notes": []
}
```
