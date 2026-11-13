# DTCO experiments

DTCO is available at `/dtco`. The existing experiment sweep expands temperature × supply voltage × layout plan into independent composite jobs. Each point uses the existing JobRunner, queue, process supervision and result publication. There is no separate DTCO scheduler. Adaptive optimization uses the same job machinery with the availability gate described below.

The accepted **schematic sweep** measures transient delay and supply power, plus independently generated layout boundary area. Layout choices affect measured area. Electrical simulation uses the source schematic, without extracted layout RC. An external output load is a testbench condition, not extracted capacitance. The sweep does not establish post-layout closure, maximum frequency, LVS or foundry signoff.

## Development checkpoint — 2026-10-25

The code includes persistent adaptive optimization API/UI, bounded transistor-width candidates, DC inverter analysis, per-iteration job/result history, objective scoring and best-candidate retention. Physical completion and final-GDS capacitance extraction/validation run as additional JobRunner steps. **`PHYSICAL_PIPELINE_READY=true`** in [environment.ts](../server/modules/dtco/environment.ts); extracted mode, `mr-sa-12t-pex` and optimization are offered when all required configured tools are healthy. Live options confirmed availability in the resource capture below. After the first UI attempt paused on contact-landing validation, contact-overlap and completed-PMOS diffusion-enclosure repairs passed external failed-GDS replay through all physical stages and DC/transient analysis, plus three native-fixture regressions. A subsequent UI-origin optimization completed three real evaluations, detailed below. Its power improvement trades against delay. Independent official audits of all three final GDS files and the read-only browser inspection passed as detailed below; fresh sweep/cancellation/retry, full regression and build also passed, with evidence below. Production readiness and foundry signoff are not claimed.

The corrected standalone candidate has official KLayout DRC zero reported items, LVS MATCH and Magic `drc(full)=0` (`/home/duhaochen/dtco-phase4-20261025/ppa-research/official-v3-verification.json`); the earlier `NP.1` violations were corrected. These results apply to that candidate and the recorded decks. Runtime checks require final-GDS roundtrip device topology, body connections, source W/L, finite capacitance and zero Magic full DRC; they do not run the official KLayout decks for every candidate. The supported physical path is only the GF180 MCU A inverter, fixed L 0.28 µm, with device and capacitance extraction, **no extracted wire resistance and no foundry signoff claim**. The 2026-10-24 sweep results below remain historical schematic evidence, not acceptance of this new path.

Migration [005](../server/migrations/005_dtco_optimization.ts) adds `dtco_optimizations` and `dtco_optimization_iterations`. The new API exposes `GET/POST /api/dtco/optimizations`, `GET /api/dtco/optimizations/:id` and `POST .../:id/start`, `/stop`, `/resume`. Creation uses `{clientRequestId,definition}`; resume requires `{iterationId,attemptId}`. Availability remains authoritative in `GET /api/dtco/options`; enabling tools alone does not override the source gate.

Configure the additional audited tools in Admin → Tools, then probe and self-test them:

| Tool | Configuration |
| --- | --- |
| `dtco-physical` | Adapter `dtco-physical-v1` version `1.0.0`; repository `rootPath`, Python `interpreterPath` with gdstk and Pillow, `entryPoint=scripts/dtco/physical.py` |
| `dtco-magic` | Adapter `dtco-magic-v1` version `1.0.0`; Magic `executablePath`, GF180 `libs.tech/magic` as `rootPath`, environment `DTCO_MAGIC_TECH_FILE=gf180mcuA.tech` |

Deployment/check commands from the repository root follow. Migrations must use the same persistent database/storage as the API and worker. Self-tests check dependencies; they do not replace real physical or optimization acceptance.

```sh
npm run db:migrate
/home/duhaochen/.local/share/autocellgen/venv/bin/python scripts/dtco/physical.py --version
/home/duhaochen/.local/share/autocellgen/venv/bin/python scripts/dtco/physical.py --self-test
/usr/local/bin/magic --version
npm run typecheck
npm test
```

## Adaptive optimization configuration

Choose the GF180 inverter, process/model, temperature, supply, load, slew and period. Optimization requires `mr-sa-12t-pex` and extracted electrical mode. NMOS width is bounded to 0.95–1.30 µm and PMOS to 1.40–2.60 µm on a 0.05 µm grid; L is fixed at 0.28 µm. Each axis has minimum, maximum, initial width and search step. DC analysis reports inverter switching behavior; it is not a MOS threshold-voltage extraction.

