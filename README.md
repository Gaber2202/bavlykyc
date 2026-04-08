# Bavly KYC Management System

Internal web application for Arabic KYC workflows: **admin** and **employee** roles, JWT access/refresh auth, PostgreSQL, audit logging, and admin analytics.

Stack: **FastAPI** (backend), **React + Vite + TypeScript** (frontend), **PostgreSQL**.

---

## Prerequisites

- **Docker** + **Docker Compose v2** (optional but recommended for DB + full stack).
- **Python 3.12** (or 3.9+ with `eval-type-backport`) and **Node 20+** if you run services on the host.
- **PostgreSQL 16** (or use Compose).

---

## 1. Docker Compose (local development)

Runs **PostgreSQL**, the **API** with `--reload` (app code mounted), and **Vite** on port 5173.

```bash
cd /path/to/BavlyKYC
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY to ≥32 random chars (e.g. openssl rand -hex 32)

docker compose up --build
```

| Service     | URL |
|------------|-----|
| Frontend   | http://localhost:5173 |
| API        | http://localhost:8000 |
| PostgreSQL | localhost:5432 (user `postgres`, password `postgres`, DB `bavly_kyc`) |

`docker-compose.yml` overrides `DATABASE_URL` / `DATABASE_URL_SYNC` to use hostname `db`. Other variables come from `backend/.env`.

**Database only** (run API + frontend on the host):

```bash
docker compose up -d db
```

Convenience script (starts `db`, waits until `bavly_kyc` accepts connections):

```bash
./scripts/start-local-db.sh
```

Ensure `backend/.env` uses the **same** credentials when talking to Docker Postgres on **localhost** (not hostname `db`):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bavly_kyc
DATABASE_URL_SYNC=postgresql+psycopg://postgres:postgres@localhost:5432/bavly_kyc
```

The first `docker compose up` creates the **`bavly_kyc`** database automatically (`POSTGRES_DB`). Data persists in the **`kyc_pgdata`** volume until you run `docker compose down -v`.

**PostgreSQL without Docker:** start your Postgres server, connect as a superuser (often `postgres`), then run:

```sql
CREATE DATABASE bavly_kyc OWNER postgres;
```
Or run `scripts/create_database.sql` as the `postgres` superuser.

Point `DATABASE_URL` and `DATABASE_URL_SYNC` in `backend/.env` at that user/database (host `localhost`, port `5432` unless different).

**Open `psql` against that same connection** (after `backend/.env` exists):

```bash
./scripts/psql-connect.sh
./scripts/psql-connect.sh -c "SELECT current_database(), current_user;"
```

Use `postgres` / `postgres` and database `bavly_kyc` in `backend/.env` to match a typical local install.

**Stop / remove containers** (keeps volume `kyc_pgdata`):

```bash
docker compose down
```

---

## 2. Local development without Docker (API + frontend on host)

**Terminal 1 — PostgreSQL**  
Use Docker DB from above, or a local Postgres with matching credentials in `backend/.env`.

**Terminal 2 — Backend**

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # configure SECRET_KEY, DATABASE_URL, CORS_ORIGINS

export DATABASE_URL_SYNC=postgresql+psycopg://postgres:postgres@localhost:5432/bavly_kyc
alembic upgrade head
PYTHONPATH=. python scripts/seed_admin.py

# Optional: login + POST /kyc (needs DB at Alembic head and seeded user)
# TEST_LOGIN_PASSWORD='your-admin-password' PYTHONPATH=. python -m unittest tests.test_kyc_create_http -v

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 3 — Frontend**

```bash
cd frontend
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8000/api/v1
npm install
npm run dev
```

OpenAPI (when `DEBUG=true` or `EXPOSE_DOCS=true`): http://localhost:8000/api/v1/docs

---

## 3. Backend environment variables

Loaded from `backend/.env` (or the process environment). Names match **Pydantic `Settings`** (`app/core/config.py`).

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | **Yes** | Signing key for JWT (≥32 characters). |
| `DATABASE_URL` | **Yes** | Async SQLAlchemy URL, e.g. `postgresql+asyncpg://user:pass@host:5432/db`. |
| `JWT_ALGORITHM` | No | Must be `HS256` (default). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default `30`. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Default `14`. |
| `DEBUG` | No | `true` enables stack traces on 500 and full validation errors. |
| `EXPOSE_DOCS` | No | When `true`, OpenAPI is exposed even if `DEBUG` is false. |
| `API_V1_PREFIX` | No | Default `/api/v1`. |
| `APP_NAME` | No | API title. |
| `CORS_ORIGINS` | **Yes** (prod) | Comma-separated **exact** browser origins (scheme + host + port). |
| `EMPLOYEE_CAN_EDIT_OTHERS_RECORDS` | No | Default `false`; `true` widens employee KYC edit scope. |
| `LOGIN_RATE_LIMIT` | No | slowapi string, e.g. `10/minute`. |
| `AUTH_REFRESH_RATE_LIMIT` | No | Default `30/minute`. |
| `AUTH_CHANGE_PASSWORD_RATE_LIMIT` | No | Default `10/minute`. |
| `DATABASE_URL_SYNC` | For CLI only | Optional explicit sync URL for **Alembic**; if unset, `alembic/env.py` derives from `DATABASE_URL`. |

