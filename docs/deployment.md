# Production deployment

The full platform is a same-origin React application, Fastify API, persistent
SQLite database, and one or more workers. GitHub Pages is only the read-only
published-results build; it cannot authenticate users or run EDA tools.

## Host prerequisites

- Linux and Node.js 24 LTS (Node must include `node:sqlite`).
- A dedicated, non-root service account such as `eda-platform`.
- A writable storage root outside the Git checkout.
- EDA tools and PDK files installed read-only for the service account.
- A TLS reverse proxy. API and frontend must have the same public origin.

Do not grant the service account an interactive shell, passwordless sudo, or
write access to tool repositories and PDK installations. Container-backed
flows need narrowly scoped runtime access; membership in a privileged Docker
group should be treated as root-equivalent.

## Install and initialize

```bash
git clone --branch dhc <repository-url> /opt/website-trial-v1
cd /opt/website-trial-v1
npm ci
cp .env.example /etc/website-trial-v1.env
npm run build
set -a; . /etc/website-trial-v1.env; set +a
npm run db:migrate
EDA_ADMIN_PASSWORD='a-new-long-random-secret' npm run admin:create -- --username platform-admin
```

Remove `EDA_ADMIN_PASSWORD` from the environment immediately after bootstrap.
There is no default account, default password, or public registration.

The production environment must set at least:

- `NODE_ENV=production`;
- `EDA_STORAGE_ROOT`, outside the checkout and writable by the service user;
- `EDA_DATABASE_PATH`, normally under the storage root;
- `EDA_PUBLIC_ORIGIN`, the exact external HTTPS origin;
- `EDA_COOKIE_SECURE=true`;
- independent `EDA_BENCHMARK_CONCURRENCY`, `EDA_DIGITAL_CONCURRENCY`, and
  `EDA_PPA_CONCURRENCY` values;
- upload, log, sweep, and cancellation limits appropriate for the host.

`VITE_BASE_PATH` is a build-time setting. Use `/` for a normal same-origin
deployment. `VITE_READ_ONLY_DEMO` must be `false`; the Pages workflow sets it
to `true` intentionally.

## API and worker processes

Run the API and worker as separate services:

```ini
# /etc/systemd/system/eda-api.service
[Unit]
Description=EDA platform API
After=network.target

[Service]
User=eda-platform
Group=eda-platform
WorkingDirectory=/opt/website-trial-v1
EnvironmentFile=/etc/website-trial-v1.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/website-trial-v1

[Install]
WantedBy=multi-user.target
```

Create `eda-worker.service` with the same isolation and
`ExecStart=/usr/bin/npm run worker`. Do not set `EDA_EMBED_WORKER=1` when a
standalone worker is running. For local development only, `npm run dev:full`
starts Vite, API, and worker together.

The API serves `dist/` and `/api/*` on `EDA_PORT`. A reverse proxy should pass
the original Host/protocol, disable response buffering for
`/api/jobs/*/events`, allow the configured multipart body size, and use a
timeout longer than normal API requests for artifact downloads. Never cache
authenticated API responses.

## Post-deploy checks

```bash
curl --fail https://eda.example.edu/api/health
curl --fail https://eda.example.edu/api/docs/json >/dev/null
systemctl is-active eda-api eda-worker
```

Then sign in as the bootstrap administrator, configure and probe each required
tool, register one technology library, and run the smoke checklist in
[smoke-tests.md](smoke-tests.md). A repository path alone is not sufficient;
the latest probe must be healthy before preflight accepts a plan.

## Backups and restore

Back up the database and storage root as one consistency set. Use SQLite's
online backup command while services run, or stop both API and worker before a
filesystem snapshot:

```bash
sqlite3 /var/lib/website-trial-v1/platform.sqlite3 \
  ".backup '/srv/backup/eda/platform-$(date +%F).sqlite3'"
rsync -a --delete /var/lib/website-trial-v1/ \
  /srv/backup/eda/storage-current/
```

Exclude transient `publishing/` directories from restore. Restore the SQLite
file and the matching `jobs/` and `results/` trees together, run
`npm run db:migrate`, then start API and worker. On worker startup, persisted
`running` jobs become `interrupted`; queued jobs remain eligible for execution.

Test restoration periodically on a separate host. Encrypt backups because
inputs, logs, and private artifacts may contain proprietary design data.

## Upgrade and rollback

1. Stop scheduling new work and wait for or cancel running jobs.
2. Back up database and storage.
3. Install dependencies and build the new commit.
4. Run `npm run db:migrate` once.
5. Restart API and worker; run typecheck, health, login, upload/preflight, and
   one job smoke test.

Migrations are forward-only. A code rollback that expects an older schema must
restore the pre-upgrade database backup as well.
