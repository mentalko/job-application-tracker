# Contributing

Thanks for thinking about it. Job Application Tracker is ready and in daily use (version
0.1.0, not yet bumped to 1.0). Bug reports, ideas and pull requests all help.

## Ways to help

- **Report a bug.** [Open an issue](https://github.com/waddington/job-application-tracker/issues/new?template=bug_report.yml)
  with what you did, what you expected and what happened. Screenshots help.
- **Suggest a feature.** [Describe the problem](https://github.com/waddington/job-application-tracker/issues/new?template=feature_request.yml)
  it would solve in your own job search, not just the button you'd add.
- **Improve the docs.** The [user guide](docs/guide/README.md) is plain Markdown in
  `docs/guide/`.
- **Send a pull request.** For anything bigger than a small fix, open an issue first so we can
  agree on the approach.
- **Star the repo.** It helps other job seekers find it.

## Privacy first

It's a job-search tool, so real people and companies turn up quickly. In issues, tests,
fixtures, screenshots and docs, use made-up data only: fictional companies (Contoso,
Fabrikam, Northwind Talent…), fictional people (Alex Morgan, Riley Chen…) and `example.com`
addresses. Never paste your own data folder into an issue.

Some things the project deliberately doesn't do: scrape job boards or LinkedIn, fetch data
from the web, contact anyone, or send telemetry. Pull requests that add these won't be merged.

## Set up for development

You need Python 3.12+ with [uv](https://docs.astral.sh/uv/), Node.js 22.12+ with
[pnpm](https://pnpm.io/), and git. Linux or macOS.

```bash
git clone https://github.com/waddington/job-application-tracker.git
cd job-application-tracker
uv sync
pnpm --dir frontend install
uv run python scripts/seed_demo.py /tmp/jat-demo     # made-up demo data
```

Run the API with reloading, and the web UI with hot reloading, in two terminals:

```bash
uv run jat --data-dir /tmp/jat-demo serve --dev     # API on http://127.0.0.1:8770
pnpm --dir frontend dev                             # UI on http://127.0.0.1:5173 (proxies /api)
```

## Where things are

| Path | What's there |
|---|---|
| `src/jat/` | The backend: FastAPI app, SQLAlchemy models, Alembic migrations, the `jat` CLI |
| `tests/` | Backend tests (pytest) |
| `frontend/` | The web UI: React, TypeScript, Mantine, TanStack Router and Query |
| `docs/guide/` | The user guide |
| `website/` | The project website: one Astro landing page |
| `scripts/` | Demo data (`seed_demo.py`) and the README's demo GIF |
| `docs/prd/`, `docs/rfc/`, `docs/ROADMAP.yaml` | The product plan, design decisions and roadmap |

## Checks

Run these before opening a pull request. They must all pass.

```bash
uv run pytest -q
uv run ruff check src tests
uv run ruff format --check src tests
pnpm --dir frontend typecheck
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend format:check
```

If you change an API route or schema, regenerate the OpenAPI spec and the frontend's types,
and commit both (`tests/test_openapi.py` fails if they drift):

```bash
uv run python -m jat.openapi
pnpm --dir frontend gen:api
```

## The website

The site at <https://waddington.github.io/job-application-tracker/> lives in `website/`: one
landing page that links to the guide here on GitHub. It copies the screenshots from
`docs/screenshots/`, so retaken screenshots show up there too.

```bash
pnpm --dir website install
pnpm --dir website dev       # http://localhost:4321/job-application-tracker/, hot reloading
pnpm --dir website build     # the static site in website/dist
pnpm --dir website preview   # serve that build locally
```

Colours come from palettes in `website/src/styles/landing.css`; the site uses `paper`. In
`pnpm dev` only, a switcher in the bottom-left corner (or `?palette=forest`, `ember`,
`indigo`) previews the others. The built site leaves both out.

## Pull requests

- One logical change per pull request, with tests for new behaviour.
- [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
  (`feat: …`, `fix: …`, `docs: …`).
- Update the docs in the same pull request: the [user guide](docs/guide/README.md) for
  anything a user can see or configure, the README's feature table and `llms.txt` for new
  features, and `CHANGELOG.md`.
- If the change is visible in a README screenshot, retake it with the demo data.

By contributing, you agree that your contributions are licensed under the
[Apache-2.0 licence](LICENSE).
