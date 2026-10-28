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
- Everything else is unchanged from upstream.

## Running

```bash
docker compose up -d   # builds the frontend, serves the API/UI on http://127.0.0.1:8770
```

Upstream license: Apache-2.0 (see [LICENSE](LICENSE)).