**Alembic / one-off scripts:** set `DATABASE_URL_SYNC` to a **psycopg** URL when you want to be explicit, e.g. `postgresql+psycopg://user:pass@host:5432/db`.

**Docker production image:** optional `WEB_CONCURRENCY` (default `2`) for Gunicorn worker count.

**Seed script** (`scripts/seed_admin.py`): `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` (see `backend/.env.example`).

---

## 4. Frontend environment variables

Vite only exposes variables prefixed with `VITE_`.

| Variable | Description |
|-----------|-------------|
| `VITE_API_BASE_URL` | Full API base path the **browser** will call, e.g. `https://api.example.com/api/v1` **or** `http://localhost:8000/api/v1`. No trailing slash. |

Copy `frontend/.env.example` → `frontend/.env` for local dev.

**Production Docker build:** pass at build time so the value is baked into static assets:

```bash
docker build -f frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
  -t kyc-frontend .
```

---

## 5. Migration commands (Alembic)

**Shortcut** (from repo root — loads `backend/.env`, activates `backend/.venv` if it exists):

```bash
./scripts/apply_db_schema.sh
```

If the database does not exist yet, create it once as a Postgres superuser with `scripts/create_database.sql`, then run the script above.

From `backend/` with venv activated and sync DB URL available:

```bash
export DATABASE_URL_SYNC=postgresql+psycopg://USER:PASS@HOST:5432/DB
alembic current
alembic upgrade head
alembic downgrade -1   # optional rollback one revision
```

**Inside running API container (Compose):**

```bash
docker compose exec api sh -c 'cd /app && DATABASE_URL_SYNC=postgresql+psycopg://postgres:postgres@db:5432/bavly_kyc alembic upgrade head'
```

Run migrations **once per release** before or alongside new API instances (avoid concurrent upgrades from multiple pods unless your process guarantees a single leader).

---

## 6. Seed commands (initial admin)

Creates an admin user if the username does not exist. Uses `DATABASE_URL` from the environment.

