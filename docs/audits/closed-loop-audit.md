# Closed-loop UX adversarial audit

Date: 2026-08-14
Reviewer: independent Reviewer 1 (no implementation participation)
Scope: current `dhc` worktree at `/home/duhaochen/website-trial-v1`
Status: final re-review after remediation

## Final conclusion

**Unresolved Critical: 0. Unresolved High: 0. Closed-loop UX audit passes.**

The five High findings from the first review were reproduced against the remediated worktree and are now closed. Valid source/import flows preserve the required upload → recognition → preflight/plan → explicit Start → persistent job/log → normalized result → visualization boundary. Expected invalid inputs now fail before Start with actionable 400/409 API envelopes.

All EDA execution evidence in this review uses the repository's `NODE_ENV=test` subprocess fixture (`test/fixtures/fake-tools/fake-eda-tool.mjs`). It exercises the real HTTP upload, filesystem workspace, SQLite, queue, subprocess, log, parser, artifact, provenance, result, and frontend paths. It is **not** evidence that real ngspice, Yosys, OpenSTA, OpenROAD, OpenLane, LibreLane, HSPICE, or Spectre completed a design. No proprietary-tool execution is claimed.

## Resolution of the original High findings

### H-01 — Digital database results did not enter charts: resolved

The result projection now assigns missing categories to `uncategorized`, and the Digital page derives category options from the rows present under the selected technology instead of restricting them to the generated static category list.

Adversarial browser evidence:

- Computed a result with a previously unseen category `review-new-cat`, architecture `review-new-arch2`, and process `review-new-tech2`.
- The dynamically created Technology UID was searchable/selectable.
- `Dataset category` contained and selected `Review New Cat`.
- Data scope reported one result row, one technology directory, one architecture, and one width.
- Inspection of actual Plotly data—not just plot container count—found `review-new-arch2` in a rendered trace.
- A completed import under another dynamically-created process also produced a one-row chart scope.

Result: arbitrary new categories are visible, and category-less projections have a deterministic fallback.

### H-02 — PPA config JSON was silently treated as RTL: resolved

Adversarial folder upload used `uart.v`, `constraints.sdc`, and `config.json`:

- The browser assigned `config.json` the `ignore` role by default.
- Backend recognition displayed `json | ignore | Ready`.
- The valid folder passed preflight without placing JSON in the executable source set.
- Manually forcing `config.json` to the `rtl` role returned HTTP 400 with stable code `PPA_ROLE_EXTENSION_MISMATCH` and message `config.json cannot be mapped as rtl`; the same message appeared in the form.

JSON/YAML and uploaded script/config evidence therefore fail closed: they are not flow inputs unless a future audited parser explicitly maps them to capability parameters. Backend role/extension validation does not trust the frontend default.

### H-03 — Benchmark `.lib` include trees failed by default: resolved

An actual folder containing `main.sp` with `.include "params.lib"` and sibling `params.lib` was uploaded with Translator enabled:

- Browser mapping was `main.sp → primary-model` and `params.lib → model-include`.
- Preflight passed and included the Translator plan.
- The persistent job completed `validate-input`, `translator`, `benchmark.1`, `parse-result`, and `publish-result` successfully and created a result ID.

Backend tests additionally prove recursive include-closure scanning: an unsafe nested `.lib` and a Spectre include dependency are inspected and rejected, while include dependencies are not counted as additional processing roots.

### H-04 — Structured preflight errors became HTTP 500: resolved

Both error classes were exercised through the browser and real API route:

- Validation failure: PPA JSON forced to RTL returned HTTP 400, code `PPA_ROLE_EXTENSION_MISMATCH`, and an actionable UI message.
- Configuration failure: Benchmark with no selected healthy simulator returned HTTP 409, code `benchmark.simulator_required`, and UI message `Select at least one healthy simulator`.

The job remains a draft after failed validation. Adapter-owned structured errors are converted to stable 400/409 `eda.api.v1` error envelopes rather than becoming `INTERNAL_ERROR`.

### H-05 — Automated gate was red/non-repeatable: resolved

The PPA fixtures now materialize the frozen input files required by integrity checks. `playwright.config.ts` supports `EDA_E2E_PORT` and sets `reuseExistingServer: false`, so each ordinary test command owns a fresh server and temporary database.

Final repeatability evidence:

- Targeted module/integration recheck: 5 files, **38/38 tests passed**.
- First isolated full run: `EDA_E2E_PORT=43221 npm run test:e2e` → **8/8 passed (1.9m)**.
- Second isolated full run: `EDA_E2E_PORT=43222 npm run test:e2e` → **8/8 passed (1.8m)**.

An earlier re-review attempt encountered a transient lazy-chunk 404 while the shared `dist` directory was being rebuilt concurrently. It was not reproducible after concurrent builds ended; both required isolated full runs then passed. Production and CI should likewise avoid mutating a served release directory in place.

## Final closed-loop matrix

| Required path | Final evidence | Status |
| --- | --- | --- |
| Benchmark single model | Upload, server recognition, immutable plan, explicit Start, job/log/provenance/result | Pass, test fixture only |
| Benchmark model/include folder | `.sp + .lib` root/dependency auto-mapping, recursive safety closure, Translator-to-result completion | Pass, test fixture only |
| Benchmark Fitting CSV | Measured DC IV mapping; persisted fitting, benchmark, parser, and publish steps all succeeded | Pass, test fixture only |
| Benchmark processing tool | Translator and Fitting paths crossed the persistent process boundary and published results | Pass, test fixture only |
| Benchmark completed-result import | Import, recognition, explicit Start, normalized result, database-backed result card | Pass |
| Digital RTL + Liberty | Generated Yosys/OpenSTA plan, normalized area/timing/static-leakage result | Pass, test fixture only |
| Digital RTL folder | Relative RTL/include/Liberty paths preserved through all planned steps | Pass, test fixture only |
| Digital new result into charts | Unseen category dynamically selectable; actual Plotly trace contains new architecture | Pass |
| Digital completed-result import | Same normalized API plus dynamically selectable technology/category/chart scope | Pass |
| PPA RTL/config folder | JSON defaults to ignore; forced incompatible mapping rejected by backend | Pass |
| PPA capability parameters | Registered technology and adapter-owned parameters appear in the immutable plan | Pass, test fixture only |
| PPA sweep and independent tasks | Clock points 8/12 produce independent jobs/workspaces/results with sweep provenance | Pass, test fixture only |
| PPA results into trends | Selected new sweep results render the PPA trend/sweep plots | Pass |
| PPA completed-run import | Fixed parser argv; uploaded scripts remain evidence-only; normalized report selectable | Pass, parser fixture only |
| Failure correction loop | 400 validation and 409 configuration errors render actionable messages before Start | Pass |
| Repeatable browser gate | Two consecutive isolated full commands, different ports and fresh databases | Pass |

## Test evidence and residual notes

- Parent gate reported clean lint, typecheck, 50 unit tests, and 16 integration tests before this re-review.
- Reviewer targeted recheck passed 38/38 across Benchmark, Digital, PPA, API-loop, and failure/security files.
- Reviewer then completed two independent full build-plus-Playwright runs, both 8/8.
- Build warnings about large chunks and sparse historical benchmark suites are non-blocking performance/data-quality notices; they did not break the tested closed loops.
- The frontend still depends on immutable deployment of its hashed chunks. Replacing `dist` while a live process serves it can break lazy imports; deployment should use release-directory swap or equivalent atomic publication.

No product source was modified by this reviewer. This report is the only reviewer-authored repository change.
