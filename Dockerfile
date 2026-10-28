	
# Build frontend
FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY . .
RUN pnpm --dir frontend install --frozen-lockfile \
    && pnpm --dir frontend build

# Runtime
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    JAT_DATA_DIR=/data \
    JAT_HOST=0.0.0.0 \
    JAT_PORT=8770

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY pyproject.toml uv.lock README.md ./
COPY src ./src

RUN uv sync --frozen --no-dev

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN useradd --create-home --uid 10001 jat \
    && mkdir -p /data \
    && chown -R jat:jat /data

USER jat

EXPOSE 8770

CMD ["sh", "-c", "if [ ! -d /data/.git ]; then git -C /data init && git -C /data config user.name 'Job Tracker' && git -C /data config user.email 'job-tracker@localhost'; fi && uv run --no-sync jat init && exec uv run --no-sync jat serve --host 0.0.0.0 --port 8770"]