Objectives minimize `delayPs`, `averagePowerW`, `areaUm2` or `balanced`. Balanced score is the weighted mean of delay/power/area divided by their baseline values, with nonnegative weights and at least one positive weight. Limits include 1–64 iterations, optional objective target, minimum relative improvement and patience. The measured incumbent drives subsequent bounded coordinate proposals; unsuccessful neighborhoods reduce the step on the same width grid. Worse evaluated candidates remain in history without replacing the best.

Create and save an optimization, start it, then inspect per-iteration parameters, measured results, decisions, best history and linked jobs/artifacts. Stop requests preserve history; resuming requires the recorded iteration and predecessor attempt identities. The three-evaluation sequence below establishes measured feedback and best retention for that run; lifecycle and regression checks have their own recorded evidence and qualifications.

Frozen execution-source inventory: `/home/duhaochen/dtco-phase4-20261025/resources/inventory-final-source.json` (SHA-256 `0a9dd34d2a308e904031cea7f969cbbc372274dc44b041e57d8167a0838253dd`), HEAD `41023433dc74f0b100b146cb76db295ad1965d54` plus timed working-file hashes. It records local source/license paths and versions; installed resources were reused without downloading replacements. The post-run review snapshot `resources/inventory-final-review-v2.json` (SHA-256 `4b29c61ff8dc94612244167141992a75a339b88ddad7f2a239ef7b01f8a68f12`) additionally records the subsequent service bounds fix, DTCO tests and Python/package versions. It preserves the executed-source snapshot rather than replacing it. The requirement matrix and outstanding checks are in `/home/duhaochen/dtco-phase4-20261025/acceptance-plan.md`.

## Real optimization evidence — 2026-10-25

`GET /api/dtco/optimizations/d71b94dd-26d2-4c61-8502-e87f4d8a9552` was captured directly as `resources/optimization-three-rounds.json` (SHA-256 `0a348ef7f098c12e34f475cf1ed290d9e5722a397fff644b9672b83584174afd`). Status is `completed`, stop reason `max_iterations`. Three effective evaluations include the baseline and two feedback-driven proposals, satisfying the user's minimum of three design evaluations; no failed attempt is counted.

Conditions: GF180 inverter, N 1 µm, L 0.28 µm, 25 °C, 3.3 V, 10 fF, 100 ps slew, 10 ns period, `mr-sa-12t-pex`; objective minimizes average power. PMOS range 1.4–2.6 µm, initial 2 µm, step 0.6 µm; NMOS fixed at 1 µm. Maximum iterations 3, patience 3, minimum relative improvement 0.01.

| Round | PMOS µm | Delay ps | Power µW | Area µm² | Decision |
| --- | --- | --- | --- | --- | --- |
| 1 | 2.0 | 70.80036 | 16.61902 | 27.745 | Baseline incumbent |
| 2 | 2.6 | 67.34835 | 17.48638 | 27.745 | Power 5.2191% worse; rejected, baseline retained |
| 3 | 1.4 | 78.57387 | 15.69571 | 27.745 | Power 5.5557% lower; accepted as best |

Round 2's actual worse power kept round 1 as incumbent; the next recorded proposal reversed the PMOS direction around that incumbent. All three jobs regenerated native layout and validated final-GDS devices/capacitance before transient measurement, with distinct source-netlist, GDS and extracted-netlist hashes. Each reports six capacitors and zero Magic full DRC. Final best iteration is `427784f5-9cb8-48e5-bbdb-09ad8b435207`. Against baseline, **power falls 5.56%, delay rises 10.98%, and boundary area is unchanged**; this is a power/delay tradeoff, not improvement in every metric or proof of global optimality.

| Round | Job ID | Result ID |
| --- | --- | --- |
| 1 | `d75b7f6e-8e97-4adc-ab94-3ea70d91f5ec` | `598af507-f980-4894-b415-8c021717f423` |
| 2 | `f51847e9-026d-4998-a51e-4dc4894f1252` | `ca478a61-73b8-4195-a78b-77f3fe0305a6` |
| 3 | `0aeca26a-ee51-4238-8891-1c4c16e80f6f` | `77898173-fc85-4003-9f0c-8e8dda4021c3` |

Environment hash: `2a9e1e2b738efabf6b3bff2dc8b07dab2b6ca8b3b24e152d7357c3a41ef6db97`; frozen physical-helper SHA-256: `49f9a0870bf14ec61780fd12947aa6152699cf06b633c3970672ed3dfccd3d43`. The full API capture and `optimization-three-rounds-summary.json` retain per-round input/output/netlist/GDS hashes. Workspaces are `.eda-storage/jobs/<jobId>/`; published evidence is `.eda-storage/results/dtco/<resultId>/`.

