# Full-stack EDA platform completion report

Delivery branch: `dhc`
Acceptance date: 2026-08-14

## Outcome

The repository now builds and runs as a same-origin React + Fastify + SQLite
platform. Benchmark, Digital, and PPA retain their bundled comparisons and add
authenticated source-run and completed-result import workflows. A draft is
uploaded and frozen, preflighted, shown as a concrete plan, explicitly started,
executed by a persistent module queue, parsed, atomically published, and then
read back by the existing result pages without rebuilding the application.

GitHub Pages remains a read-only result browser. It sets
`VITE_READ_ONLY_DEMO=true`, so it does not advertise login, upload, or Start as
working compute functions.

## Architecture

```text
React UI
  ├─ public bundled + published-result views
  ├─ login, workflow drafts, My Jobs, live Job Detail
  └─ administrator console
         │ same-origin /api
Fastify API
  ├─ session/CSRF/owner/admin guards
  ├─ streaming multipart upload and immutable manifests
  ├─ Benchmark │ Digital │ PPA ModuleAdapterV1 registry
  ├─ tool/technology health registry and audit log
  └─ SQLite repositories + atomic result publisher
         │ persistent queue
Worker supervisor
  ├─ benchmark concurrency group
  ├─ digital concurrency group
  └─ ppa concurrency group
         │ argv arrays, shell=false
Configured EDA executables in job-owned workspaces
```

The shared versioned contract is
[`shared/contracts/v1.ts`](../shared/contracts/v1.ts). The three modules share
only platform services and do not import one another's adapters, parsers, or
result schemas. One `SafeProcessRunner` owns native-process creation, log
limits, timeout, process-group cancellation, environment allowlisting, and
secret redaction.

## Database and migrations

SQLite migrations are applied transactionally and idempotently by
`npm run db:migrate`:

- `001_initial`: users, sessions, tool configurations and health checks,
  technology libraries, jobs, steps, events, artifacts, three module result
  tables, and audit logs;
- `002_cancellation`: persistent cancellation request state.

Every ready job freezes file size/SHA-256, parameters, capability version,
tool-configuration snapshots, probed versions, plan, and workspace. Result
lifecycle (`private`, `published`, `unpublished`, `deleted`) is separate from
job state. Failed or partially parsed work remains diagnostic job output and
never enters a result table.

The legacy importer was verified twice against a fresh database. Its first run
inserted 27 Benchmark, 1,457 Digital, and 56 PPA published
`origin=legacy-bundled` results; its second run inserted zero, proving stable,
idempotent IDs. The retained `data/` directory is not deleted or rewritten by
runtime jobs.

## API

All JSON envelopes use `eda.api.v1`; manifests, plans, capabilities, and results
have their own v1 schema identifiers. OpenAPI is served at `/api/docs` and
`/api/docs/json`. Integration tests assert the required auth, module draft,
job/event/cancel/retry/artifact, three result, and administrator endpoint paths
are present.

Dynamic result lists support visibility, filters, pagination metadata, update
timestamps, and ETags. Job events are persisted before SSE delivery; clients
resume using `Last-Event-ID` or poll Job Detail after a disconnect.

## Delivered tool capabilities

- Benchmark: real adapters for Translator, DC-IV Fitting, Reduction, Expansion,
  and the final SPICE Benchmark. ngspice is usable on this host. Spectre and
  HSPICE stay disabled until their executable plus adapter self-test succeeds.
- Digital: Yosys synthesis/mapping, optional Icarus Verilog/VVP RTL simulation,
  OpenSTA pre-layout timing, mapped cell area, and Liberty static leakage. It
  never relabels leakage as total power.
- PPA: independent OpenROAD-flow-scripts, OpenLane 1, and LibreLane adapters,
  backend-generated configurations, registered technology libraries, bounded
  Cartesian sweeps with one workspace/job/result per point, and the configured
  `result_json_ast.py` normalizer.

Capabilities and controls come from server schemas plus current tool health.
An absent executable, missing dependency, unhealthy self-test, or incompatible
technology is shown as Not configured/Unavailable and blocks preflight. The
audited CLI details and host-specific availability are in
[`tool-capabilities.md`](tool-capabilities.md); this report does not claim that
unconfigured proprietary tools ran.

## Security and failure boundaries

