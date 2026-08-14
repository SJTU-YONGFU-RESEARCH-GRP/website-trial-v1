# Administrator guide

Administrators manage identities, immutable tool revisions, technology
libraries, jobs, results, storage, and audit evidence from `/admin`. All
mutating actions require an authenticated admin session and CSRF token and are
written to `audit_logs`.

## Bootstrap and users

Create the first administrator on the server:

```bash
EDA_ADMIN_PASSWORD='a-new-long-random-secret' \
  npm run admin:create -- --username platform-admin
```

The command refuses to invent a password. In an interactive terminal the
password can be entered at the hidden prompt; automation may provide it through
stdin or the temporary environment variable above.

In **Admin → Users**, an administrator can:

- create an `admin` or `user` account;
- enable/disable an account;
- choose allowed Benchmark, Digital, and PPA modules;
- set per-user active-job and storage limits;
- reset a password without reading the previous password;
- soft-delete an account while retaining provenance and audit history.

Disabling, deleting, or resetting a user revokes that user's active sessions.
Do not share administrator accounts.

## Tools

Use **Admin → Tools**. Select an audited catalog entry, then enter only the
installation paths and adapter-approved values. Administrators do not enter a
shell command. Saving creates a new immutable revision rather than changing the
snapshot already frozen into a job.

For every revision run, in order:

1. **Check paths** — realpath, regular-file/executable, root and entry checks.
2. **Probe version** — the adapter's fixed version argv.
3. **Run minimal self-test** when the adapter defines one.

The job UI enables a capability only after the required executable and parser
have current healthy evidence. See [tool-configuration.md](tool-configuration.md).

## Technology libraries

In **Admin → Technology**, register a revision containing technology ID,
process node, PDK, standard-cell library, Liberty paths, tech LEF, cell LEFs,
corner, voltage, RC corner, and allowed adapter IDs. Paths must be absolute,
server-owned, and readable by the worker. Register separate revisions for
different corners or PDK releases; existing jobs retain the selected ID and
revision.

## Jobs and diagnostics

**Admin → Jobs** exposes every owner and supports module/status/user/tool
filters. Administrators may inspect logs, request cancellation, retry terminal
jobs, mark a genuinely stale process interrupted, download a diagnostic ZIP,
and clean retained work/output directories after a job is terminal.

- Cancel first sends SIGTERM to the process group and SIGKILL after the grace
  period.
- Cleanup preserves the input manifest, logs, and published artifacts.
- Never mark an actively executing job interrupted; request cancellation and
  wait for the worker to persist the terminal state.
- A retry creates a new job with linked provenance. It never mutates the old
  record.

## Results

Computed and imported results start as private. **Admin → Results** can publish,
unpublish, or mark them deleted. Publication changes visibility only; it does
not recalculate the immutable normalized data or provenance. A failed job never
has a result to publish.

Before publishing, inspect:

- input manifest hash and parameters;
- tool configuration revisions and observed versions;
- parser ID/version;
- normalized metrics and native artifacts;
- warnings and power/timing scope.

Deleting marks the result lifecycle `deleted`; audit history remains.

## Storage and audit

**Overview** reports queue state, retained storage, tool health, and recent
failures. Investigate growth before quotas are exhausted. Use job cleanup only
after confirming required diagnostics and outputs are published or backed up.

**Audit** records login, user/tool/technology changes, job actions, result
lifecycle changes, and admin access to private artifacts. Export logs to the
site's security monitoring system and retain them according to institutional
policy.
