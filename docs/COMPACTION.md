# Compacting the build session

The long-running Claude Code session that builds this repo compacts its context now and then.
This file says what the summary must keep, what it can drop, where to find what it dropped,
and how to carry on afterwards, so the work continues as if nothing happened.

**How to use it:** run `/compact` followed by everything under [The prompt](#the-prompt).
After compaction, the session follows [Resuming](#resuming-after-compaction), and
[Re-expanding](#re-expanding-what-the-summary-dropped) when it needs a detail back.

Sections 3, 4 and 5 are a snapshot (2026-10-14, after PR #75); refresh them before each
compaction in a small docs PR. This repo is public: nothing here may contain Kai's job-search
data (no real companies, people, salaries or notes).

---

## The prompt

Summarise this session so work continues without asking Kai anything a sensible default
answers. Keep everything in sections 1–8 below, quoting Kai verbatim where quoted. Keep ids,
paths, ports, branch names, PR numbers, commit hashes and commands exact. Keep the last few
user messages word for word, with what was done about each, and anything promised but not yet
done. Drop what section 9 says. End with section 10: the resume steps and one line saying the
next action.

### 1. Standing instructions from Kai

`CLAUDE.md` in the repo is the source of truth and wins on any conflict. Carry these:

- **Keep going.** "keep going. im going afk. you have enough to work on for ages, you'll hit a
  rate limit before you finish. just wait it out." On a rate limit, wait about 30 minutes and
  retry. The roadmap is finished; new work comes from Kai's feedback.
- **Commits.** "commit small and frequently and often". Conventional Commits, one logical unit
  each, push after committing. End every commit message with
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` and every PR body with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **PRs.** One worktree and PR per task, branch `worktree-<name>`. Claude merges its own PRs
  with `gh pr merge N --merge --delete-branch` after a reviewer pass, fixing every `must_fix`,
  the reasonable `should_fix` and the cheap nits. Docs-only PRs may skip review; a large docs
  change gets a fact-check reviewer. Kai: "merge once ready and update local main".
- **Branches.** "also delete branches on remote that are no longer needed". After each merge
  only `main` should remain, locally and on GitHub.
- **PM dashboard.** "keep the PM dashboard up to date, or even backfill items if they were not
  added". Every task gets a `docs/ROADMAP.yaml` entry in phase P7 (id = branch name minus
  `worktree-`, `prd: docs/prd/tracker.md`, `depends` on real task ids) in the PR that builds
  it, `status: building`, set to `done` just before merging. `uv run pytest -q tests/pm`
  checks the file still parses.
- **Docs and images.** "ensure docs are up to date, readme, images, etc". Every PR that adds or
  changes a feature, command, setting or data-folder behaviour updates `docs/guide/`, the
  README row (and its text and alt text), `llms.txt` and `CHANGELOG.md` in the same PR,
  checked against the code. When a change is visible in a README screenshot (or a `demo.gif`
  frame), retake it. The website (`website/`) copies the screenshots, so it follows.
- **Show before applying.** "i want to see the new gif(s) before you apply them"; "i want to be
  able to have it running asap so i can follow the progretss/chagnes in a browser with
  hotreloading". For visual or generated things (GIFs, the website, colour schemes), give Kai
  a preview first: a local server they can open, or files to look at, with options to choose.
- **Visibility.** After each merge: fast-forward main, rebuild the frontend on main, and say in
  a line what's now live. If the backend changed (a migration, a new or changed API), Kai must
  Ctrl+C and rerun `uv run jat serve` in their terminal; a frontend-only change needs a page
  refresh.
- **Version and status.** "it is ready, im using it. i just havent bumped a version number to
  the first major release". Don't bump the version or tag a release unless Kai asks. Docs say
  "ready and in daily use (0.1.0, not yet bumped to 1.0)".
- **Privacy.** Kai's data never enters this repo. Tests, fixtures, seed data and screenshots use
  fictional names (Contoso, Fabrikam, Litware, Northwind Talent, Northwind Pay, Blue Yonder
  Recruitment, Alex Morgan, Riley Chen, Sam Patel, Jordan Lee…) and example.com. Never act on
  Kai's real data folder beyond reading status (`/api/v1/backup`, `git log`/`status`, a GET to
  check a migration or endpoint is live, e.g. `/api/openapi.json`); never POST, PATCH or
  DELETE against Kai's tracker. Kai's screenshots show real names: never copy them
  into the repo, commits or PRs.
- **Scope cuts.** No job searching or scraping, no quick-add from URLs, no MCP server, no
  `.ics` export.
- **Outward-facing changes** (repo settings, Pages, description, topics, publishing) need Kai's
  yes first. Given so far: the description and topics ("Yes make the chnages"); Pages, the
  repo's Website field and the README link ("merge it, setup github pages, update the repo url
  to point to the pages").
- **Documents** go in the repo, not artifacts. Deleting anything of Kai's needs confirmation.
- **No agent-team skill in this repo.** Plain `general-purpose` subagents for reviews and
  fact-checks.

### 2. Project facts

- **Repos.** Code: `/home/kai/Documents/Projects/job-application-tracker`
  (`waddington/job-application-tracker`, public, created 2026-09-30). Data:
  `/home/kai/Documents/Projects/job-application-tracker-data` (private; Kai pushes it).
  Worktrees: `.claude/worktrees/<name>`.
- **GitHub listing.** Description "Open-source, self-hosted job application tracker for
  software engineers. Kanban board, recruiter CRM, interview rounds, follow-up reminders,
  offers compared side by side, Sankey funnel and insights. Local-first: your data stays in
  plain files on your machine. A free Huntr / Teal alternative with no scraping." 20 topics
  (job-application-tracker, job-tracker, job-search, job-hunting, job-hunt, jobhunt,
  job-search-tracker, job-search-tool, application-tracker, job-applications, job-tracking,
  job-seekers, job-seeker, interview-tracker, offer-comparison, job-offers, recruiter-crm,
  recruiters, self-hosted, local-first). Website field:
  https://waddington.github.io/job-application-tracker/. Social preview: Kai uploaded
  `docs/social-preview.png` (indigo; Kai: "its nice to have some variety" vs the paper site).
  Traffic as of 2026-10-13: 1 star; clone counts are bots and fetches, views ~7 unique.
- **Website** (`website/`, Astro 7, one landing page, PR #64): published by
  `.github/workflows/website.yml` to GitHub Pages (Source: GitHub Actions) on pushes to main
  touching `website/**`, `docs/screenshots/**`, `docs/social-preview.png`,
  `frontend/public/**` or `llms.txt`. `scripts/sync.mjs` copies the screenshots, social card,
  favicon and `llms.txt` in (git-ignored). Palette **paper** (warm off-white, ink, burnt
  orange); `forest`, `ember`, `indigo` exist, and a switcher plus `?palette=` work in
  `pnpm --dir website dev` only. Docs links go to the guide on GitHub (no docs section). The
  footer says "No cookies, no analytics". `pnpm --dir website dev` (localhost:4321, Astro 7
  runs it as a background daemon: `npx astro dev stop` / `status`), `build`, `preview`,
  `format`; `build` runs `astro check`.
- **Docs.** `docs/guide/` (README, install, your-data, using-the-app, customising, commands,
  troubleshooting), `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/` (bug, feature, links),
  `.github/pull_request_template.md`, `docs/prd/tracker.md`, `docs/rfc/stack.md`,
  `docs/ROADMAP.yaml`, `CHANGELOG.md`, `docs/IDEAS.md`, `docs/screenshots/` (17 PNGs incl.
  `conversations.png` and `cv-insights.png`, plus `demo.gif`), `docs/social-preview.png`, this file.
- **Demo GIF.** `python3 scripts/demo_gif/make_demo_gif.py [--out x.gif] [--hold 150]` renders
  `scripts/demo_gif/scene.html` frames with headless Chrome and builds the GIF with
  ImageMagick (1.5 s per scene, 45 frames, ~2.7 MB). Show Kai a preview before replacing it.
- **Stack.** Python 3.12, uv, FastAPI, SQLAlchemy 2.1, Alembic (migrations 0001–0011) and
  SQLite in `src/jat`. Frontend `frontend/`: Vite 8, React 19, TypeScript 5.9, Mantine 9,
  TanStack Router/Query, dnd-kit, d3-sankey, react-markdown, openapi-fetch.
- **Data folder.** `--data-dir` or `JAT_DATA_DIR` (env var or `.env` in the current
  directory; `~` expanded). Kai has a `.env` in the main checkout. `tracker.sqlite3` is
  git-ignored and rebuilt from `export/*.jsonl` by `jat restore`. Snapshots commit 60 s after
  the last write; pushing is `jat push` only. Notes are Markdown files under `notes/` with
  their links in the front matter; `note_index` is rebuilt from the files (`_sync`).
- **Running apps.**
  - **Kai runs the tracker in their own terminal:** `uv run jat serve` in the main checkout →
    http://127.0.0.1:8770 (`/api/docs`). It migrates on start and serves `frontend/dist`.
    Don't stop or replace it.
  - PM dashboard: `python3 -m tools.pm` → http://127.0.0.1:8767 (not running; start it if Kai
    asks).
- **Commands.**
  - Backend: `uv run pytest -q`, `uv run ruff check src tests`, `uv run ruff format -q src tests`.
  - Frontend: prefix pnpm with `PATH=/home/kai/.nvm/versions/node/v22.23.3/bin:/usr/local/bin:/usr/bin:/bin`;
    `pnpm --dir frontend install --frozen-lockfile --silent` (new worktrees), then
    `typecheck | lint | test | build | format | gen:api`. Run `format` before committing.
  - After API changes: `uv run python -m jat.openapi` then `pnpm --dir frontend gen:api`
    (`tests/test_openapi.py` fails on drift, including docstring changes).
  - Demo: `uv run python scripts/seed_demo.py <new empty dir>` then
    `uv run jat --data-dir <dir> serve --port 88xx` as a background job (8873 was the last
    port). Rebuild `frontend/dist` in the worktree first so it serves the branch. TaskStop it
    after merging, and tell Kai the URL if they want to look.
  - Screenshots: Playwright with the system Chrome, from a throwaway env:
    `uv run --with playwright python <script>` with `p.chromium.launch(channel="chrome")`.
    Use it to click (tabs), scroll and crop to element boxes. Plain
    `google-chrome --headless=new --screenshot` works for a page top, not after anchors.
  - Link check: `python3 /home/kai/.claude/jobs/cf5328f4/tmp/check_links.py` (rewrite it if the
    tmp dir is gone: it resolves the guide's relative links and GitHub-style anchors).
  - Waiting on a PR's checks: a background Bash `until` loop on
    `gh pr view N --json mergeStateStatus` (not CLEAN-only: UNSTABLE while the website build
    runs), never a foreground `sleep`.
- **Scratch files** in `/home/kai/.claude/jobs/cf5328f4/tmp` (and `tmp/site/` for the website),
  never `/tmp`.

### 3. Product map (what exists, so you can find things)

- **Menu** (`frontend/src/nav.ts`, `NAV_GROUPS`): *Today*: Overview `/`, Next actions
  `/next-actions`. *Your applications*: Roles `/roles`, Applications `/applications`
  (list/board, `?view=board`), Interviews, Offers. *People and companies*: Recruiters,
  Companies. *Files and notes*: Documents, Notes. *Review*: Insights, Timeline. Detail pages:
  `/applications/$id`, `/roles/$id`, `/companies/$id`, `/agencies/$id`, `/people/$id`,
  `/search?q=`.
- **Header** (`components/Layout.tsx`): wordmark → `/`; **New application**; search (`/`);
  **?** How it works (`components/HowItWorks.tsx`); theme toggle.
- **Overview** (`pages/HomePage.tsx`): stats; pipeline; *Needs attention*; *Coming up*;
  *Recent activity* (timeline items except `added`, so pitches show).
- **Next actions** (`pages/NextActionsPage.tsx`, `api/next_actions.py`): replies to read,
  to-dos, offers to answer, waiting to hear back (people rows: Chased / Ghosted / Not
  interested; *Usually replies within N working days* and *longer than usual*, also on
  application rows via their recruiter), how did it go?, follow up, roles to decide, coming
  up, gone quiet.
- **Application page and quick view** (`pages/ApplicationPage.tsx`,
  `components/ApplicationDrawer.tsx`): summary, then **At a glance**
  (`components/AtAGlance.tsx`, rules in `utils/attention.ts`, #65). Then details, interviews,
  documents sent, offer, notes, links, files (+ *From the role*), log activity, timeline;
  to-dos, role and people on the right.
- **Roles** (`api/roles.py`, `components/Roles.tsx`, `pages/RolesPage.tsx`,
  `pages/RolePage.tsx`): pitched or spotted roles, apply / pass / reconsider; a page per role
  with its files (shown on the application).
- **People** (`pages/RecruitersPage.tsx` tiles with All / Agencies / Companies / Independent /
  *Ghosted · n*; `pages/PersonPage.tsx`): calls, roles mentioned, applications, interviews,
  to-dos, notes, links, files; **Timeline**, **Edit**, **Merge…**, **Delete**.
  - Merge and one person per email / LinkedIn (`components/MergePerson.tsx`,
    `domain/people.py`, #68).
  - **Ghosts** (#72): `components/GhostMark.tsx` (`GhostMark`, `useGhosted`, `PersonName`) puts
    a ghost before a ghosted person's name across the app (tiles, page icon, application
    list/board/quick view/People card, company/agency/role pages, calls, Next actions,
    Timeline entries and person lanes, search, Insights). Role lines say "(ghosted)". **Not a
    ghost** / **Remove Not interested** on the page, or the × on the tile chip, with Undo
    (`components/PersonChase.tsx`, `useAct`).
  - **Reply times** (#73): `replies` table (migration 0011, backfilled from application
    events), `domain/replies.py` (`working_days` = weekdays after the wait day up to the reply,
    `is_reply_move`, `record`, `take_back_move`, `stats`); `ContactOut.replies` +
    `usual_reply_days` (median, rounded up); `components/ReplyHabit.tsx`, `utils/replies.ts`.
- **Documents** (`pages/DocumentsPage.tsx`, `api/documents.py`): CVs and cover letters with
  versions. **CV files you've attached** card (`components/CvFiles.tsx`, #74/#75):
  `GET /cv-files` finds PDF/Word files on applications, roles and people named like a CV or in
  two or more places (a role and its own application count as one), grouped by `sha256`, each
  with `sources` and the `applications` it counts for (role/person files only claim
  applications with no CV yet); `POST /cv-files/adopt` copies it into a version (or reuses the
  matching one) and records it on the ticked `application_ids` (sent on `applied_on`, else the
  earliest attachment linked to that application). *Not a CV* (localStorage `jat.notACv`,
  "Show … you said aren't CVs").
- **Insights** (`pages/InsightsPage.tsx`): tabs *Applications* (Sankey, stage table, routes,
  scorecard), *Recruiter conversations* (`components/Conversations.tsx`,
  `domain/conversations.py`, #66) and *CVs and cover letters* (#71:
  `domain/document_performance.py`, `GET /insights/documents`,
  `components/DocumentPerformance.tsx`, Fisher's exact test in `utils/abtest.ts`; a note
  linking to Documents when CV files aren't versions yet). *Weekly activity* under all.
- **Timeline** (`pages/TimelinePage.tsx`, `api/timeline.py`, #67/#70): list by day or lanes
  (per role by default, or person, company, agency). View, period and *About* live in the URL
  (`useTimelineSearch`; the router JSON-parses `?period=30` into a number); person, company and
  agency pages have a **Timeline** button (`components/TimelineButton.tsx`) opening
  `/timeline?about=contact:<id>&period=all`. Notes on a role count for its company, pitcher and
  agency; roles you added yourself are `added` bookkeeping.
- **API** (`/api/v1`): CRUD for companies, agencies, contacts (+ `/merge`), roles,
  applications (+ `/quick`, `/move`, `/undo`, `/activities`, `/contacts`), interviews, offers,
  notes, links, attachments, documents (+ `cv-files`, `cv-files/adopt`), todos; summaries;
  `role-summaries`, `next-actions`, `timeline`, `meetings`,
  `insights/{flow,stats,activity,scorecard,conversations,documents}`, `search`, `backup`
  (+ `/archive`, `/snapshot`, `/push`).

### 4. Current state (snapshot 2026-10-14, after #75)

- **main at `c6eaeac`** (merge of #75), plus this doc's PR until it merges. No other open PRs,
  worktrees or remote branches.
- **Merged since the last snapshot:** #69 compaction doc; #70 Timeline button per person /
  company / agency and URL filters; #71 *Which CV works best* (Insights CV A/B test); #72
  ghosts everywhere, *Ghosted* filter, *Not a ghost*; #73 *Usually replies within N working
  days* (migration 0011); #74 CV files on applications become versions; #75 CV files on roles
  and people too, with tick boxes. Roadmap tasks for all are `done`.
- **Tests on main:** 326 backend, 119 frontend. The machine is often heavily loaded (load
  average ~30 from other jobs): frontend tests that time out at ~2 s in a full run pass when
  run on their own; rerun those files before suspecting the code.
- **Kai's tracker** has restarted onto the latest code (2026-10-14: `/api/v1/cv-files` and
  `/api/v1/insights/documents` answer 200, read-only GETs), so migration 0011 has run on their
  data.
- **Kai's latest messages, in order** (since #68): "Update … COMPACTION.md…" (#69); "on
  individual recruiter pages i want to be able to see a timeline for just that person…" and
  "i want some insights about how different CVs perform compared to each other, an A/B test if
  you will" (#70, #71); "what are you buuilding, i missed your other messages" (answered);
  "how is it going to tell the difference between CVs and know which are the same"
  (answered: by the version you record, not the file; offered fingerprint matching); "add a
  ghost icon just before a recruiter name if they have ghosted", then "and also a filter here
  for ghosts. it should be very clear on every page/role/etc associated with a recruiter that
  they are a ghost… i need a way to be able to remove that status in case they are just slow.
  Perhaps also good to add a "usually replies within X time" taking into account that weekend
  days dont count as a day", then "Not necessarily undo, i might want to remove the ghost
  status a week later" (#72, #73); "yes build that" (CV files → versions, #74); "it should
  also lok at CVs sent to recruiters/roles, not just on applications" (#75); then this
  compaction refresh.

### 5. Work in flight and candidates

- **In flight:** none (after this doc's PR merges).
- **Offered, waiting on Kai:**
  - Rebuild `docs/screenshots/demo.gif` from the new screenshots (Insights tabs incl. CVs,
    Timeline by role, ghosts); show a preview first.
  - Visitor stats for the website: Google Search Console and/or GoatCounter (footer wording
    would change). Needs Kai to create the account.
- **Noticed, not promised:**
  - README screenshots don't show ghosts or reply times yet (`recruiters.png`, `person.png`,
    `next-actions.png`); the demo seed has replies but nobody ghosted.
  - Ghost still missing in: the Timeline *About* select's people, to-do "about" text on Next
    actions and the Overview.
  - Reply times: only weekdays, no bank holidays; waits on people before #73 weren't recorded.
  - CV files: an unticked application stays on offer until it has a CV recorded; files
    attached to applications don't use the "no CV yet" rule.
  - On phones: Next actions application rows overflow; the header search overlaps the title.
  - The application page's People card ignores a recruiter set through the route.
  - Overview stats show zeros before the first application; its "roles to decide" line isn't
    linked.
  - Small nits left on purpose: re-passing a role re-stamps `decided_on`; all-day timeline
    items at UTC midnight; `GET /meetings?upcoming` defaults to UTC; timeline "pitched"
    wording even for a referrer.

### 6. The delivery loop

1. `git fetch -q && git worktree add -q .claude/worktrees/<name> -b worktree-<name> origin/main`,
   then EnterWorktree with `path`. Add the roadmap task (P7, `building`), commit, push with
   `-u`. In a new worktree, `pnpm --dir frontend install` before frontend commands.
2. Backend: model + migration (check `tests/test_db.py`), API, tests; new tables/columns in
   `tests/factories.py` `populate()`; regenerate OpenAPI and types. Commit and push.
3. Frontend: hooks (invalidate every query key that shows the data), components, pages,
   tests. Commit and push.
4. Docs: guide, README row and text, `llms.txt`, changelog with the PR number (`gh pr list
   --state all --limit 1` + 1), screenshots if visible UI changed. Link check.
5. Live check: seed demo data, build the branch's frontend, serve on a spare port, drive it
   with Playwright, Read the screenshots (also at 375 px when rows gain buttons).
6. PR with `--body-file` (what Kai asked, quoted; what changed; checks). Start a background
   `general-purpose` reviewer: `gh pr diff N` once, Read files in the worktree, report
   must_fix/should_fix/nit with file:line. For anything touching Kai's real data, tell it to
   focus on data safety. Tell Kai what's happening meanwhile.
7. Apply fixes (more tests where it found gaps), re-run every check, set the roadmap task
   `done`, push. Poll `mergeStateStatus` for CLEAN, then merge.
8. ExitWorktree keep; on main: `git pull -q --ff-only`, `git worktree remove --force …`,
   `git branch -D …`, `git fetch -q --prune`; rebuild the frontend; TaskStop demo servers;
   check the tracker answers; report what's live and whether Kai must restart.

Several features can be in flight at once (one worktree each): ExitWorktree keep, then
EnterWorktree the other. Merge main into a branch before its PR when main moved; the usual
conflict is the last lines of `docs/ROADMAP.yaml` (keep both, in merge order).

### 7. Decisions already made (don't re-litigate)

- **Workflow:** any-to-any moves by default; `transitions = "configured"` enforces `next`.
- **Staleness:** not stale if snoozed, a follow-up is planned later, a round is booked ahead,
  you're waiting to hear back, or there's a reply to read.
- **Reply states:** `awaiting_reply_since` and `reply_to_read_since` never coexist; a stage
  move clears both. People also have `chased_on`, `closed_as` (`ghosted` |
  `not_interested`) + `closed_on`.
- **At a glance** follows Next actions' rules for one application; to-dos show even on closed
  or archived applications; key dates count only what has happened (`last_activity_at` in the
  future falls back to the latest past event).
- **Recruiter conversations:** a pitched role is a role with a person; calls held = marked
  Happened (whatever the time); booked = scheduled and ahead; a scheduled call already past
  isn't counted. Best outcome per role: offer > in progress > closed > ghosted. Time to decide
  counts from an application's first stage event. Weekly calls = held.
- **Timeline:** lanes by role by default; `role` kind for pitches and passes; `added`
  bookkeeping off by default; Application lanes dropped.
- **People:** one agency or company each. One person per email and LinkedIn profile (only
  details new to a person are checked, so old duplicates stay editable). Merge: the kept
  person's fields win; title from the other if none; agency or company if neither; waiting /
  to-read / closed if none; later chased date. Notes are relinked in the file, keeping their
  edit time; the index catches up on the next sync.
- **Roles:** status derived (*applied* > *passed* > *to decide*); role files show on the
  application; same title at the same company reuses the role.
- **Deleting:** a company or role with applications can't be deleted; deleting a person
  deletes their calls and unlinks the rest (so for duplicates, merge).
- **Offers:** the newest per application counts; worth a year = salary + bonus + equity +
  employer pension, or day rate × 220.
- **Ghosts:** only `closed_as == "ghosted"` gets a ghost (not *Not interested*); taking it off
  is a plain action any time (not "undo" wording), with an Undo toast.
- **Reply times:** recorded when waiting ends with *They've replied* / *Heard back*, or a move
  on while waiting that isn't yours (Withdrawn, Declined, success stages, `reopen_from`);
  undoing that move takes it back; chasing and Ghosted aren't replies; no guessing at PATCH
  "undos" (it deleted real replies). Local days. Merging people keeps replies; deleting an
  application keeps them (`SET NULL`).
- **CV A/B:** CVs are told apart by the version recorded per application, not by reading
  files. *Sent* = got to Applied (or the first active stage after the start without an
  `applied` stage), closed after it, or a document recorded; reply time from the day it got
  to Applied. Screen or interview is the headline measure; Wilson 95% ranges; Fisher's exact
  test with "too few" under 5 each; a CV can't be compared with its own versions.
- **CV files:** grouped by content (`sha256`); the version gets its own copy; originals never
  touched; role/person files only claim applications without a CV; you tick the applications.
- **Website:** one landing page, paper palette, docs on GitHub, no analytics.
- **Search:** every word must match, accent- and case-insensitive.

### 8. Gotchas already learned

- **Harness refusals.** Bash it can't prove stays in the entered worktree is refused:
  heredocs and inline Python (especially when the text contains "git"), `for` loops with
  variables as programs, `cd` before git, `&&` chains mixing git with other tools. Fix: Write a
  script to the tmp dir and run it with `python3`; Edit for small changes; split commands.
  A refused command changed nothing.
- **Never `open(p, "w").write(f(open(p).read()))`**: the write mode truncates the file before
  the read. Read into a variable first. If it happens, `git checkout -- <file>` (tracked files
  only; a new untracked file must be fixed by hand).
- **The main checkout is read-only for edits** in this session (git pull, worktree remove and
  `pnpm build` there are fine). Ask Kai to run anything else with `!`.
- **Subagents can't run Bash in your worktree:** tell them to use `gh pr diff` and Read.
- **`gh pr edit` fails silently** (classic Projects deprecation): set a title or body with
  `gh api -X PATCH repos/waddington/job-application-tracker/pulls/N -f title=… -F body=@file`.
- **`gh pr merge` from the main checkout** prints "'main' is already used by worktree"; the
  merge still happened (check `gh pr view N --json state`).
- **Polling.** Right after a push, poll `mergeStateStatus` for CLEAN before merging.
- **SQLite and notes:** call `_sync(request)` (notes index) before the request's session reads
  anything; otherwise a write later in the request can fail with "database is locked".
- **zsh:** `grep --include=*.tsx` fails ("no matches found"); grep paths directly.
- **React lint:** no `Date.now()` or `dayjs()` in render (`useToday()`, `useNow()` in
  `utils/useToday.ts`). Mantine options render hidden; SegmentedControl items are radios;
  Chips are checkboxes.
- **Test fixtures:** `frontend/src/test/mockApi.ts` (`row`, `item` with `role_id`, `meeting`,
  `roleSummary`, `todo`). Prove a test catches a bug by breaking the code and watching it fail.
- **Headless screenshots** of a page with reveal animations need reduced motion
  (`--force-prefers-reduced-motion` or Playwright `reduced_motion="reduce"`); `scroll-behavior:
  smooth` swallows scripted scrolling (inject `html{scroll-behavior:auto}`).
- **Astro 7 `dev`** detaches into a daemon: `npx astro dev stop` before restarting; a content
  change it misses needs a restart.
- **The truncation trap again (#74):** a script's last line `open(C, "w").write(open(C).read())`
  emptied a file. Never reopen a file for writing on the same line it's read; restore with
  `git checkout -- <file>` and re-apply only that file's edits.
- **`git checkout -- <file>` after a test-the-test break** also drops your uncommitted edits to
  that file: copy the file aside (`cp f tmp/f.bak`) and copy it back instead.
- **`export PATH=…node…`** in a Bash call hides `uv` for the rest of that call: run
  `uv run python -m jat.openapi` in its own call before `pnpm gen:api`.
- **TanStack Router:** routes built from `NAV` aren't typed for `navigate({ to: "/timeline" })`;
  navigate to `"."`. Mantine Select inputs have two elements per label (use
  `getAllByLabelText(...)[0]` or `findByDisplayValue`); jsdom lacks `scrollIntoView` (stubbed
  in `src/test/setup.ts`); notifications persist across tests (scope `Undo` clicks to the
  toast).
- **CI:** a website build check runs when docs/screenshots change; `mergeStateStatus` is
  UNSTABLE until it passes.

### 8a. How Kai works

- Uses the tracker for a real job search and reports gaps as they hit them, often several in
  one message or mid-turn: split them into PRs, fold small ones into the one in progress.
- Likes to see things running before they land (a local URL), then says "merge".
- Asks short questions ("how do i run thius?"): answer plainly with the exact command.
- Values findability, honesty about state, docs and images that match the code, a tidy repo,
  and the project being discoverable on GitHub.

### 9. Drop

Tool output, diffs and file contents already on disk; per-command narration; reviewer reports
already handled; screenshots already looked at; topic-research tables; superseded plans and
palettes; the earlier versions of this doc.

### 10. End the summary with

The resume steps below, then: "Next action: wait for Kai's next request; if none, check the
tracker answers and report."

---

## Resuming after compaction

1. **Re-read, don't trust memory:** `CLAUDE.md`, this file, `gh pr list`, `git worktree list`,
   `git branch -a`, `git log --oneline -5` on main and any worktree branch.
2. **Check the tracker:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8770/api/v1/health`.
   Kai runs it; if it's down, say so and give the command (`uv run jat serve` in the main
   checkout).
3. **Open PRs first:** apply review fixes or start a reviewer; merge when clean; deploy.
4. **Unfinished worktrees:** commit and push, then finish that task.
5. **Then Kai's latest request.** If there isn't one, report the state in two lines and wait.
6. **Before the next compaction,** refresh sections 3, 4 and 5 in a small docs PR.

## Re-expanding what the summary dropped

The summary keeps decisions and pointers, not detail. When a detail is needed, get it back
from the record rather than guessing:

- **The full conversation:** the transcript path the summary gives
  (`/home/kai/.claude/projects/-home-kai/<session>.jsonl`). Search it with `grep` for a quote,
  a PR number or a file name; don't read it whole.
- **What a PR did and why:** `gh pr view N` (the body quotes Kai and lists what changed and
  the checks), `gh pr diff N`, and the merge commit's messages (`git log --oneline main`).
- **What a feature does:** `docs/guide/using-the-app.md` and the module docstrings
  (`src/jat/domain/*.py`, `src/jat/api/*.py`); `CHANGELOG.md` maps features to PRs.
- **What's planned or done:** `docs/ROADMAP.yaml` and `docs/IDEAS.md`.
- **How a screenshot was made:** the scripts in the tmp dir (`shots9.py`, `copy9.py`,
  `tmp/site/cap.py`, `insights_shots.py`, `tl_readme.py`, `merge_live.py`); rewrite them from
  the Commands above if the tmp dir is gone.

## Keeping things that must survive

Context is temporary; the repo isn't. Anything that should outlive a compaction goes on disk
in the same PR that makes it true:

- Kai's standing instructions and decisions: sections 1 and 7 here (and `CLAUDE.md` when they
  are rules for the repo).
- What's built: the guide, the README, `llms.txt`, `CHANGELOG.md`, the roadmap.
- Why: the PR body (quote Kai) and commit messages.
- Gotchas worth not relearning: section 8 here.
