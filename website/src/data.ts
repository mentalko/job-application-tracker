// The landing page's words in one place, so the page and its structured data (JSON-LD) agree.
// Keep them honest: only what's merged, and the status as the README gives it.

export const REPO = "https://github.com/waddington/job-application-tracker";
export const SITE_URL = "https://waddington.github.io/job-application-tracker/";
// The user guide lives on GitHub; the site links to it.
export const GUIDE = `${REPO}/blob/main/docs/guide/`;
export const TITLE = "Job Application Tracker: the open-source, self-hosted job search tracker";
export const DESCRIPTION =
  "A free, open-source, self-hosted job application tracker for software engineers. Kanban board, recruiter CRM, interview rounds, follow-up reminders, offers side by side and a Sankey funnel. Local-first: your data stays on your machine.";

export const ROTATING = ["application", "recruiter", "interview round", "follow-up", "offer", "ghosting"];

export const MARQUEE = [
  [
    "Kanban board",
    "Recruiter CRM",
    "Interview rounds",
    "Sankey funnel",
    "Offers side by side",
    "Next actions",
    "Timeline",
    "To-dos",
  ],
  [
    "Markdown notes",
    "CV versions",
    ".eml import",
    "Full-text search",
    "Duplicate warnings",
    "Git snapshots",
    "Roles to decide",
    "Recruiter scorecard",
  ],
];

export const STATS = [
  { value: 0, suffix: "", label: "accounts to create" },
  { value: 0, suffix: "", label: "bytes of telemetry" },
  { value: 100, suffix: "%", label: "of your data on your disk" },
  { value: 26, suffix: "", label: "features built" },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Is it free?",
    a: "Yes. It's open source under the Apache-2.0 licence. No plans, no seats, no trial.",
  },
  {
    q: "Where is my data stored?",
    a: "In one folder on your own machine that you choose, kept separate from the code: a SQLite database, a readable JSON Lines export, your Markdown notes and your files. Nothing is uploaded anywhere.",
  },
  {
    q: "Does it scrape LinkedIn or job boards?",
    a: "No. By design it tracks the applications you make. It never searches for jobs, never fetches from the web and never contacts anyone.",
  },
  {
    q: "What do I need to run it?",
    a: "It's a developer tool: Python 3.12+ with uv, Node.js 22.12+ with pnpm to build the web UI, and git for automatic snapshots. Linux or macOS. Ideally your data folder is a private git repo, so every change is backed up.",
  },
  {
    q: "How do I back it up?",
    a: "If the data folder is a git repo, the app commits a snapshot after each burst of changes and `jat push` sends them to your private remote. For a single file, download a zip from the sidebar or run `jat archive`.",
  },
  {
    q: "Can I use it on two computers?",
    a: "Yes, one at a time: clone your private data repo on the second machine, point JAT_DATA_DIR at it and run `jat init`. When you switch, push on one, then pull and `jat restore --force` on the other.",
  },
  {
    q: "Can I use it for non-software jobs?",
    a: "Yes. It's built with tech hiring in mind (recruiters, coding interviews, take-home tasks), but the stages are yours to configure in config.toml.",
  },
  {
    q: "Is it ready?",
    a: "Yes. Every planned feature is built, and it's in daily use for a real job search. The version is still 0.1.0 only because it hasn't been bumped to 1.0 yet. Issues and pull requests are very welcome.",
  },
  {
    q: "Is it multi-user?",
    a: "No. It's a personal tool for one job seeker, running on localhost.",
  },
];

export const STACK = [
  "Python 3.12",
  "uv",
  "FastAPI",
  "SQLAlchemy",
  "Alembic",
  "SQLite",
  "React 19",
  "TypeScript",
  "Mantine",
  "TanStack",
  "d3-sankey",
  "Vite",
];