Independent checks of this run are retained under `/home/duhaochen/dtco-phase4-20261025`:

| Check | Actual result | Evidence |
| --- | --- | --- |
| Decision/input/output audit | 1,184 checks, zero errors; independent waveform/GDS recomputation and measured-result/source/extracted-W/L checks | `final-review/optimization-decision-audit.json` |
| Official final-GDS verification | All three: zero DRC items, LVS MATCH; original input bytes unchanged | `ppa-research/live-run-d71b94dd-official/summary.json`, `verification.json`, `inputs-and-commands.json` |
| Read-only browser inspection | 1,081 checks; trajectory, retained worse/best, geometry/electrical effect, reload and 273 artifact downloads verified | `acceptance/final-inspect-optimize-2026-10-25T08-54-34-262Z/acceptance.json` |
| Fresh schematic sweep | 1,073 checks; experiment `32e4c9b6-1792-4b51-baea-a39e57a71683`, all four points succeeded; name-only revision 2 reused results | `acceptance/final-sweep-2026-10-25T08-56-07-864Z/acceptance.json` |
| Fresh cancellation/retry | 282 checks; experiment `82a57a6d-67d8-4341-81c7-ab9469cf880f`, cancelled attempt retained without metrics, second attempt succeeded | `acceptance/final-recovery-2026-10-25T08-57-43-143Z/acceptance.json` |
| Final browser/database matrix | 604 artifacts/34,408,420 bytes verified; SQLite quick check OK, no FK violations or orphan attempts/optimization iterations | `acceptance/final-acceptance-matrix.json`, `database-final-readonly.json` |
| Full regression | `npm test` exit 0, 288 tests passed/6 skipped, 32 files passed/1 skipped; DTCO frontend 11 passed | `final-review/final-backend-tests{.log,-result.json}`, `frontend-unit-result.json` |
| Full build | `npm run build` exit 0, 114.3 s, including typechecks and repository validators | `final-review/final-build{.log,-result.json}` |
| Independent requirement review | Mandatory requirements satisfied within the bounded supported inverter scope; qualifications retained | `final-review/requirements-audit.{md,json}` |

The fresh schematic temperature comparison at 3.3 V measured 25 °C: 63.42872 ps/14.34810 µW versus 85 °C: 67.75365 ps/14.44937 µW, with unchanged testbench/design. Both schematic layouts share these electrical values, while their areas are 7.2576 and 9.6768 µm². This demonstrates temperature influence without asserting schematic layout-dependent electrical performance.

Live worker restart during optimization was not repeated, and the browser cancellation check did not independently prove disappearance of the native process group. SQLite reopen, ownership, concurrency, malformed-input and additional objective/stop-condition coverage principally comes from automated tests. These distinctions are recorded in the independent requirement audit; check counts are not counts of native executions.

The independent official audit used KLayout 0.30.7 and the unmodified installed GF180 default cell FEOL, BEOL, connectivity and off-grid rules, with no waiver. Optional density and antenna checks were not enabled. This is bounded verification evidence, not foundry signoff; runtime still uses the Magic checks described above.

The initial failed UI optimization `488d5eb9-c04c-4298-9a9a-367d971ee962` remains `paused/execution_failed`, job `76407c6d-a9d2-4046-8709-bd2bde9c582f`, without a successful result. Its retained API capture is `resources/optimization-initial-failed.json`; the corrected run uses a new environment. This failure is preserved rather than rewritten as success.

To reproduce, configure the audited tools above, read current options, then create an optimization with the exact conditions/ranges above and a fresh `clientRequestId`; start it and inspect every round's job/result and artifacts. Set `objective.metric="averagePowerW"`, `maxIterations=3`, `patience=3`, `minRelativeImprovement=0.01`, NMOS min/max/initial 1 with step 0.05, and PMOS min 1.4/max 2.6/initial 2/step 0.6. Follow the API commands in the external acceptance plan or create/start through `/dtco`. Routing can vary; a rerun must retain its own measured values and hashes.

The remaining guide covers common job execution, existing sweep controls and retained historical evidence; extracted-only steps are identified explicitly.

## Configure and save

`GET /api/dtco/options` is authoritative for available options, tool health, defaults, environment identity and maximum point count. Unavailable options include a reason; preparation checks availability again. A readable configured model ID/hash remains listed when another tool is unhealthy, so experiment editing and saving remain possible. The current catalog supports the following definition, specified by [the shared contract](../shared/contracts/dtco.ts):

