# Production-oriented API image
FROM python:3.12-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts

EXPOSE 8000

# Default: multi-worker via Gunicorn + Uvicorn workers.
# Override for local docker-compose hot reload: see docker-compose.yml
ENV WEB_CONCURRENCY=2
CMD sh -c 'exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker \
    -w "${WEB_CONCURRENCY}" \
    -b 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile -'
