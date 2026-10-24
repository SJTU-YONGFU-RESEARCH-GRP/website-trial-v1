# DTCO experiments

DTCO is available at `/dtco`. An experiment expands temperature × supply voltage × layout plan into independent composite jobs. Each point uses the existing JobRunner, queue, process supervision and result publication. There is no separate DTCO scheduler.

The metric scope is **schematic transient delay and supply power, plus independently generated layout boundary area**. Layout choices affect measured area. Electrical simulation uses the independent source schematic, without extracted layout RC. An external output load is a testbench condition, not extracted capacitance. These results do not establish post-layout closure, maximum frequency, LVS or foundry signoff.

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
| `layoutIds` | `mr-dp-9t` (MR DP, 9 tracks), `mr-sa-12t` (MR SA, 12 tracks) |
| `loadFf` | External load, 0.1 through 1000 fF |
| `inputSlewPs` | Pulse transition time, 1 through 10000 ps |
| `periodNs` | Pulse period, 1 through 1000 ns |

Input slew in ns must be **strictly less than one quarter of the period**. The estimated transient budget must also satisfy `4 × periodNs / min(inputSlewPs / 20000, periodNs / 10000) ≤ 1,000,000`; increase slew or shorten the period if it exceeds the limit. Numeric axes are normalized, sorted and deduplicated; layouts are deduplicated. The unique Cartesian product may contain at most 64 points. Defaults are 25/85 °C × 3.0/3.3 V × both layouts, 10 fF load, 100 ps slew and 10 ns period: eight points.

Saving persists the definition and points in SQLite. Saving an edit appends an immutable revision and new revision point IDs; saving an unchanged definition/environment is a no-op. Older definitions and environment identities remain available. Matching canonical computations within the same experiment share their attempt/job/result history across revisions: renaming queues nothing, and adding a temperature queues only new combinations. Deduplication does not span separate experiments.

## Execute and inspect

1. Open DTCO and inspect model/tool availability.
2. Configure the axes and electrical conditions; inspect the Cartesian preview.
3. Save the experiment, then submit its unsubmitted points.
4. Follow each point's job, step progress, events and stdout/stderr. Linked Jobs records provide the common execution and cancellation controls.
5. Inspect delay, supply power, generated area and the comparison/Pareto view with their conditions and scope.
6. Reopen saved experiments, revisions and attempts; download their actual evidence.

Every point runs this ordered plan:

| Step key | Work and retained evidence |
| --- | --- |
| `dtco-prepare` | Verify frozen resource/input hashes and stage the model, source and measurement files |
| `prepare`, `generate` | Existing native ACG MR preparation and routed layout generation |
| `render` (optional) | Existing GDS preview renderer, when configured |
| `inspect-native`, `normalize` | Existing ACG native evidence inspection and normalization |
| `characterize` | Real ngspice transient run of the frozen source schematic |
| `measure` | Python/gdstk waveform measurements and selected routed GDS boundary area |
| `dtco-summary` | Verify measured GDS hash, bind provenance and produce the DTCO result |

The native plan requests additional verification `none`; existing mandatory native structural gates remain. Process exit alone does not certify routing or verification. Measurement requires an actual native candidate whose route status is succeeded. Candidate choice is the first routed candidate after sorting by GDS path, and the selected path and byte hash are retained.

## Identity, retries and recovery

A canonical point key hashes circuit, technology, model version, load, slew, period, one temperature/voltage/layout coordinate, environment hash and identity schema version. It excludes experiment name and the other axis members. Revision definitions stay immutable; a canonical point's shared attempt history can grow after an older revision was saved.

Submission reserves all eligible points synchronously in SQLite before asynchronous preparation. Repeated or concurrent submit requests skip points that already have an attempt, including failed points. Responses distinguish `submitted`, `skipped` and preparation `failed` point IDs. A preparation failure remains durable even if no native process started.

Use explicit point retry for a current-revision point in `failed`, `interrupted`, `cancelled` or `preparation_failed`. Retry requires the latest failed attempt's `attemptId`. Repeating that same request skips the point even if the replacement attempt has already failed; a deliberate subsequent retry supplies the replacement failed attempt's ID. This prevents double-click and request-replay duplicates.

**Retry reruns the full point**, including layout generation and SPICE; it does not resume a completed stage. Previous attempts, jobs, errors and artifacts remain linked. Successful or active points cannot be retried. Generic Jobs draft/retry/clone endpoints reject DTCO work so they cannot bypass experiment history.

