# Job lifecycle and recovery

A job is an immutable input manifest, parameter set, capability version, tool
configuration snapshots, observed versions, execution plan, step/event log,
and optional result link. SQLite is authoritative; browser memory is not.

## State machine

```text
draft → validating → ready → queued → running → succeeded
                    │         │         ├──────→ failed
                    │         └─────────┴──────→ cancelled
                    └──────────────────────────→ failed
                                      running → interrupted (worker restart)
```

- `draft`: multipart upload exists but remains editable.
- `validating`: backend adapter checks mapping, parameters, health, technology,
  and constructs the exact plan.
- `ready`: inputs and the plan are frozen; no tool has run.
- `queued`: the user explicitly clicked Start.
- `running`: the matching module worker claimed the persisted job.
- terminal states retain inputs, logs, outputs, errors, and artifacts.

Results have their own lifecycle: `private`, `published`, `unpublished`, or
`deleted`. Job success does not imply public visibility.

## Workspaces

Each job owns exactly one tree beneath the configured storage root:

```text
jobs/<jobId>/
  input/
  work/
  output/
  logs/
  artifacts/
  manifest.json
```

Adapters execute only in this tree, write no result into their repositories,
and may access server-owned PDK/tool inputs read-only. Normalized publication
first copies declared regular files into `publishing/`, validates the parser
record and quota, atomically renames to `results/<module>/<resultId>/`, then
commits result/artifact/job rows in one database transaction. Any error removes
the staging/final directory and leaves `resultId` null. Partial output is kept
in the job workspace for diagnosis but never enters charts.

## Queues and concurrency

Benchmark, Digital, and PPA have independent persistent queue workers and
concurrency limits. A long Benchmark task consumes only Benchmark capacity; a
PPA adapter exception fails that job without stopping the Digital queue.
Per-user active-job and per-tool concurrency limits apply in addition to module
limits.

Sweep cardinality is computed during preflight and rejected above the
configured maximum. Each supported PPA sweep point must be materialized as an
independent child job/workspace linked to its parent; one failed point must not
delete successful siblings.

## Progress and logs

Every state/step transition and stdout/stderr chunk becomes a persisted
`job_events` record with increasing sequence. The detail page connects to:

```text
GET /api/jobs/<jobId>/events
Accept: text/event-stream
Last-Event-ID: <last received ID>
```

The server emits `job-event` records and a terminal `end` event. If SSE is
disconnected, poll `?stream=false&after=<id>` and reconnect from the last ID.
Logs are size-limited and sensitive allowlisted environment values are redacted.

## Cancellation

`POST /api/jobs/<id>/cancel` persists the request first. A queued job becomes
cancelled without execution. For a running job, the worker abort signal sends
SIGTERM to the detached process group, waits `EDA_CANCEL_GRACE_MS`, then sends
SIGKILL if needed. The worker marks the active step and job `cancelled`, retains
logs, and does not publish a result. Child helpers in the same process group
must not survive.

## Restart behavior

On worker initialization:

- persisted `running` jobs and running steps become `interrupted` with
  `WORKER_RESTART` and are retryable;
- persisted `queued` jobs remain queued and are claimed normally;
- terminal and ready/draft jobs are unchanged.

An interrupted or other terminal job can be retried. Retry creates a new ID,
copies immutable inputs, links `retryOfJobId`, and queues a new execution. Clone
creates an editable draft from the old manifest/parameters. Neither action
rewrites the original audit trail.

## Access control

Owners and administrators can view a private job, events, and artifacts.
Another ordinary user receives `404` so private resource existence is not
disclosed. Public/anonymous users can see only published results and published
artifacts. Cross-owner administrator downloads are audited.