| Field | Current supported values or bounds |
| --- | --- |
| `name` | Nonempty experiment name, at most 160 characters |
| `circuitId` | `gf180-inverter`: source schematic N 1 µm / P 2 µm, L 280 nm |
| `technologyId` | `gf180mcuA`: GF180MCU A 3.3 V MOS |
| `modelVersion` | Exact options ID, `gf180-typical-<first 12 model-closure hash characters>` |
| `temperaturesC` | Nonempty numeric array, −40 through 125 °C |
| `voltagesV` | Nonempty numeric array, 2.7 through 3.6 V |
| `layoutIds` | `mr-dp-9t` (MR DP, 9 tracks), `mr-sa-12t` (MR SA, 12 tracks); extracted `mr-sa-12t-pex` when available |
| `design` (optional) | `nmosWidthUm` 0.95–1.30, `pmosWidthUm` 1.40–2.60, both on the 0.05 µm grid; omitted means N1/P2, fixed L0.28 µm |
| `electricalMode` (optional) | `schematic` by default; `extracted` requires the physical layout plan and healthy physical tools |
| `loadFf` | External load, 0.1 through 1000 fF |
| `inputSlewPs` | Pulse transition time, 1 through 10000 ps |
| `periodNs` | Pulse period, 1 through 1000 ns |

Input slew in ns must be **strictly less than one quarter of the period**. The estimated transient budget must also satisfy `4 × periodNs / min(inputSlewPs / 20000, periodNs / 10000) ≤ 1,000,000`; increase slew or shorten the period if it exceeds the limit. Numeric axes are normalized, sorted and deduplicated; layouts are deduplicated. The unique Cartesian product may contain at most 64 points. Schematic defaults are 25/85 °C × 3.0/3.3 V × the two schematic layouts, 10 fF load, 100 ps slew and 10 ns period: eight points.

Saving persists the definition and points in SQLite. Saving an edit appends an immutable revision and new revision point IDs; saving an unchanged definition/environment is a no-op. Older definitions and environment identities remain available. Matching canonical computations within the same experiment share their attempt/job/result history across revisions: renaming queues nothing, and adding a temperature queues only new combinations. Deduplication does not span separate experiments.

## Execute and inspect

1. Open DTCO and inspect model/tool availability.
2. Configure the axes and electrical conditions; inspect the Cartesian preview.
3. Save the experiment, then submit its unsubmitted points.
4. Follow each point's job, step progress, events and stdout/stderr. Linked Jobs records provide the common execution and cancellation controls.
5. Inspect delay, supply power, generated area and the comparison/Pareto view with their conditions and scope.
6. Reopen saved experiments, revisions and attempts; download their actual evidence.

Every point follows this ordered plan. The five physical steps run only in extracted mode, after native normalization and before transient characterization; schematic mode skips them.

| Step key | Work and retained evidence |
| --- | --- |
| `dtco-prepare` | Verify frozen resource/input hashes and stage the model, source and measurement files |
| `model-dc` | Real ngspice DC sweep of the frozen-model source inverter; `model-dc.cir`, `model-dc.txt`, `model-dc.log` |
| `model-analysis` | Measure inverter VTC switching voltage from the actual DC curve; `model-analysis.json` |
| `prepare`, `generate` | Existing native ACG MR preparation and routed layout generation |
| `render` (optional) | Existing GDS preview renderer, when configured |
| `inspect-native`, `normalize` | Existing ACG native evidence inspection and normalization |
| `physical-complete` (extracted) | Prepare contact, tap, port and physical-completion geometry from the native candidate |
| `magic-complete` (extracted) | Materialize completion through the configured GF180 Magic technology |
| `physical-footprint` (extracted) | Freeze the completed GDS footprint and extraction script |
| `magic-extract` (extracted) | Round-trip the final GDS into Magic, extract devices/capacitance and run full Magic DRC |
| `physical-validate` (extracted) | Require source W/L, topology/body connections, finite capacitance and zero Magic full DRC; retain `validation.json` |
| `characterize` | Real ngspice transient run of the frozen source schematic or validated extracted netlist, according to mode |
| `measure` | Python/gdstk waveform measurements and boundary area of the actual measured GDS; verify DC/physical evidence hashes |
| `dtco-summary` | Verify measured GDS hash, bind provenance and produce the DTCO result |

For reproduction, retain each job's frozen workspace and step process records (tool configuration, argv, working directory, environment names, exit and logs). `model-dc` runs `dtco-ngspice -b -o model-dc.log model-dc.cir` in `output/dtco`; `model-analysis` runs the frozen analyzer with `--workspace . --measurement input/measurement.json --dc-only` from the job root. Replay only in a separate evidence copy using the recorded tool versions; changing current helper/model bytes creates a different environment and is not the same run.

