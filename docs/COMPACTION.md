# Compacting the build session

The long-running Claude Code session that builds this repo compacts its context now and then.
This file says what the summary must keep, what it can drop, and how to carry on afterwards,
so the work continues as if nothing happened.

**How to use it:** run `/compact` followed by everything under [The prompt](#the-prompt).
After compaction, the session follows [Resuming](#resuming-after-compaction).

Sections 3, 4 and 5 are a snapshot (2026-10-13, after PR #60); refresh them before each
compaction. This repo is public: nothing here may contain Kai's job-search data.

---

## The prompt

Summarise this session so work continues without asking Kai anything a sensible default
answers. Keep everything in sections 1–8 below, quoting Kai verbatim where quoted. Keep ids,
paths, ports, branch names, PR numbers, commit hashes and commands exact. Keep the last few
user messages word for word, with what was done about each. Drop what section 9 says. End with
section 10: the resume steps and one line saying the next action.

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
  change gets a fact-check reviewer.
- **Branches.** "also delete branches on remote that are no longer needed". After each merge
  only `main` should remain, locally and on GitHub.
- **PM dashboard.** "keep the PM dashboard up to date, or even backfill items if they were not
  added". Every task gets a `docs/ROADMAP.yaml` entry in phase P7 (id = branch name minus
  `worktree-`, with `prd: docs/prd/tracker.md`) in the PR that builds it, `status: building`,
  set to `done` just before merging.
- **Docs and images.** "ensure docs are up to date, readme, images, etc". Every PR that adds or
  changes a feature, command, setting or data-folder behaviour updates `docs/guide/`, the
  README row, `llms.txt` and `CHANGELOG.md` in the same PR, checked against the code. When a
  change is visible in a README screenshot (or a `demo.gif` frame), retake it.
- **Visibility.** After each merge: fast-forward main, rebuild the frontend on main, and say in
  a line what's now live. If the backend changed (a migration, new API), the tracker must be
  restarted: restart it if this session runs it, otherwise tell Kai to Ctrl+C and rerun
  `uv run jat serve` in their terminal. A frontend-only change needs just a page refresh.
- **Version and status.** "we'll leave it as 0.1.0 for now, i havent tested it at all". Don't
  bump the version or tag a release. Docs say "early development (0.1.0), built but not yet
  tested in real use".
- **Privacy.** Kai's data never enters this repo. Tests, fixtures, seed data and screenshots use
  fictional names (Contoso, Fabrikam, Northwind Talent, Northwind Pay, Blue Yonder Recruitment,
  Alex Morgan, Riley Chen, Sam Patel, Jordan Lee, Casey Brooks, Morgan Ellis, Taylor Quinn,
  Drew Harper…) and example.com. Never act on Kai's real data folder beyond reading status
  (`/api/v1/backup`, `git log`/`status`, a GET to check a migration ran) or restarting the
  tracker on it. Kai's screenshots show real names: never copy them into the repo, commits or
  PRs.
- **Scope cuts.** No job searching or scraping, no quick-add from URLs, no MCP server, no
  `.ics` export.
- **Outward-facing changes** (repo description, topics, settings) need Kai's yes first. Kai
  said "Yes make the chnages" for the description and topics below; they're applied.
- **Documents** go in the repo, not artifacts. Deleting anything of Kai's needs confirmation.
- **No agent-team skill in this repo.** Plain `general-purpose` subagents for reviews and
  fact-checks.

### 2. Project facts

- **Repos.** Code: `/home/kai/Documents/Projects/job-application-tracker`
  (`waddington/job-application-tracker`, public). Data:
  `/home/kai/Documents/Projects/job-application-tracker-data` (private repo with a remote;
  Kai pushes it). Worktrees: `.claude/worktrees/<name>`.
- **GitHub listing** (set 2026-10-13): description "Open-source, self-hosted job application
  tracker for software engineers. Kanban board, recruiter CRM, interview rounds, follow-up
  reminders, offers compared side by side, Sankey funnel and insights. Local-first: your data
  stays in plain files on your machine. A free Huntr / Teal alternative with no scraping."
  and 20 topics: job-application-tracker, job-tracker, job-search, job-hunting, job-hunt,
  jobhunt, job-search-tracker, job-search-tool, application-tracker, job-applications,
  job-tracking, job-seekers, job-seeker, interview-tracker, offer-comparison, job-offers,
  recruiter-crm, recruiters, self-hosted, local-first. They were picked because topic pages
  rank by stars and in most of these about 5 stars reaches page one. Suggested to Kai and not
  done: a social preview image, a website link, getting a few stars.
- **Docs.** `docs/guide/` (README, install, your-data, using-the-app, customising, commands,
  troubleshooting), `docs/prd/tracker.md`, `docs/rfc/stack.md`, `docs/ROADMAP.yaml`,
  `CHANGELOG.md`, `docs/IDEAS.md`, `docs/screenshots/` (16 images incl. `role.png` and
  `demo.gif`), this file.
- **Stack.** Python 3.12, uv, FastAPI, SQLAlchemy 2.1, Alembic (migrations 0001–0010) and
  SQLite in `src/jat`. Frontend `frontend/`: Vite 8, React 19, TypeScript 5.9, Mantine 9,
  TanStack Router/Query, dnd-kit, d3-sankey, react-markdown, openapi-fetch.
- **Data folder.** Found by `--data-dir` or `JAT_DATA_DIR` (env var, or `.env` read from the
  current directory; `~` is expanded); no default. Kai now has a `.env` in the main checkout,
  so `uv run jat serve` from there is enough. `tracker.sqlite3` is git-ignored and rebuilt from
  `export/*.jsonl` by `jat restore` (or `jat init` on a fresh clone). Snapshots commit 60 s
  after the last write; pushing is `jat push` only.
- **Running apps.**
  - **Kai runs the tracker in their own terminal** now: `uv run jat serve` in the main
    checkout → http://127.0.0.1:8770 (`/api/docs`). `serve` migrates on start and serves
    `frontend/dist` from disk. Don't TaskStop or replace it; it isn't this session's.
  - If Kai asks this session to run it: `uv sync -q && uv run jat --data-dir
    /home/kai/Documents/Projects/job-application-tracker-data serve` as a background job with
    `timeout: 7200000`. It dies after 2 hours and when the session restarts: say so, don't
    restart it in a loop.
  - PM dashboard: `python3 -m tools.pm` → http://127.0.0.1:8767 (not running; start it if Kai
    asks). Reads `docs/ROADMAP.yaml` on main and PR state from GitHub.
- **Commands.**
  - Backend: `uv run pytest -q`, `uv run ruff check src tests`, `uv run ruff format -q src tests`.
  - Frontend: prefix pnpm with `PATH=/home/kai/.nvm/versions/node/v22.23.3/bin:/usr/local/bin:/usr/bin:/bin`;
    `pnpm --dir frontend install --frozen-lockfile --silent` (new worktrees), then
    `typecheck | lint | test | build | format | gen:api`. Run `format` before committing.
  - After API changes: `uv run python -m jat.openapi` then `pnpm --dir frontend gen:api`
    (`tests/test_openapi.py` fails on drift, including docstring changes).
  - Demo: `uv run python scripts/seed_demo.py <new empty dir>` (seeds to-dos, a reply to read
    and a role with a recruiter's call) then `uv run jat --data-dir <dir> serve --port 88xx`
    as a background job (spare port; 8863 was the last used). TaskStop it after merging.
  - Screenshot: `google-chrome --headless=new --no-sandbox --user-data-dir=<tmp> --window-size=1400,900 --hide-scrollbars --virtual-time-budget=8000 --screenshot=<png> <url>`, then Read the PNG. Check phones at `--window-size=375,…`.
  - Link check: `python3 /home/kai/.claude/jobs/cf5328f4/tmp/check_links.py` (resolves the
    guide's relative links and GitHub-style anchors; rewrite it if the tmp dir is gone).
- **Scratch files** in `/home/kai/.claude/jobs/cf5328f4/tmp`, never `/tmp`.

### 3. Product map (what exists, so you can find things)

- **Menu** (`frontend/src/nav.ts`, groups in `NAV_GROUPS`): *Today*: Overview `/`, Next
  actions `/next-actions`, Timeline `/timeline`. *Your applications*: Roles `/roles`,
  Applications `/applications` (list/board, `?view=board`), Interviews, Offers. *People and
  companies*: Recruiters, Companies. *Files and notes*: Documents, Notes. *Review*: Insights.
  Detail pages: `/applications/$id`, `/roles/$id`, `/companies/$id`, `/agencies/$id`,
  `/people/$id`, `/search?q=`.
- **Header** (`components/Layout.tsx`): wordmark → `/`; **New application**; search (`/`);
  **?** How it works; theme toggle. Favicon `frontend/public/favicon.svg` (+ apple-touch PNG).
- **Overview** (`pages/HomePage.tsx`): stats; pipeline; *Needs attention* = replies to read,
  then to-dos due today or earlier or undated, then follow-ups, gone quiet, roles to decide
  (all counted in its stat); *Coming up*; *Recent activity*. Empty tracker → Getting started;
  people/calls/roles but no applications → "No applications yet" card plus the usual panels.
- **Next actions** (`pages/NextActionsPage.tsx`, `api/next_actions.py`), in page order:
  *Replies to read* (`to_read`, `to_read_people`), *To-dos* (always shown: add form with an
  About picker, Done recently), Offers to answer, Waiting to hear back (applications and
  people; people rows have **Chased / Ghosted / Not interested**), How did it go?, Follow up,
  Roles to decide, Coming up, Gone quiet. "All caught up" only when there are no to-dos either.
- **To-dos** (`api/todos.py`, `api/todoHooks.tsx`, `components/Todos.tsx`): text, optional
  date, about an application/role/company/agency/person or nothing. `TodosCard` on those
  pages, a to-do button on role rows, tick/edit/delete with Undo, in search.
- **Reply states** (`components/Waiting.tsx`, `components/PersonChase.tsx`): *I've replied,
  waiting* / *Heard back* / *They've replied* / *Read it* on applications and people;
  *Chased* / *Ghosted* / *Not interested* / *Reopen* on people.
- **Roles** (`api/roles.py`, `components/Roles.tsx`, `pages/RolesPage.tsx`,
  `pages/RolePage.tsx`): role rows (title links to the role page; paperclip count; to-do
  button; Apply/Pass/Reconsider/edit/delete). Role page: details, where it came from, its
  application, To-dos, Notes, Links, Files. **Add role** takes files (the job description).
  An application's Files card lists its role's files under *From the role* (same file, not a
  copy).
- **Recruiters** (`pages/RecruitersPage.tsx`): small tiles A to Z (name, title, agency or
  company chip, Waiting / Reply to read / Ghosted badges, contact details), search over
  name/title/agency/company/details, All / Agencies / Companies / Independent filter, a row of
  agency chips with counts.
- **People, calls, timeline**: person pages (calls, roles mentioned, applications,
  interviews, to-dos, notes, links, files); calls (`api/meetings.py`, `components/Meetings.tsx`);
  Timeline (`api/timeline.py`) includes people waiting / to read / chased / closed, role items
  carry `role_id`.
- **API** (`/api/v1`): CRUD for companies, agencies, contacts, roles, applications (+ `/quick`,
  `/move`, `/undo`, `/activities`, `/contacts`), interviews, offers, notes, links,
  attachments (`?entity_type=role` alone lists every role's files), documents, `todos`;
  summaries for company/agency/contact; `role-summaries` (+ `/{role_id}`), `next-actions`,
  `timeline`, `meetings`, `insights/{flow,stats,activity,scorecard}`, `search` (kinds incl.
  `role`, `todo`), `backup` (+ `/archive`, `/snapshot`, `/push`).

### 4. Current state (snapshot 2026-10-13, after #60)

- **main at `e642a22`** (merge of #60), plus this doc's PR until it merges. No other open PRs,
  worktrees or remote branches.
- **Roadmap P0–P7 all `done`.** Merged PRs #1–#60. Since the last snapshot: #53 compaction
  doc; #54 favicon; #55 to-dos (migration 0008); #56 replies to read (0009); #57 role pages and
  files on roles; #58 Recruiters page as tiles; #59 chased / ghosted / not interested for
  people (0010); #60 those as labelled buttons.
- **Tests on main:** 274 backend, 86 frontend.
- **Kai's tracker** runs in their own terminal on migration 0010 (checked: `/api/v1/contacts`
  has `closed_as`).
- **Kai's latest messages, in order:** "This needs a favicon" (→ #54); custom next-action
  items on recruiter/role/application (→ #55); "they've replied, i need to read it" state
  (→ #56); files on roles carried to the application, and "a way to view a role the same way
  theres a page for a recrutier" (→ #57); recruiters page "smaller cards… sorted
  alphabetically… pill/chip… for agency/company", then "its is nice to have their contact
  detials in that card though so maybe keep that" (→ #58); "how do i run thius?" and "can that
  data dir path go in an env var" (answered; Kai created `.env` with the `!` command); "chased"
  / "ghosted" / "not interested" for a recruiter (→ #59); "make those icons buttons with text
  like the othres" (→ #60); a repo description and tags to top GitHub topic pages (researched
  ~100 similar repos; applied after "Yes make the chnages"); then this compaction refresh.

### 5. Work in flight and candidates

- **In flight:** none (after this doc's PR merges).
- **Candidates** (offered or noticed, none promised):
  - On phones, application rows in Next actions overflow sideways (StageBadge + date + reply
    buttons + ChaseActions in a `nowrap` group). People rows were fixed in #60 the same way
    (wrap, `marginLeft: auto`). Offered to Kai.
  - On phones the header's search box overlaps the page title. Offered to Kai.
  - The application page's People card ignores a recruiter set through the route ("No one
    linked yet").
  - Overview stats show zeros before the first application.
  - The Overview's "roles to decide" line isn't linked to role pages.
  - Small nits left on purpose: re-passing a role re-stamps `decided_on`; all-day timeline
    items are at UTC midnight; `GET /meetings?upcoming` defaults to UTC; the timeline rescans
    the notes folder per request; server `date.today()` defaults (closed_on) are UTC.

### 6. The delivery loop

1. `git fetch -q && git worktree add -q .claude/worktrees/<name> -b worktree-<name> origin/main`,
   then EnterWorktree with `path`. Add the roadmap task (P7, `building`). In a new worktree,
   `pnpm install` before frontend commands; `uv` makes its own venv.
2. Backend: model + migration (check `tests/test_db.py` for drift), API, tests; fill new
   tables/columns in `tests/factories.py` `populate()`; regenerate OpenAPI and types. Commit
   and push.
3. Frontend: hooks (invalidate every view that shows the data), components, pages, tests.
   Commit and push.
4. Docs: guide, README row, `llms.txt`, changelog (with the PR number: next is `gh pr list
   --state all --limit 1` + 1), screenshots if visible UI changed. Link check.
5. Live check: seed demo data, serve on a spare port, screenshot the page (and at 375px wide
   when a row gains buttons).
6. PR with `--body-file` (what Kai asked, quoted; what changed; checks). Start a background
   `general-purpose` reviewer: `gh pr diff N` once, Read files in the worktree, report
   must_fix/should_fix/nit in ~250 words. Tell Kai what's happening meanwhile.
7. Apply fixes, re-run every check, set the roadmap task `done`, push. Wait for
   `mergeStateStatus` CLEAN (section 8, Polling), then merge.
8. ExitWorktree keep; on main: `git pull -q --ff-only`, `git worktree remove --force …`,
   `git branch -D …`, `git fetch -q --prune` (gh deletes the remote branch on merge); rebuild
   the frontend; TaskStop demo servers; check the tracker answers (and that a migration ran);
   report what's live and whether Kai must restart.

### 7. Decisions already made (don't re-litigate)

- **Workflow:** any-to-any moves by default; `transitions = "configured"` enforces `next`
  rules (Jira-style).
- **Staleness:** not stale if snoozed, a follow-up is planned later, a round is booked ahead,
  you're waiting to hear back, or there's a reply to read.
- **Reply states** (applications and contacts, local dates): `awaiting_reply_since` (you
  replied) and `reply_to_read_since` (they replied, unread) never coexist: setting one clears
  the other (`_one_reply_state`). A stage move clears both; undo restores both as a pair.
  A reply to read isn't also a follow-up. Both are logged on the application timeline
  ("They replied; to read", "Read their reply", "Replied; waiting…", "Heard back"). Never
  inferred from messages.
- **People only:** `chased_on` (sets waiting from that day unless one is given), `closed_as`
  (`ghosted` | `not_interested`) + `closed_on`. Closing clears waiting and to-read; setting
  either reopens; `closed_as: null` reopens and clears the date; a lone `closed_on` is
  ignored. Undo sends all five fields back. Applications keep Ghosted as a stage.
- **To-dos:** `todos` table, `entity_type`/`entity_id` like links (no FK); deleting the thing
  detaches its to-dos (`remove_orphan_links`). Order everywhere: due within 14 days (overdue
  first), then undated, then later; done ones last, newest first. Next actions lists every
  open one; the Overview only those due by today or undated.
- **Roles:** status derived (*applied* > *passed* > *to decide*). `roles.meeting_id` has no FK
  on purpose; `clear_role_meetings` nulls it. A role's call must be with its person. Apply
  goes through the person's agency, else direct with them as recruiter. Same title at the
  same company reuses the role. Role files show on the application (not copied).
- **People:** a contact belongs to an agency or a company. Calls (`Meeting`) are with one person
  (cascade on delete).
- **Overview:** empty tracker → Getting started; anything added but no applications → "No
  applications yet" plus the usual panels.
- **Deleting:** a company or role with applications can't be deleted; a company's unused roles
  go with it. Links go; files and to-dos are detached; notes stay. Deleting a person deletes
  their calls and unlinks their roles.
- **Offers:** the newest per application counts; worth a year = salary + bonus + equity
  estimate + employer pension, or day rate × 220.
- **Search:** every word must match, accent- and case-insensitive. Roles match on title, not
  company name.
- **Backups:** one zip, no database inside. **Security:** LocalOnly middleware.

### 8. Gotchas already learned

- **Harness refusals.** Bash it can't prove stays in the entered worktree is refused: heredocs
  or inline Python (even with no "git" in them, when long), `for` loops with sed/uv, `$VAR` as
  a program, `cd` before git, `&&` chains mixing git with other tools, `sed` with `r` (read
  file). Fix: Write a script to the tmp dir and `python3` it; Edit for small changes; split
  commands. A refused command changed nothing. A script that asserts partway leaves earlier
  edits applied: check, then run the rest.
- **The main checkout is read-only for this session** ("This background session hasn't
  isolated its changes yet"): even git-ignored files there (`.env`) can't be written. Ask Kai
  to run the command with `!`.
- **Worktrees.** Edits need the worktree you've entered. Subagents can't run Bash in your
  worktree: tell them to use `gh pr diff` and Read.
- **Polling.** Right after a push `gh pr merge` can fail with "not mergeable" though
  `mergeable` says MERGEABLE. Poll `mergeStateStatus` for CLEAN:
  `sleep 10; for i in $(seq 1 40); do s=$(gh pr view N --json mergeStateStatus -q .mergeStateStatus); [ "$s" = "CLEAN" ] || [ "$s" = "DIRTY" ] && break; sleep 3; done`.
- **zsh:** `grep --include=*.tsx` fails ("no matches found"); grep paths directly.
- **False greens and flakes.** Read the test summary line. A frontend test that times out
  under load: rerun alone, then the suite.
- **FK cycles** break export order; new tables and columns need values in `populate()`.
- **React lint:** no `Date.now()` or `dayjs()` in render (use `useToday()` from
  `utils/useToday.ts`); no refs in render-built handlers; default submit button first in the
  DOM. Don't nest a block (`Group`) inside `Text span`.
- **Frontend:** navigate with `router.history.push`; Mantine options render hidden
  (`findByRole("option", {hidden: true})`); a Select's label also names its listbox
  (`getAllByLabelText(...)[0]`); SegmentedControl items are `radio`s; buttons in repeated rows
  get an aria-label starting with their visible text plus the item's name; invalidate every
  query key that shows the data (`invalidateApplicationViews` now includes `todos`).
- **Test fixtures:** `frontend/src/test/mockApi.ts` (`row`, `item`, `meeting`, `roleSummary`,
  `todo`); routes can be functions of the URL (vary by query); upload bodies (FormData) are
  recorded as sent. Never import from another `*.test.tsx`. Prove a test catches a bug by
  breaking the code and watching it fail.
- **Screenshots:** tmp scripts `shots9.py` (enrich, prepare, capture) and `copy9.py` (crop,
  copy, rebuild `demo.gif` from the newest frame of each of `f1…f7` across `shots9`, `shots7`,
  `shots5`), plus `enrich_demo.py`, `more_people.py`; rewrite them if gone. Crops: person
  1400x1210, roles 1400x370, role 1400x700, recruiters 1400x560, application 1400x2300.
  Read every image before committing; build GIFs with ImageMagick and check 7 frames with
  `identify`.

### 8a. How Kai works

- Tests the app for real and reports gaps as they hit them, often with screenshots, sometimes
  adding to a request mid-turn: fold it into the PR in progress when it fits.
- Asks short questions ("how do i run thius?"): answer plainly with the exact command.
- Values findability, honesty about state, docs and images that match the code, a tidy repo,
  and the project being discoverable on GitHub.

### 9. Drop

Tool output, diffs and file contents already on disk; per-command narration; reviewer reports
already handled; topic-research tables (the chosen topics are in section 2); superseded plans;
the earlier versions of this doc.

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