- Production refuses root and requires storage outside the checkout.
- Uploaded paths are normalized; parent/absolute/duplicate/symlink/device and
  configured size/count/quota violations are rejected.
- Executables, adapters, probes, environment names, and PPA config mappings are
  server-owned allowlists. User input is never a shell command.
- Uploaded shell/Python/Make/Tcl files are evidence only. Digital and PPA SDC
  are parsed during preflight and regenerated from conservative command
  subsets. SPICE control/external-command directives and escaping includes are
  rejected. SPICE/Spectre and HDL include closures are scanned recursively;
  HDL host-file, waveform-dump, external-process, and DPI primitives are
  rejected before a compiler or simulator receives input.
- Input bytes are SHA-256 checked again before execution. Tool and technology
  paths are realpath checked. stdout/stderr are separately persisted and
  redacted before storage and streaming.
- Owner/admin checks protect jobs, events, artifacts, private results, and
  downloads. Sessions use HttpOnly/SameSite cookies, production Secure cookies,
  server-side logout, origin checks, and CSRF on writes.
- Timeout/cancel signal the whole process group (TERM then KILL); startup marks
  abandoned running work interrupted while queued jobs remain runnable.
- Atomic publish renames a validated temporary result tree before the database
  transaction. Module queues and failure handling are isolated.

## Administrator bootstrap and configuration

There is no default account or password. After setting the production
environment and migrating:

```bash
EDA_ADMIN_PASSWORD='a-new-long-random-secret' \
  npm run admin:create -- --username platform-admin
```

Remove that environment value immediately. The administrator then creates
users, sets module access/concurrency/quota, configures audited tool paths,
runs Check path / Probe version / Minimal self-test, and registers a technology
library. Concrete Fitting, Spectre, ORFS, and PDK examples are in
[`tool-configuration.md`](tool-configuration.md).

## Startup

Development:

```bash
npm ci
npm run dev:full
```

Production:

```bash
npm ci
npm run build
npm run db:migrate
npm run db:import-legacy
npm run start     # API + built frontend
npm run worker    # exactly one supervisor for this SQLite database
```

Run API and worker as the dedicated non-root service account behind TLS.
Systemd examples, backup/restore, origin/cookie settings, and the one-worker
constraint are in [`deployment.md`](deployment.md).

## Verification evidence

Final local gates:

- typecheck: frontend plus server TypeScript passed;
- lint: ESLint passed with no warnings;
- unit and module: 11 files / 53 tests passed;
- integration: 6 files / 16 tests passed;
- browser E2E: 8/8 passed twice consecutively against independent fresh
  SQLite/storage roots, covering login,
  Benchmark import and source execution, Digital import and Yosys/OpenSTA
  source execution, PPA import and a two-point independent sweep, dynamic
  charts, and administrator operations;
- production build: all data validators, TypeScript, and Vite passed. The sole
  build note is the existing large generated Digital data chunk warning.

Executable evidence lives in:

- [`test/e2e/closed-loop.spec.ts`](../test/e2e/closed-loop.spec.ts) — the three
  user-visible closed loops and administrator path;
- [`test/integration/api-closed-loop.test.ts`](../test/integration/api-closed-loop.test.ts)
  — upload → preflight → Start → process → event/log → atomic result → publish;
- [`test/integration/failure-security.test.ts`](../test/integration/failure-security.test.ts)
  — independent PPA sweep jobs, partial-output containment, timeout/cancel,
  authorization, CSRF, upload attacks, and limits;
- [`test/fixtures/fake-tools/`](../test/fixtures/fake-tools/) — test-only native
  executables and minimum valid outputs. The registry refuses them outside
  `NODE_ENV=test`;
- [`smoke-tests.md`](smoke-tests.md) — post-deployment checks for real configured
  tools;
- [`audits/closed-loop-audit.md`](audits/closed-loop-audit.md) and
  [`audits/security-failure-audit.md`](audits/security-failure-audit.md) — two
  independent post-implementation reviews.

The E2E fixture proves the orchestration contract and parsers without
pretending unavailable commercial/physical tools ran. Real deployed evidence
is retained under `<storageRoot>/jobs/<jobId>/` and
`<storageRoot>/results/<module>/<resultId>/`, with the exact paths, hashes,
tool versions, logs, and artifact IDs available from Job Detail and Result
Detail.