The native plan requests additional verification `none`; existing mandatory native structural gates remain. Process exit alone does not certify routing or verification. Measurement requires an actual native candidate whose route status is succeeded. Native candidate choice is the first routed candidate after sorting by GDS path. Schematic mode measures its boundary directly; extracted mode retains that original candidate separately and measures `output/dtco/physical/completed.gds` after validated physical completion. Both original and measured GDS paths/hashes are retained.

## Identity, retries and recovery

A canonical point key hashes circuit, technology, model version, load, slew, period, explicit design/electrical-mode fields when provided, one temperature/voltage/layout coordinate, environment hash and identity schema version. It excludes experiment name and the other axis members. Revision definitions stay immutable; a canonical point's shared attempt history can grow after an older revision was saved.

Submission reserves all eligible points synchronously in SQLite before asynchronous preparation. Repeated or concurrent submit requests skip points that already have an attempt, including failed points. Responses distinguish `submitted`, `skipped` and preparation `failed` point IDs. A preparation failure remains durable even if no native process started.

Use explicit point retry for a current-revision point in `failed`, `interrupted`, `cancelled` or `preparation_failed`. Retry requires the latest failed attempt's `attemptId`. Repeating that same request skips the point even if the replacement attempt has already failed; a deliberate subsequent retry supplies the replacement failed attempt's ID. This prevents double-click and request-replay duplicates.

**Retry reruns the full point**, including layout generation and SPICE; it does not resume a completed stage. Previous attempts, jobs, errors and artifacts remain linked. Successful or active points cannot be retried. Generic Jobs draft/retry/clone endpoints reject DTCO work so they cannot bypass experiment history.

The saved revision binds the environment hash. Changing a model, trusted resource or tool configuration requires saving a new revision before submission. Runtime hash checks fail on changed trusted resources rather than silently switching a queued job's inputs. SA placement/routing is not guaranteed bitwise deterministic; the retained selected GDS hash identifies each measured output.

Queued jobs survive restart. The common worker marks formerly running jobs `interrupted`; DTCO recovery marks incomplete preparations `preparation_failed` with a failed job. Neither is automatically rerun. Explicit retry creates the next linked attempt. Run one worker against a database: startup recovery assumes the common single-worker deployment.

Anonymous requests use the platform's shared `public-runner` account and therefore share experiment history. Signed-in accounts have their own ownership; administrators can inspect all experiments. Session mutation requests use the common CSRF protection.

## Measurements and scientific boundaries

Analysis limits each waveform and selected GDS file to 128 MiB and waveforms to 1,100,000 data rows; oversized evidence fails rather than consuming unbounded resources. The measurement request is limited to 64 KiB and native output manifest to 8 MiB.

DC analysis runs in both modes before native layout generation. `modelAnalysis.switchingVoltageV` is the interpolated inverter VTC crossing where Vout = Vin; `lowInputSupplyCurrentA` and `highInputSupplyCurrentA` are endpoint supply currents. The curve path/hash is retained. This analysis uses the source inverter and frozen model even for extracted-mode jobs: **it is inverter switching voltage, not MOS Vth and not an extracted-layout DC measurement**.

The transient run covers four periods; analysis uses the settled interval from two through four periods. Rise and fall propagation delays use input/output 50% crossings with linear interpolation; `delayPs` is their arithmetic mean. Supply energy is trapezoidal integration of `-VDD × i(VDD)`; average power divides by the two-period window and energy per cycle divides by two. Missing crossings, simulator errors and nonfinite or nonpositive metrics fail measurement. Pulse period is not Fmax.

`areaUm2` is the union area of actual selected GDS top-cell boundary polygons on layer 63, datatype 0, in square micrometres. It is not transistor area or extracted capacitance. The GDS must have exactly one top-level cell and a nonempty boundary. Metric keys are `delayPs`, `delayRisePs`, `delayFallPs`, `averagePowerW`, `energyPerCycleJ` and `areaUm2`.

DTCO reuses the generic PPA comparison/Pareto helper. The existing native PPA importer expects OpenROAD/OpenLane/LibreLane physical-flow result provenance; it does not characterize this inverter or convert DTCO measurements into a physical-flow result. DTCO preserves its own result schema and scope.

The initial 2026-10-24 Magic extraction research found nonfinite full-capacitance values, missing A/Y ports and floating well/substrate connectivity in the investigated outputs. Device extraction alone did not validate those circuits. The investigated DP 9-track output also extracted P width 2.035 µm against the source 2 µm, while SA 12-track width matched. Those historical outputs did not prove geometry preservation or LVS. The accepted schematic sweep reports source-schematic electrical metrics alongside layout area, with `extraction.status="unavailable"`; the newer validated device/capacitance path has the separate, bounded evidence described in the checkpoint above.