**Host:**

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bavly_kyc
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='YourStrongPassw0rd!'
PYTHONPATH=. python scripts/seed_admin.py
```

**Compose:**

```bash
docker compose exec api sh -c 'cd /app && ADMIN_PASSWORD="YourStrongPassw0rd!" PYTHONPATH=/app python scripts/seed_admin.py'
```

---

## 7. Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | **Liveness** — process responding (cheap). |
| `GET /health/ready` | **Readiness** — `SELECT 1` against PostgreSQL; **503** if the DB is unreachable. |

These routes are **not** under `/api/v1`.

Configure load balancers / Kubernetes probes: liveness → `/health`, readiness → `/health/ready`.

---

## 8. CORS setup

- Set `CORS_ORIGINS` to every origin the SPA may use, comma-separated, **no spaces**, e.g. `https://kyc.example.com,https://www.kyc.example.com`.
- Origins must match the browser address exactly (`https` vs `http`, port included for non-443).
- The API allows methods `GET, POST, PUT, PATCH, DELETE, OPTIONS` and headers `Authorization`, `Content-Type`, `Accept`. Extend `app/main.py` if you add custom headers.
- After changing CORS, restart the API process.

---

## 9. Reverse proxy (TLS and routing)

- Terminate **TLS** at nginx, Traefik, or a cloud LB; enable **HSTS** on public hostnames.
- Forward `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` so rate limits and audit IP behave correctly. Only trust forwarded headers from your own proxy.
- Example nginx layout: `deploy/nginx.reverse-proxy.example.conf`.
- Production Compose pattern (API + static web): `deploy/docker-compose.prod.example.yml` (adapt env + remove healthcheck if you change images).

### Vercel (SPA)

This app is a client-side React router SPA. Deploy the static `frontend` build; the **FastAPI backend is not on Vercel** — it runs on another host (VPS, Render, Railway, etc.).

#### What connects to the backend from Vercel?

There is **only one** setting on the Vercel project that points the browser at your API. Everything else is on the **backend** (`CORS_ORIGINS`, public URL, TLS).

| Where | Variable | Required | Purpose |
|--------|-----------|----------|--------|
| **Vercel** → Project → Settings → Environment Variables | `BACKEND_API_ORIGIN` | **Yes** (for this repo’s proxy) | **Another host** where FastAPI runs — **not** your `*.vercel.app` URL (same domain loops and breaks login). Example: `https://kyc-api.onrender.com` with **no** `/api/v1`. Proxy: **`api/v1/[...slug].js`**. |
| **Vercel** build (root **`vercel.json`** → `build.env`) | `VITE_API_BASE_URL` | Default `/api/v1` | Browser calls **same** Vercel host (e.g. `https://project-w8zqj.vercel.app/api/v1/...`). Override in the dashboard if you point the SPA at an external API instead. |
| **Backend** `.env` / host env | `CORS_ORIGINS` | **Yes** | Must include your SPA origin, e.g. `https://project-w8zqj.vercel.app` (comma-separated, no spaces, no trailing slash). |

No other `VITE_*` vars in this repo talk to the API. Code reference: `frontend/src/services/api.ts` (`import.meta.env.VITE_API_BASE_URL`).

#### Checklist (update after any URL change)

