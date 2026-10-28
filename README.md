<div align="center">

# 🎯 Job Application Tracker

**A fork with i18n and a Russian UI** of
[waddington/job-application-tracker](https://github.com/waddington/job-application-tracker) — a
self-hosted job application tracker for software engineers: kanban board, recruiter CRM,
interview rounds, offers side by side, funnel analytics. Your data lives locally: SQLite plus
plain files, no account, no cloud.

</div>

## What this fork adds

- **i18n**: a small dependency-free module (`frontend/src/i18n`) with typed per-area dictionaries,
  `{var}` interpolation and plural forms; an **EN / RU** toggle in the header switches the
  language — it defaults to the browser language and the choice is remembered.
- Dates follow the UI language, not the operating system's locale.
- **A Docker deployment** (upstream has it on its roadmap): see below.

## Deployment

Clone and run — Compose builds the frontend and the Python app from this repository:

```bash
git clone https://github.com/mentalko/job-application-tracker.git
cd job-application-tracker
docker compose up -d --build      # → http://127.0.0.1:8770
```

Data lives in the `jat_data` volume — a folder at `/data` inside the container that the app keeps
as a git repo, so history and backups come for free. It survives rebuilds and container
recreations.

- Stop / start: `docker compose stop` / `docker compose start`; `docker compose down` keeps the volume.
- Update: `git pull && docker compose up -d --build`.
- Health: `curl http://127.0.0.1:8770/api/v1/health`.

**Without Docker** (Linux/macOS; Python 3.12+ with [uv](https://docs.astral.sh/uv/), Node 22+ for
the frontend build — the [upstream guide](https://github.com/waddington/job-application-tracker/blob/main/docs/guide/README.md)
covers the details):

```bash
uv sync
pnpm --dir frontend install && pnpm --dir frontend build
uv run jat init
uv run jat serve            # → http://127.0.0.1:8770
```

Upstream license: Apache-2.0 (see [LICENSE](LICENSE)).