The saved revision binds the environment hash. Changing a model, trusted resource or tool configuration requires saving a new revision before submission. Runtime hash checks fail on changed trusted resources rather than silently switching a queued job's inputs. SA placement/routing is not guaranteed bitwise deterministic; the retained selected GDS hash identifies each measured output.

Queued jobs survive restart. The common worker marks formerly running jobs `interrupted`; DTCO recovery marks incomplete preparations `preparation_failed` with a failed job. Neither is automatically rerun. Explicit retry creates the next linked attempt. Run one worker against a database: startup recovery assumes the common single-worker deployment.

Anonymous requests use the platform's shared `public-runner` account and therefore share experiment history. Signed-in accounts have their own ownership; administrators can inspect all experiments. Session mutation requests use the common CSRF protection.

## Measurements and scientific boundaries

Analysis limits each waveform and selected GDS file to 128 MiB and waveforms to 1,100,000 data rows; oversized evidence fails rather than consuming unbounded resources. The measurement request is limited to 64 KiB and native output manifest to 8 MiB.

The transient run covers four periods; analysis uses the settled interval from two through four periods. Rise and fall propagation delays use input/output 50% crossings with linear interpolation; `delayPs` is their arithmetic mean. Supply energy is trapezoidal integration of `-VDD × i(VDD)`; average power divides by the two-period window and energy per cycle divides by two. Missing crossings, simulator errors and nonfinite or nonpositive metrics fail measurement. Pulse period is not Fmax.

`areaUm2` is the union area of actual selected GDS top-cell boundary polygons on layer 63, datatype 0, in square micrometres. It is not transistor area or extracted capacitance. The GDS must have exactly one top-level cell and a nonempty boundary. Metric keys are `delayPs`, `delayRisePs`, `delayFallPs`, `averagePowerW`, `energyPerCycleJ` and `areaUm2`.

DTCO reuses the generic PPA comparison/Pareto helper. The existing native PPA importer expects OpenROAD/OpenLane/LibreLane physical-flow result provenance; it does not characterize this inverter or convert these schematic measurements into a physical-flow result. DTCO preserves its own result schema and scope.

Bounded Magic extraction research found nonfinite full-capacitance values, missing A/Y ports and floating well/substrate connectivity. Device extraction alone did not validate the circuit. The investigated DP 9-track output also extracted P width 2.035 µm against the source 2 µm, while SA 12-track width matched. Geometry preservation and LVS are therefore unproved. The product deliberately reports source-schematic electrical metrics alongside layout area, with `extraction.status="unavailable"`, and does not run extracted simulation.

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
| SQLite `jobs`, `job_steps`, `job_events` | Common execution state, processes and errors |
| SQLite `dtco_results`, `artifacts` | Normalized results and downloadable output metadata |
| `jobs/<jobId>/input/` | Frozen source, layout config/rules, complete model include closure, analyzer, resources and measurement request |
| `jobs/<jobId>/work/`, `output/`, `logs/` | Native working data, generated evidence and process logs |
| `results/dtco/<resultId>/` | Atomically committed result artifacts and manifest, initially private |

Within each workspace, `output/dtco/` retains `characterize.cir`, `waveforms.txt` (time, input voltage, output voltage, supply current), `ngspice.log`, `metrics.json`, `snapshot.json`, `provenance.json`, and copied `model/`, `catalog/`, `helpers/` and `resources/`. Native ACG evidence remains under its original output paths, including `output/acg-native.json`, `output/acg-result.json` and actual GDS candidates. The final normalized DTCO result is `output/dtco-result.json`; published copies preserve these relative paths.

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

The model entry must be relative to its root; the recursive include tree must exist and be readable. The analyzer entry must resolve to this repository's trusted helper. Save configurations, check paths, probe versions, run minimal self-tests, enable them and recheck DTCO options. All three required tools—`acg-mr`, `dtco-ngspice`, `dtco-analysis`—must have healthy current probes and successful self-tests. Optional `acg-renderer` enables previews. Tool self-tests are dependency/adapter checks, not proof that a saved experiment will route or that a design passes signoff.

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

Evidence is retained under `/home/duhaochen/dtco-validation-20261024`; the acceptance checklist is `acceptance-plan.md`. The source accompanies the commit containing this guide. Native research evidence remains separate from live website checks.

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

The successful matrix demonstrates schematic SPICE plus native generated-layout area and retained pipeline evidence. The extraction, geometry/LVS and signoff limitations above remain unchanged.