## API

Successful responses use `{"schemaVersion":"eda.api.v1","data":...}`. Definition create/update bodies are the direct definition object, without a `data` wrapper.

| Method and path | Body / response data |
| --- | --- |
| `GET /api/dtco/options` | Options, defaults, environment hash, scope and effective owner/shared-runner flag |
| `GET /api/dtco/experiments` | Owned experiment list; administrators see all |
| `POST /api/dtco/experiments` | Definition body; returns saved experiment, HTTP 201 |
| `GET /api/dtco/experiments/:id` | Experiment including current points and revision/attempt history |
| `PUT /api/dtco/experiments/:id` | Definition body; appends revision and returns experiment |
| `POST /api/dtco/experiments/:id/submit` | No body; `{experiment,submitted,skipped,failed}` |
| `POST /api/dtco/points/:pointId/retry` | `{"attemptId":"<latest failed attempt ID>"}`; same submit response shape |

Points expose current job/result IDs, status, progress, current step, error, flattened metrics and ordered attempts. Matching points in historical revisions expose the same canonical attempt history; each attempt retains its own job/result evidence. Generic job/result/artifact APIs remain available; result artifacts use `GET /api/results/dtco/:resultId/artifacts` and `/artifacts.zip` under common access controls. Task logs remain private to owners/administrators.

A minimal anonymous example against an already configured isolated server (requires curl and jq):

```sh
DTCO_BASE=http://127.0.0.1:3101
curl --fail-with-body -sS "$DTCO_BASE/api/dtco/options" > options.json
jq -e '.data.available' options.json
jq '.data.defaults' options.json > definition.json
curl --fail-with-body -sS -H 'Content-Type: application/json' --data-binary @definition.json "$DTCO_BASE/api/dtco/experiments" > experiment.json
DTCO_ID=$(jq -r '.data.id' experiment.json)
curl --fail-with-body -sS -X POST "$DTCO_BASE/api/dtco/experiments/$DTCO_ID/submit"
curl --fail-with-body -sS "$DTCO_BASE/api/dtco/experiments/$DTCO_ID"
```

For a failed point, read its latest attempt ID from the experiment response and send it in the retry JSON body. Signed-in API clients must retain their session cookie and common CSRF header; do not copy session secrets into evidence reports.

## Storage and provenance

The default storage root is `.eda-storage`, with database `.eda-storage/eda.sqlite`. River currently uses `/home/duhaochen/website-trial-v1/.eda-storage`. `EDA_STORAGE_ROOT` and `EDA_DATABASE_PATH` support another persistent location; `NODE_ENV=production` requires an explicit storage root outside the source repository. API, worker and administration commands must use the same values. Back up SQLite and artifact storage together.

| Location relative to storage root | Contents |
| --- | --- |
| SQLite `dtco_experiments`, `dtco_revisions`, `dtco_points`, `dtco_attempts` | Definitions, revision environment hashes, coordinates, attempt/job links and preparation state |
| SQLite `dtco_optimizations`, `dtco_optimization_iterations` | Saved objective/ranges/limits, iteration candidates, decisions, incumbent and job/attempt/result links |
| SQLite `jobs`, `job_steps`, `job_events` | Common execution state, processes and errors |
| SQLite `dtco_results`, `artifacts` | Normalized results and downloadable output metadata |
| `jobs/<jobId>/input/` | Frozen source, layout config/rules, complete model include closure, analyzer, resources and measurement request |
| `jobs/<jobId>/work/`, `output/`, `logs/` | Native working data, generated evidence and process logs |
| `results/dtco/<resultId>/` | Atomically committed result artifacts and manifest, initially private |

Within each workspace, `output/dtco/` retains `model-dc.cir`, `model-dc.txt`, `model-dc.log`, `model-analysis.json`, `characterize.cir`, `waveforms.txt` (time, input voltage, output voltage, supply current), `ngspice.log`, `metrics.json`, `snapshot.json`, `provenance.json`, and copied `model/`, `catalog/`, `helpers/` and `resources/`. Native ACG evidence remains under its original output paths, including `output/acg-native.json`, `output/acg-result.json` and actual GDS candidates. Extracted mode additionally retains `output/dtco/physical/completed.gds`, `completed.png`, `extracted.spice`, `validation.json` and physical/Magic logs and scripts; original native output remains separate. Result `data.dtco` includes `electricalMode`, `design`, `modelAnalysis` and artifact paths alongside metrics/provenance. The final normalized DTCO result is `output/dtco-result.json`; published copies preserve these relative paths.

