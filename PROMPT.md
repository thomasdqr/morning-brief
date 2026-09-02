# Morning Brief: generation spec

You are generating today's Morning Brief for the user described in `~/Documents/GitHub/morning-brief/data/config.json` (`name`, `email`, `role`). Read it first. Below, "the user" means that person.
The brief is shown in a local web page. You produce ONE JSON file. Nothing else.

## Steps

1. Compute today's date in Europe/Paris. `DATE` = `YYYY-MM-DD`. `WEEKDAY` = English weekday name.
2. Read `~/Documents/GitHub/morning-brief/data/state.json` if it exists. Its `done` map lists to-dos the user already checked off (id -> {title, doneAt}). NEVER propose a to-do again if its `id` or a clearly identical subject is in `done`.
3. Read the previous brief, the most recent file in `~/Documents/GitHub/morning-brief/data/briefs/`, if any. Reuse the same `id` for a to-do that is still open, so state carries over.
4. Gather signals, read-only (never post, send, or modify anything):
   - Calendar: use the Google Calendar connector (`list_events` on the primary calendar, today 00:00 to 23:59 Europe/Paris, ordered by start time). Skip all-day events and events the user declined. Fallback if the connector tool is absent: run `curl -s http://localhost:4747/api/calendar` in Bash, which reads an iCal feed when `data/config.json` has an `icsUrl`. If both fail, note it in `notes`.
   - Slack: last 48h: messages mentioning the user, DMs to the user, replies in threads he posted in. Note who asked what, and whether the user already replied. Fetch the Slack profile of each person you name to get their avatar image URL (`image_72` or similar).
   - Notion: tasks assigned to the user that are not done, comments mentioning him. Use the Notion users list to get each person's `avatar_url`.
   - GitHub (run `gh` in Bash, repo carbonfact/carbonfact): `gh pr list --author @me`, `gh pr list --search "review-requested:@me"`, and his PRs with review comments in the last 24h.
5. Artwork: run `curl -s http://localhost:4747/api/art` in Bash and copy the returned object into `art` as is (it already honours the image source chosen in the page settings). If the call fails, retry once, then leave `art` out and note it in `notes`.
6. Write the JSON to `~/Documents/GitHub/morning-brief/data/briefs/DATE.json`. Validate with `python3 -m json.tool`. Then run `~/Documents/GitHub/morning-brief/scripts/open.sh` (opens the brief in the browser set in config).

## Editorial rules: short, for someone who just woke up

- Every text field is an object `{ "en": "...", "fr": "..." }`. Same meaning in both. French is natural French, not a word-for-word translation. `tu` form. Address the user by their first name only when it reads naturally.
- Titles: max 8 words. One concrete action or fact. No trailing period.
- Bodies: ONE sentence, max 15 words. Who, what, since when. Nothing else.
- `summary`: one sentence, max 18 words: the shape of the day.
- No emoji. No em dashes. No jargon a sleepy reader would trip on.
- `focus`: the single most valuable piece of work to push today (a bet, a PR, a plan the user owns). `prompt` is a complete, self-contained instruction in English that a fresh Claude session could act on (names, links, numbers, file paths). It is not shown, so it can be long.
- `todos`: 3 to 6 items, most urgent first. Optional `tag`: a short project or area name ("Carbonfact Method", "Guided Flows"), plain string. `source` is one of `slack`, `notion`, `github`, `calendar`. `id` is a stable kebab-case slug from the subject, not from the date. `people` lists the humans involved with `name` and, when found, `avatar` (https URL). Include `url` (Slack permalink, Notion page URL, PR URL) when you have one.
- `updates`: 0 to 4 things that changed and the user should know but need not act on. `tag` is a short project or bet name.
- `events`: today's events, chronological, 24h `HH:MM`. `people` like todos. `prepPrompt` is a self-contained English instruction to prepare the user for that meeting. Not shown.
- If a source is unreachable, leave its items out and add a short note in `notes` (plain string, English). Never invent items.

## JSON shape

```json
{
  "date": "2026-09-02",
  "weekday": "Wednesday",
  "generatedAt": "2026-09-02T07:31:00+02:00",
  "summary": { "en": "Nearly empty Wednesday, one 10am huddle then a clear runway.", "fr": "Mercredi presque vide, un point à 10h puis la voie est libre." },
  "art": { "source": "met", "image": "https://images.metmuseum.org/...", "title": "For the Track", "artist": "John Frederick Peto", "date": "1895", "medium": "Oil on canvas", "link": "https://www.metmuseum.org/art/collection/search/...", "caption": "For the Track, John Frederick Peto, 1895. oil on canvas" },
  "focus": {
    "title": { "en": "Draft the PDF extraction plan", "fr": "Rédiger le plan d'extraction PDF" },
    "body": { "en": "Martin flagged ZIMM's 4,112-page load; you own the bet.", "fr": "Martin a signalé les 4 112 pages de ZIMM ; le bet est à toi." },
    "prompt": "Draft a plan for ... (long, English, self-contained)"
  },
  "todos": [
    { "id": "answer-capucine-faq-fields", "source": "slack", "url": "https://carbonfact.slack.com/archives/...",
      "title": { "en": "Answer Capucine on FAQ field visibility", "fr": "Répondre à Capucine sur les champs FAQ" },
      "body": { "en": "Asked yesterday, Gaby routed it to you, no reply yet.", "fr": "Demandé hier, Gaby te l'a transmis, pas encore de réponse." },
      "people": [ { "name": "Capucine", "avatar": "https://avatars.slack-edge.com/..." }, { "name": "Gaby" } ] }
  ],
  "updates": [
    { "title": { "en": "...", "fr": "..." }, "tag": "Data Lineage", "source": "slack", "url": "https://...",
      "body": { "en": "...", "fr": "..." }, "people": [ { "name": "Fabien", "avatar": "https://..." } ] }
  ],
  "events": [
    { "start": "10:00", "end": "10:15", "title": { "en": "...", "fr": "..." }, "body": { "en": "...", "fr": "..." },
      "people": [ { "name": "Patricija", "avatar": "https://..." } ], "url": "https://meet.google.com/...", "prepPrompt": "..." }
  ],
  "notes": []
}
```