1. **Vercel → Environment Variables:** set **`BACKEND_API_ORIGIN`** to your real API origin (example: `https://my-api.onrender.com`). No path suffix; the proxy appends `/api/v1/...` from the incoming URL.
2. **Redeploy** after changing root `vercel.json` `build.env` or `BACKEND_API_ORIGIN`.
3. **Backend:** set `CORS_ORIGINS` to include **`https://project-w8zqj.vercel.app`** (and preview URLs if you use them). Restart the API.
4. **Network tab:** on [https://project-w8zqj.vercel.app](https://project-w8zqj.vercel.app), requests should hit **`/api/v1/...`** on the same host (proxied), not `localhost`.

#### Root Directory

- Leave **Root Directory empty** (repository root). Build copies **`frontend/dist` → `public/`** so static output sits next to **`api/`** (using only `frontend/dist` as `outputDirectory` can drop serverless routes and cause **POST → 405**). SPA rewrite: **`/(.*)` → `/index.html`**; proxy: **`api/v1/[...slug].js`**.
- Do **not** set Root Directory to **`frontend`** unless you add your own `frontend/vercel.json` and `frontend/api/` again — the committed layout assumes **monorepo root**.

If the build fails with **`vite: command not found`** / **127**, clear Vercel **Build Command** overrides (bare `vite build` fails). Root `vercel.json` already uses **`node ./node_modules/vite/bin/vite.js build`** after `cd frontend`.

If you see **NOT_FOUND** (`bom1::…`): confirm Root Directory is **empty**, **`BACKEND_API_ORIGIN`** is set, and redeploy **Production**.

**Separate API subdomain (recommended for this repo):**

- SPA at `https://kyc.example.com` (static or small nginx container, e.g. frontend image on port 8080).
- API at `https://api.kyc.example.com` → upstream Gunicorn/Uvicorn :8000.
- Set `VITE_API_BASE_URL=https://api.kyc.example.com/api/v1`.

---

## 10. Logging

- Containers should log to **stdout/stderr**; `PYTHONUNBUFFERED=1` is set in the backend image for timely logs.
- **Gunicorn** (default Docker `CMD`) writes access and error logs to `-` (stdout/stderr). Tune `WEB_CONCURRENCY` for CPU cores.
- For self‑hosted: ship logs with your platform (CloudWatch, Datadog, Loki, ELK). Avoid logging JWTs, passwords, or full request bodies containing PII.
- Uvicorn alone (dev): `--log-level info`.

---

## 11. Backups and PostgreSQL

- Take regular **logical dumps** (`pg_dump`) or use managed Postgres PITR; encrypt backup storage.
- Test **restore** to a staging cluster periodically.
- Protect connection strings and `SECRET_KEY` like production secrets.
- Soft-deleted KYC rows remain in the DB (`deleted_at`); backups retain them unless you enforce retention policies separately.

---

## 12. Production API image (build & run)

```bash
cd backend
docker build -t kyc-api .
docker run --rm -p 8000:8000 \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  -e DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/bavly_kyc \
  -e CORS_ORIGINS=https://kyc.example.com \
  -e WEB_CONCURRENCY=4 \
  kyc-api
```

Run **migrations** before traffic (job or entry step): `alembic upgrade head` with `DATABASE_URL_SYNC`.

---

## 13. Production frontend static build (host or nginx image)

```bash
cd frontend
export VITE_API_BASE_URL=https://api.example.com/api/v1
npm ci
npm run build
# Serve the `dist/` directory with any static host or use frontend/Dockerfile (nginx on 8080).
```

---

## 14. Production VPS (Hostinger — `187.127.142.186`)

This repo is wired for a **single public IP** with **path-based routing**: the browser loads the SPA at `http://187.127.142.186` and calls the API at `http://187.127.142.186/api/v1` (host nginx proxies to containers bound on localhost).

**Security:** The IP and `root` SSH user are documented here for your ops runbook. Use **SSH keys**, disable password login, and restrict **port 22** (e.g. allowlist your IP). Add **HTTPS + a real domain** when DNS is ready (`deploy/nginx.reverse-proxy.example.conf` + certbot).

### 14.0 Complete installation checklist (do in order)

Use this if anything was skipped or the stack is half-installed.

| Step | What | Done? |
|------|------|-------|
| 1 | **Docker Engine + Compose plugin** installed and `docker compose version` works ([Ubuntu install](https://docs.docker.com/engine/install/ubuntu/)). | ☐ |
| 2 | **git**, **nginx**, **curl** on the host: `sudo apt update && sudo apt install -y git nginx curl` | ☐ |
| 3 | **Firewall:** §14.1 (`ufw` allows SSH, 80, 443). | ☐ |
| 4 | Repo at **`/opt/BavlyKYC`** (`git clone` §14.2) and **`git pull`** for latest. | ☐ |
| 5 | **`/opt/BavlyKYC/deploy/.env`** exists (copy from `vps.bavlykyc.env.example`); includes **`SECRET_KEY`** (≥32 chars), **`DATABASE_URL`** / **`DATABASE_URL_SYNC`**, **`POSTGRES_PASSWORD`**, **`CORS_ORIGINS`**. **`VITE_API_BASE_URL`** is optional (omit = bundle uses same-origin **`/api/v1`**). | ☐ |
| 6 | **Host nginx** §14.3 — site enabled, `default` removed, `sudo nginx -t` OK, `systemctl reload nginx`. | ☐ |
| 7 | **Containers:** from `deploy/`, `docker compose -f docker-compose.vps.yml --env-file .env up -d --build` — `docker compose ... ps` shows **db**, **api**, **web** **running**. | ☐ |
| 8 | **Migrations** (once per empty DB): §14.4 `alembic upgrade head`. | ☐ |
| 9 | **Admin seed** (once): §14.4 `seed_admin.py`. | ☐ |
| 10 | **Verify** §14.5: `curl` health URLs + browser login. If `api` is not up, §14.7. | ☐ |

**You are not done until steps 7–10 pass.** Common gaps: nginx not installed, `.env` only partially filled, migrations/seed skipped, or Postgres volume password mismatch (§14.7).

### 14.1 SSH and firewall (on the VPS)

```bash
ssh root@187.127.142.186
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Install Docker + Compose plugin, git, and nginx (see [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)).

### 14.2 Clone and configure

```bash
sudo mkdir -p /opt && sudo chown "$USER:$USER" /opt
cd /opt
git clone https://github.com/Gaber2202/bavlykyc.git BavlyKYC
cd BavlyKYC/deploy
cp vps.bavlykyc.env.example .env
nano .env   # set SECRET_KEY (openssl rand -hex 32), POSTGRES_PASSWORD, matching DATABASE_* URLs
```

### 14.3 Host nginx (port 80 → API + SPA)

```bash
sudo cp /opt/BavlyKYC/deploy/nginx.vps-ip-path.example.conf /etc/nginx/sites-available/bavlykyc
sudo ln -sf /etc/nginx/sites-available/bavlykyc /etc/nginx/sites-enabled/bavlykyc
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 14.4 Start Postgres + API + web (Docker)

```bash
cd /opt/BavlyKYC/deploy
docker compose -f docker-compose.vps.yml --env-file .env up -d --build
```

**After `git pull` (recommended — avoids stale API images):** from `deploy/`, run **`chmod +x vps-redeploy.sh && ./vps-redeploy.sh`**. That rebuilds **`api`** and **`web`** with **`--no-cache`**, recreates containers, and runs **`alembic upgrade head`**. Compose uses **fixed image names** (`bavlykyc-api:kyc-schema-v4`, etc.) so Docker does not keep serving an old anonymous `*-api` layer with pre-v2 KYC validation.

**First-time schema** (once per empty database):

```bash
cd /opt/BavlyKYC/deploy
docker compose -f docker-compose.vps.yml --env-file .env run --rm api sh -c 'cd /app && alembic upgrade head'
```

**Seed admin** (once):

```bash
docker compose -f docker-compose.vps.yml --env-file .env exec api \
  sh -c 'cd /app && ADMIN_USERNAME=admin ADMIN_PASSWORD="YourStrongPassword" PYTHONPATH=/app python scripts/seed_admin.py'
```

### 14.5 Verify

```bash
curl -sS http://187.127.142.186/health
curl -sS http://187.127.142.186/health/ready
```

Open `http://187.127.142.186` in a browser and sign in. If the UI cannot reach the API, confirm **`CORS_ORIGINS`** is exactly **`http://187.127.142.186`** (no trailing slash). Rebuild **`web`** after any **`VITE_API_BASE_URL`** change (`docker compose ... build --no-cache web` then `up -d`). If the error toast shows **`localhost:8000`**, the bundle was built with the old Docker default or you are in **`npm run dev`** without `frontend/.env` — pull latest, rebuild **`web`**, or set **`VITE_API_BASE_URL`** for local dev.

### 14.6 Deploy updates from your laptop (optional)

```bash
cd /path/to/BavlyKYC
chmod +x scripts/sync-to-vps.example.sh
./scripts/sync-to-vps.example.sh
ssh root@187.127.142.186 'cd /opt/BavlyKYC/deploy && chmod +x vps-redeploy.sh && ./vps-redeploy.sh'
```

| File | Role |
|------|------|
| `deploy/vps.bavlykyc.env.example` | Copy to `deploy/.env` on the server |
| `deploy/docker-compose.vps.yml` | `db` + `api` + `web`; **versioned `image:`** for api/web (avoids stale schema) |
| `deploy/docker-compose.vps.example.yml` | Same content as above (legacy `-f` name) |
| `deploy/vps-redeploy.sh` | Hard rebuild api + web + migrations after `git pull` |
| `deploy/diagnose-vps-api.sh` | What listens on :8000, `/health`, and `/api/v1` headers (find wrong/old API) |
| `deploy/nginx.vps-ip-path.example.conf` | Host nginx for `187.127.142.186` |
| `scripts/sync-to-vps.example.sh` | `rsync` to `root@187.127.142.186:/opt/BavlyKYC` |

### 14.7 Troubleshooting: `api` not running

Run **from** `/opt/BavlyKYC/deploy` (so `deploy/.env` and paths resolve):

```bash
cd /opt/BavlyKYC/deploy
docker compose -f docker-compose.vps.yml --env-file .env ps -a
docker compose -f docker-compose.vps.yml --env-file .env logs db --tail 80
docker compose -f docker-compose.vps.yml --env-file .env logs api --tail 120
```

| Symptom | Likely cause |
|--------|----------------|
| `api` **Created** but not **Up**; `db` not healthy | DB failing (see `logs db`). Often a **volume** was initialized with a **different** `POSTGRES_PASSWORD` — fix: `docker compose ... down`, remove volume `kyc_pgdata_vps` (wipes DB), `up` again, re-run migrations + seed. |
| `api` **Exited** with pydantic / `ValidationError` | Missing or invalid `SECRET_KEY` (min 32 chars), `DATABASE_URL`, or `CORS_ORIGINS` in `deploy/.env`. |
| `api` **Restarting**; logs show OOM or worker boot errors | Small VPS: set `WEB_CONCURRENCY=1` in `deploy/.env` and `up -d --build` again. |
| Compose error `set SECRET_KEY in deploy/.env` | Run with `--env-file .env` from `deploy/`, or ensure those variables exist in `.env` (no typos). |
| **422** saving KYC: `service_type` not one of the four branches (`بافلي الاسكندرية`, `بافلي القاهرة`, `ترانس روفر الاسكندرية`, `ترانس روفر القاهرة`), kinship errors, or **`relatives_kinship: Extra inputs are not permitted`** | **Stale API code/image** (old literals / no `relatives_kinship` column). **Rebuild and recreate `api`**, run **`alembic upgrade head`**. Locally verify schema: `cd backend && PYTHONPATH=. python -m unittest discover -s tests -p 'test_*.py' -v`. |
| VPS works locally but errors mention **`بافلي`/`ترانس روفر`/`أخرى`** and **Extra inputs** for `assigned_to` / `relatives_kinship` | **Traffic is not hitting the current FastAPI build.** Common causes: (1) **`docker compose pull`** pulled a **wrong** image named like `bavlykyc-api` from a registry — this repo now uses **`bavlykyc-stack-api`** / **`bavlykyc-stack-web`** so only **local builds** apply. (2) **Another process** still bound to **port 8000** (old uvicorn/systemd). (3) Browser calls a **different API host** (check DevTools → Network → request URL). Run **`./diagnose-vps-api.sh`**, then **`./vps-redeploy.sh`**. New API adds **`X-BavlyKYC-Contract`** on **`/api/v1/*`** responses — if that header is missing, you are not on the new container. |

**One-off API foreground run** (see the crash without restart loop):

```bash
cd /opt/BavlyKYC/deploy
docker compose -f docker-compose.vps.yml --env-file .env run --rm --no-deps --service-ports api \
  sh -c 'gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:8000 --access-logfile - --error-logfile -'
```

### 14.8 UI updates not showing on the VPS

Usually the server is fine but the **browser** keeps an old **`index.html`**, so it still requests **old hashed JS/CSS** files. The frontend image now sends **`Cache-Control: no-cache`** for the SPA shell; rebuild **web** so that applies.

**On the VPS — force a fresh image and restart:**

```bash
cd /opt/BavlyKYC
git pull origin main
cd deploy
docker compose -f docker-compose.vps.yml --env-file .env build --no-cache web
docker compose -f docker-compose.vps.yml --env-file .env up -d --force-recreate web
# If backend changed too:
docker compose -f docker-compose.vps.yml --env-file .env build --no-cache api
docker compose -f docker-compose.vps.yml --env-file .env up -d --force-recreate api
```

**Verify the new bundle is live** (filename changes after each Vite build):

```bash
docker compose -f docker-compose.vps.yml --env-file .env exec web \
  sh -c 'grep -o "assets/index-[^\"]*\\.js" /usr/share/nginx/html/index.html | head -1'
curl -sS http://127.0.0.1:8080/ | grep -o 'assets/index-[^"]*\.js' | head -1
```

**In the browser:** hard refresh (**Ctrl+Shift+R** / **Cmd+Shift+R**) or open the site in a **private window**.

**Still old?** Confirm `git log -1` on the VPS matches GitHub, and that you are not editing a **different clone path** than the one Compose builds (`../frontend` relative to `deploy/`).

---

## Security (summary)

- Strong `SECRET_KEY`, `DEBUG=false`, narrow `CORS_ORIGINS`, TLS at the edge.
- Details: see **Security defaults** in earlier sections and `backend/app/core/config.py`.

---

## Feature overview (delivered)

- Auth: Argon2, JWT access + DB-backed refresh rotation, rate limits, inactive users.
- KYC CRUD with conditional validation, soft delete (admin), audit trail (includes أملاك / حساب دولاري / حساب بنكي مصري / سجل تجاري وبطاقة ضريبية — migration `0006`).
- Admin: users, analytics, audit log.
- Frontend: RTL Arabic UI, feature-based layout, role-aware navigation.

---

## Project structure (abbrev.)

```
backend/
  app/                 # FastAPI application
  alembic/             # migrations
  scripts/seed_admin.py
  Dockerfile
  .env.example

frontend/
  src/
  Dockerfile
  nginx.conf
  .env.example

deploy/
  nginx.reverse-proxy.example.conf
  nginx.vps-ip-path.example.conf   # HTTP + path routing for 187.127.142.186
  docker-compose.prod.example.yml
  docker-compose.vps.yml   # db + api + web for Hostinger VPS
  vps.bavlykyc.env.example         # env template for that VPS

docker-compose.yml     # local dev (db + api + vite)
scripts/start-local-db.sh     # start db only + wait for ready
scripts/apply_db_schema.sh    # alembic upgrade head (local Postgres)
scripts/sync-to-vps.example.sh  # rsync to root@187.127.142.186:/opt/BavlyKYC
scripts/create_database.sql   # one-time CREATE USER / CREATE DATABASE
scripts/psql-connect.sh       # open psql using backend/.env DATABASE_URL
```

---

## Smoke test checklist

- [ ] Login / refresh / logout; expired refresh rejected.
- [ ] `GET /health` and `GET /health/ready` return 200 when DB is up.
- [ ] Employee: KYC list/detail/create/edit within scope; admin: full access and analytics.
- [ ] CORS: browser calls API from the configured SPA origin only.