The snapshot binds definition/coordinates, model hash/version, environment hash, trusted source/resource/executable SHA-256 values and every frozen input hash. The environment fingerprint includes full selected tool configurations and revisions; an optional healthy renderer also binds its executable/interpreter and helper entry-point hashes. The model hash covers the sorted relative paths and SHA-256 values of the recursively resolved model include closure. Includes must stay within the administrator model root. Provenance binds the selected GDS and waveform hashes, output hashes, tool versions, measurement conventions and limitations. Output hashes in provenance cover evidence present before writing provenance and the final normalized result; they do not recursively hash themselves. Published artifact metadata supplies individual byte sizes and hashes.

Compare downloaded bytes with their artifact hash and the measurement's selected GDS hash. A filename, model label or successful exit is insufficient lineage. Failed jobs retain diagnostics in their workspace without a completed published result.

## Administrator setup

Use Node 24, real ngspice with the GF180 model library, native AutoCellGen MR with its Z3/Java/GDS conversion dependencies, and persistent Python with gdstk. Existing ACG setup is documented in [ACG operation](acg.md#administrator-setup); shared revision and health controls are in [tool configuration](tool-configuration.md).

Run migrations with the service's configured database/storage, and initialize ACG only when its documented no-active-job precondition is satisfied:

```sh
cd /home/duhaochen/website-trial-v1
npm run db:migrate
npm run tools:acg:init -- --root /home/duhaochen/AutoCellGen_TY --python /home/duhaochen/.local/share/autocellgen/venv/bin/python --probe --self-test
```

In Admin → Tools, configure the dedicated entries below. The Benchmark `ngspice` entry does not satisfy DTCO preflight. Adapter identity/version and fixed probe argv come from [the audited tool catalog](../shared/toolCatalog.ts), not browser command input.

| Field | `dtco-ngspice` | `dtco-analysis` |
| --- | --- | --- |
| Module | `dtco` | `dtco` |
| Adapter | `dtco-ngspice-v1`, version `1.0.0` | `dtco-analysis-v1`, version `1.0.0` |
| `rootPath` | GF180 `libs.tech/ngspice` directory | `/home/duhaochen/website-trial-v1` |
| `executablePath` | `/usr/local/bin/ngspice` | Empty |
| `interpreterPath` | Empty | `/home/duhaochen/.local/share/autocellgen/venv/bin/python` |
| `entryPoint` | Empty | `scripts/dtco/analyze.py` (or its absolute repository path) |
| Environment | `DTCO_MODEL_FILE=sm141064.ngspice`; optional `PATH` | Optional `PATH` |

The model entry must be relative to its root; the recursive include tree must exist and be readable. The analyzer entry must resolve to this repository's trusted helper. Save configurations, check paths, probe versions, run minimal self-tests, enable them and recheck DTCO options. Schematic mode requires healthy current probes and successful self-tests for `acg-mr`, `dtco-ngspice` and `dtco-analysis`; extracted mode additionally requires `dtco-physical` and `dtco-magic`, configured above. Optional `acg-renderer` enables previews. Tool self-tests are dependency/adapter checks, not proof that a saved experiment will route or that a design passes signoff.

Direct probes for the helper/native installation are reproducible without launching an experiment:

```sh
/usr/local/bin/ngspice --version
/home/duhaochen/.local/share/autocellgen/venv/bin/python /home/duhaochen/website-trial-v1/scripts/dtco/analyze.py --version
/home/duhaochen/.local/share/autocellgen/venv/bin/python /home/duhaochen/website-trial-v1/scripts/dtco/analyze.py --self-test
```

For development, `npm run dev:full` starts the existing development stack. Deployed services use their existing API/worker process management: standalone entry points are `npm start` and `npm run worker`; embedded execution uses `EDA_EMBED_WORKER=1`. Do not start a second worker on an active database. DTCO module concurrency defaults to one and is configurable through `EDA_DTCO_CONCURRENCY`.

## Initial native research evidence

The development evidence directory is `/home/duhaochen/dtco-validation-20261024/native-proof`. Its electrical reference can be rerun with:

```sh
/home/duhaochen/.local/share/autocellgen/venv/bin/python /home/duhaochen/dtco-validation-20261024/native-proof/electrical/run_gf180_inverter.py
```

It uses ngspice under `/usr/local/bin/ngspice` and GF180 model root `/home/duhaochen/rtl2gds-copilot-orchestrator/pdk/ciel/gf180mcu/versions/0fe599b2afb6708d281543108caf8310912f54af/gf180mcuA/libs.tech/ngspice`, with nominal switches `fnoicor=0`, `sw_stat_mismatch=0`, 10 fF load, 100 ps slew, 10 ns period and a 20–40 ns measurement window. This standalone proof is separate from website acceptance.

| Retained initial evidence | SHA-256 |
| --- | --- |
| Electrical `T25_V3p0.cir` | `480a75e28ca93b901a6c437023d4599dbd631b6e09aa199aa443605b8ca400a2` |
| Electrical `T25_V3p0.csv` | `6185c4b4ea1bd33e679ce15d2f1802225ec8c211b77b91f99ffeed29bfd79572` |
| Electrical `metrics.json` | `407a0d4e710811141503921e3738ce320216b95f0444c69d676f8e966243f321` |
| Electrical `run_gf180_inverter.py` | `86254aa5fd4b7e03fa2932ac045cf10e57ffbb5b836a3b9e43cf008df0bfa1a2` |
| Source `scripts/dtco/inverter.sp` | `7d649c889da69f2c9db7756ba00b504c7aed4301bcaa4a603f6ce049ca9d1318` |
| Source `scripts/dtco/mr-dp-9t.json` | `909b4dace06fdc98b25363bfd52e28facf8fcc7e30b45ef366d4f8fd4ee4609a` |
| Source `scripts/dtco/mr-sa-12t.json` | `be9dc6038f34696b35ae9697f01378101ed6d285a0b7b8fae4c9a9ad9ff7d1b8` |

These are recorded development bytes, not immutable claims about future revisions. Reruns and product jobs must retain their own exact source/output manifests. For example, use `sha256sum scripts/dtco/inverter.sp scripts/dtco/mr-*.json` and compare downloaded artifact hashes against their job/result records.

## Verification evidence — 2026-10-24

The following is historical acceptance of the 2026-10-24 schematic sweep, not the 2026-10-25 optimization implementation. Evidence is retained under `/home/duhaochen/dtco-validation-20261024`; the acceptance checklist is `acceptance-plan.md`. Native research evidence remains separate from live website checks.

| Check | Observed result |
| --- | --- |
| First live API matrix | Experiment `c8d92d92-a599-4d45-bff9-8bea70646dd8`, revision 2: all eight points succeeded with real native tools |
| Concurrent submit | Two concurrent submissions created exactly eight jobs |
| Shutdown and retry | A real shutdown interrupted one point; two concurrent retry requests created exactly one replacement job |
| Revision reuse | Name-only save reused all eight computations |
| Read-only browser/artifacts | All 19 browser checks passed; downloaded artifact hash verified |
| Automated tests | `npm test`: 273 passed, 6 environment-gated skips; 31 test files passed, 1 skipped |
| DTCO frontend and browser fixtures | Frontend checks 5/5 passed; browser UI fixture checks 5/5 passed |
| Final-source browser matrix | UI-created experiment `a80b423b-c16d-42fe-8462-7249f98ebc46`: all eight points succeeded, one attempt each; all 46 browser checks passed (`review/browser-final.json`) |
| Full build | `npm run build` passed, exit 0 (117.97 s): all validators, 1107 report-parser checks, client/server TypeScript and Vite's 143 modules; `prepush/build-rerun.log` and `build-rerun-exit.json` |

The final browser checks covered the four existing module tabs, full/subset tables and both plots, job details, finite positive metrics, explicit coordinates, model/environment/input/output provenance, artifact downloads and absence of frontend errors. Exactly one create and one submit were observed from the UI.

A retained final-run example is job `96fbc4a6-2bd2-4071-a131-f8842edcacc6`, result `132c0b14-ca2d-4f2a-b91f-6ef333c451d8` (25 °C, 3.0 V, MR DP 9 tracks):

| Evidence | Exact SHA-256 |
| --- | --- |
| Model closure | `1505592f04e7ba2e322e7c7edea10e05f2138f335c34efbf96829c0531a99c95` |
| Selected GDS | `22da450e494d0b3dd8a4a23596756c26a412c5f506ed95ebbb83506e2413a01c` |
| Downloaded `output/dtco/provenance.json` (8570 bytes) | `d5f12cacd0c0c9be29a549e0a5783ab9aed145b41995a3c53041df18567279ae` |

This historical matrix demonstrates schematic SPICE plus native generated-layout area and retained pipeline evidence. It provides no extracted-layout, geometry/LVS, optimization-loop or signoff acceptance.
