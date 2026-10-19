# ACG operation

ACG is available at `/acg`. It runs the configured AutoCellGen native binaries and stores each run in the shared Jobs and Results system. See [administrator operations](admin.md) for the common account, tool-health and storage controls.

## Engines and inputs

| Engine | Native executable below the AutoCellGen root | Supported interface |
| --- | --- | --- |
| CMOS | `proj/autocellgen-cmos/build/bin/autocell` | One row; placement or routed output; DP and SA variants |
| DR | `proj/autocellgen-DR/build/bin/autocell` | Configured single/double-row mode; placement or routed output; native default algorithm; single-row, single-cell predefined layout replay |
| MR | `proj/autocellgen-MR/build/bin/autocell` | One to four rows; placement or routed output; native algorithms; placement JSON replay, port metadata, widening and routing feedback |

DR generation supports configured single/double-row eligibility. DR replay accepts only a single-row layout for one cell; two-row replay is rejected explicitly. These replay limits do not restrict two-row generation.

DR row selection controls eligibility: one disables `enable_double_row`; two enables it. Enabling double-row mode does not force every cell to use two rows. Native pair-count, `double_row_threshold` and track-dependent checks determine each cell's actual layout. Results derives `geometry.actualRows` from native placement text's `Layout Mode` and retains `rowEvidencePaths`. Missing or conflicting row evidence remains unknown rather than copying the requested setting.

MR with two to four rows requires GF180 and 5–16 routing tracks. Its routed mode requires `routing_algorithm: "pathfinder_rrr"` and automatic widening disabled. For multiple rows, requested `auto` or `dp` uses the native SA fallback; Results records the requested and effective algorithms.

Upload one self-contained SPICE/CDL netlist with unique `.SUBCKT` names and ports, up to 256 cells. Includes are not resolved. Map files to these roles:

- `netlist`: required `.sp`, `.cir` or `.cdl`.
- `config` and `rules`: native JSON objects. Choose a repository preset, or choose custom configuration and upload both files.
- `placement`: one-cell replay; MR native JSON or DR single-row native `[Column]` layout text.
- `port-verilog` and `port-metadata`: MR port inputs.
- `source-diagnostic`: optional MR Pathfinder hotspot JSON. Map this role in Input; its relative filename automatically populates the disabled diagnostic selector. Host paths are not accepted.

Presets are discovered from the selected engine's actual repository configuration files. Uploading config with a preset overlays that preset; uploaded rules replace its rules. Advanced `configOverrides` overlays the config. User controls then set mode, geometry, algorithm, candidate limits and seed. A placement seed is supported by MR; routing seeds remain native configuration settings. MR also exposes widening policy, extra column pitches, routing feedback and an uploaded JSON hotspot diagnostic.

The adapter accepts native configuration fields rather than replacing them with a small fixed schema. It rejects nonfinite values and host-path, command, executable and include references. Uploaded scripts are not executed. Native feature and technology restrictions still apply; preflight does not promise every configuration can route.

## User workflow

1. Open ACG → Input. Select an engine, placement/routed mode and a preset or custom config/rules.
2. Upload the netlist and optional files, assign roles, and set geometry, algorithm, candidate limit, timeout and verification.
3. Run preflight. It validates inputs, checks real tool health and freezes the configuration snapshot and input hashes. Changing inputs/settings requires another preflight. Optional core controls left empty retain their uploaded or preset configuration values; explicit controls take precedence over advanced overrides.
4. Select **Start workflow** once. The same job performs generation, same-input comparison, supported search and reporting. The inline monitor and Jobs page retain progress, events, stdout/stderr and cancellation controls.
5. On completion, Results opens the stored run. Inspect the stage summary and each cell's placement, routing, verification and actual artifacts. Download GDS, reports, effective config/rules, replay data and previews when available.

DR routed-template imports from supported grids are retained as `imported_unverified` with connectivity `not_checked` (native `NOT_CHECKED`). Importing valid GDS is not native routing proof: routing remains unknown, the cell remains partial, and that imported candidate is ineligible for official PV. Native placement replay is a separate solver operation.

MR replay runs `prepare-replay` before native generation. It retains the exact uploaded bytes as `output/replay/source-placement.json`, pads only the right edge of shorter rows with dummy columns when needed, and writes `prepared-placement.json` plus `preparation.json`. Source/derived SHA-256, native placement hashes, row widths and padding counts are retained in Results and downloadable; the native generator consumes the derived replay. Device columns are not edited.

Placement GDS contains placement candidates; it does not prove signal routing. Routed mode attempts native routing. A successful process can still have failed, partial or unchecked cells. Results retains those distinctions and the underlying evidence.

Previews are PNGs rendered from actual GDS. Missing renderer dependencies or missing GDS produces an unavailable preview rather than a substitute image.

## Unified workflow

The ACG Input page submits one `unified` operation. One preflight freezes the uploaded netlist, effective configuration, input hashes and execution plan. One Start runs generation, algorithm comparison, applicable known-feasible search and the final consolidated report in the same job. There is no workflow selector or separate report Start. The Results page retains ordinary cell previews and verification alongside the stage outcomes and report artifacts.

Comparison uses the uploaded cell names and netlists, not the native built-in benchmark cell set. The website adapter calls the unchanged native runner functions for custom cells; this is website orchestration, not a new native CLI feature. Comparison derives placement configurations from the same effective configuration and records its algorithm overrides. Search uses the same netlist lineage and records its native portfolio overrides. Replay layouts, port files, hotspot diagnostics and generation-specific CLI options apply to generation; comparison and search regenerate from the netlist and their recorded effective config/rules. Preflight and report identify these stage input boundaries.

| Stage | Native boundary |
| --- | --- |
| Generation | CMOS, DR and MR; existing placement/routed, replay, port, widening and verification options remain available. |
| Algorithm comparison | CMOS/MR GF180 native placement comparison; configured algorithms and repeated trials. DR and other technologies are explicitly unsupported. |
| Known-feasible search | MR GF180, rows 1–3; single row uses 9/12/16 tracks, multiple rows use 5–16. CMOS, DR and MR four-row search are explicitly unsupported. |
| Consolidated report | Summarizes every stage, including unsupported stages, native failures and search caps; retains the native comparison report where applicable. |

Default comparison uses DP and SA, one trial and one thread. Default search shares six attempts and 180 seconds across the job, limits each attempt to 30 seconds, and uses extra-CPP values 0, 2 and 4. These limits are editable and the preflight exposes the execution budget. A capped search is unresolved, not a proof of infeasibility. Unsupported stages are not presented as completed.

A native scientific failure may produce a partial consolidated report with the original exit code and evidence. Cancellation, orchestration timeout, configuration integrity failures and storage failures remain unsuccessful jobs. Generation evidence is normalized before comparison/search run, so a later search artifact cannot be misrepresented as the original generation result.

## Legacy research API and stored results

Earlier independent research operations remain available for API compatibility and historical results. They are no longer separate workflows in the ACG Input page. Their original interfaces and limits below describe the legacy API, not the unified uploaded-netlist comparison.

| Operation | Inputs and controls | Execution boundary |
| --- | --- | --- |
| Algorithm comparison | CMOS/MR; native fifteen-cell subset; algorithms; row counts; trials 1–10; threads 1–4; report maximum columns 4–32. Optional rules and `<algorithm>.json` configuration uploads. DP/SA have trusted defaults; other algorithms require matching uploads. | GF180 placement-only native matrix; CMOS row 1, MR rows 1–4; at most 1000 cell×algorithm×row×trial runs. User netlists are not accepted here. |
| Comparison report | CMOS/MR; exactly one native aggregate JSON upload or previous owned comparison result; report maximum columns 4–32. | Runs the unchanged report renderer only; no native binary or healthy placement engine is required. |
| Known-feasible search | MR; up to fifteen built-in or uploaded single-cell netlists; optional config/rules; rows 1–3; track and extra-CPP ladders; cumulative attempt, total-time and per-attempt budgets; optional previous owned search. | Bounded native GF180 portfolio. Single row uses 9/12/16 tracks; multiple rows use 5–16. Extra CPP is 0–16, subject to the unchanged native width bound. |

Legacy report and continuation sources use the effective execution owner, including the shared anonymous public-runner. Foreign published results cannot become report or continuation sources. DR legacy research operations are unsupported.

Process completion, metric collection and native exit outcome are independent. Metrics may be retained after a timeout or nonzero exit; they do not prove layout validity. Results displays native success, exit/timeout, collected metrics and `NOT_EVALUATED` layout validity separately. Static native Markdown captions are not new scientific findings. Corpus statuses such as `CAPPED_UNRESOLVED` and `CAPABILITY_BLOCKED` remain distinct; a `RESEARCH_GDS_VALID` witness establishes the native model/placement/routed-GDS/LVS0 level only, with external LVS1 and foundry signoff `NOT_RUN`. Completed partial reports may be published; actual process cancellation or timeout remains an unsuccessful job.

Corpus caps are 1–100 attempts, 1–86400 total seconds per cell and 1–3600 seconds per attempt. The service rejects a derived serial budget above the configured helper timeout instead of truncating it. Repeated matrix trials retain supplied configuration seeds; native algorithm aliases are reported separately from the requested labels. Research controls do not support arbitrary uploaded scripts or host paths.

## Generation and verification

The Input control is **Requested verification**. It selects additional checks; it is not a promise that the generated layout passes them.

| Selection | What it means |
| --- | --- |
| `none` | No additional checks requested. CMOS optional layout checks are disabled. MR mandatory native structural gates remain, and an inherited foundry profile is cleared. |
| `research` | Native checks where supported. Proved MR routed GF180 candidates additionally run `research-lvs1`, the real native KLayout research connectivity extractor. It runs after native inspection and before optional official PV. |
| `foundry` | External official GF180 DRC/LVS on proved routed candidates. Requires routed GF180 output and a healthy, self-tested `acg-pv` configuration. |

Research LVS1 retains the original GDS, manifest and native ledger hashes, plus a separate merged verification ledger, extracted connectivity, summary and driver logs. `LVS1_EXTRACTED_CONNECTIVITY=PASS` is distinct from the older native placeholder `LVS1_CONNECTIVITY=NOT_CHECKED`. Research verification does not certify foundry signoff.

Missing checks stay unknown or not run; a native exit code does not become a verification pass. Official failures remain reported. The PV tool's **self-test checks dependencies only**; it does not run or certify a design's DRC/LVS.

## Administrator setup

Use Node 24. Build all three native engines and their Z3 dependency before initialization. The engines expect Z3 at `tools/z3/build/install/usr/local/lib` below the AutoCellGen root; a default `lib64` install fails their dependency check. Configure the exact prefix and explicitly select `lib`:

```sh
cd /home/duhaochen/AutoCellGen_TY
cmake -S tools/z3 -B tools/z3/build -DCMAKE_INSTALL_PREFIX="$PWD/tools/z3/build/install/usr/local" -DCMAKE_INSTALL_LIBDIR=lib -DCMAKE_BUILD_TYPE=Release -DZ3_BUILD_EXECUTABLE=OFF -DZ3_BUILD_TEST_EXECUTABLES=OFF
cmake --build tools/z3/build --parallel 2
cmake --install tools/z3/build
```

If Z3 is already compiled but installed under `lib64`, reconfigure with the prefix and `CMAKE_INSTALL_LIBDIR=lib`, then run `cmake --install`; recompilation is unnecessary. Build the three engines after installing Z3.

Configure the backend and worker to use the same persistent database/storage. With no running, queued or validating jobs, run from the website repository:

```sh
EDA_STORAGE_ROOT=/path/to/persistent-storage \
EDA_DATABASE_PATH=/path/to/persistent-storage/eda.sqlite \
npm run tools:acg:init -- \
  --root /home/duhaochen/AutoCellGen_TY \
  --python /home/duhaochen/.local/share/autocellgen/venv/bin/python \
  --pdk-root /path/to/gf180mcuA \
  --probe --self-test
```

The production Python environment lives outside validation output. Its pinned packages are `gdstk==0.9.61`, `Pillow==11.3.0`, `docopt==0.6.2` and `klayout==0.30.7`, with NumPy 2.0.2 available. Create an equivalent environment at another persistent location and pass `--python` when needed.

Install the Python dependencies in that persistent environment:

```sh
python3 -m venv /home/duhaochen/.local/share/autocellgen/venv
/home/duhaochen/.local/share/autocellgen/venv/bin/python -m pip install gdstk==0.9.61 Pillow==11.3.0 docopt==0.6.2 klayout==0.30.7 numpy==2.0.2
```

All dependency locations above are administrator-configurable. The initializer validates paths, registers only ACG tools and reuses identical configurations without adding revisions. Both flags run their checks; a failed check returns a nonzero CLI exit status.

| Tool | Purpose and dependencies |
| --- | --- |
| `acg-cmos`, `acg-dr`, `acg-mr` | Direct native binaries; trusted AutoCellGen root, Z3 shared library, Java and repository GDS conversion resources |
| `acg-renderer` | Website `scripts/acg/render.py`; configured Python with gdstk, NumPy and Pillow |
| `acg-replay` | Website `scripts/acg/prepare_replay.py`; configured Python; exact source/derived replay and hash lineage |
| `acg-lvs1` | Website `scripts/acg/research_lvs1.py`; configured Python, native MR research extractor and technology deck, KLayout executable |
| `acg-pv` | Website `scripts/acg/pv.py`; configured Python with gdstk, docopt and KLayout Python bindings, KLayout executable, official GF180 decks and runner |
| `acg-research` | Website `scripts/acg/research_workflow.py`; configured Python and trusted native README runner/report/corpus scripts; generation operations also require their configured native engine |

Native tool configuration supplies `PATH` and `LD_LIBRARY_PATH`; the initializer derives Z3's library path from `--root`. It stores `--pdk-root` as the PV tool's audited `AUTOCELLGEN_PV_GF180_ROOT` environment value. The adapter copies trusted conversion resources into each job workspace.

Native self-tests perform a small real placement. Renderer self-test creates real GDS/PNG. Replay self-test checks real normalization and hash lineage. LVS1 self-test checks the research extractor/deck and KLayout dependencies; it does not validate a design. PV self-test checks its official runner/decks and dependencies. Research workflow self-test verifies the adapter contract and records its source checksum; it does not run the native matrix or corpus. Generation preflight requires a successful current native probe/self-test; comparison report preflight requires only the current research helper and trusted report resources.

Reload the backend and any independent worker after platform changes. The embedded worker is enabled by `EDA_EMBED_WORKER=1`; ACG concurrency defaults to one and is configurable through `EDA_ACG_CONCURRENCY`. Confirm `/api/health` lists ACG and `/api/modules/acg/capabilities` exposes three engines with current health.

## Persistence and access

`EDA_STORAGE_ROOT` contains `jobs/<jobId>/input`, generated `work`, native `output` and retained `logs`. Atomic publication moves staged artifacts into `results/acg/<resultId>`. SQLite stores jobs, steps, events, artifacts, configuration revisions and `acg_results`; migration003 adds ACG and grants the existing public-runner access without rebuilding prior module tables.

Computed results begin private and are visible to their owner and administrators. Published results are accessible through the common result APIs; deleted results are hidden. Anonymous submissions share the persistent public-runner account. Use separate signed-in accounts when separate ownership is needed. Result-scoped metadata and ZIP use `GET /api/results/acg/:resultId/artifacts` and `GET /api/results/acg/:resultId/artifacts.zip` with the same result access rules. Published readers can preview and download retained artifacts; task logs remain private to the owner and administrators. ZIP entries preserve cell directories and disambiguate duplicate paths.

Completed steps retain their recorded process ID and process-group ID for traceability; these historical IDs do not mean the process is still running. Failed or cancelled jobs retain diagnostic evidence in their job workspace. Cancellation during parsing or publication produces no completed result or partial published directory. Back up SQLite and artifact storage together; do not remove job/result directories directly while workers are active. River currently uses the persistent, Git-excluded directory `/home/duhaochen/website-trial-v1/.eda-storage`. The SQLite database is `/home/duhaochen/website-trial-v1/.eda-storage/eda.sqlite`; job workspaces are `/home/duhaochen/website-trial-v1/.eda-storage/jobs/<jobId>`; published ACG artifacts are `/home/duhaochen/website-trial-v1/.eda-storage/results/acg/<resultId>`. An external persistent directory is also supported through `EDA_STORAGE_ROOT` and `EDA_DATABASE_PATH`; no storage move is required for ACG.

Unified jobs retain the frozen request in `work/unified-request.json`, generation evidence in `output/acg-generation.json`, comparison artifacts in `output/unified/comparison`, search artifacts in `output/unified/search`, and consolidated `REPORT.md` / `REPORT.json` in `output/unified/report`. The published result keeps these same relative output paths under `results/acg/<resultId>`, with `output/acg-result.json` as the final normalized result. Each stage summary binds the request, shared input/config/rules, helper and native resources, and retained evidence hashes.

Legacy research jobs stage trusted scripts, binaries and conversion resources under `jobs/<jobId>/work/native/<workflow-id>/project`; generated reports, copied input bytes and native evidence remain under `output/research-workflow`. Published copies use `results/acg/<resultId>/output/research-workflow`. `source-request.json`, `lineage.json` and `snapshot-files.json` bind the request, parent result and complete retained file inventory. Runtime resource copies are not published as result artifacts.

Continuation reuses omitted config/rules/netlists from the owned source's retained inputs, including after a page refresh. Each reused byte must match both DB artifact and lineage hashes. Explicit uploads must match the originals. Cells, rows, track and extra-CPP ladders, native script/resources and executable must remain identical; only attempt and time caps may increase. Prior attempts and consumed native wall time remain cumulative. Original source results stay immutable; relocated consumed paths and derived JSON hashes are recorded separately. Adapter upgrades record source/current wrapper checksums. Snapshot/hash checks occur again before execution. Actual cancellation/timeout kills the wrapper's process group and retains job diagnostics without publishing a completed result.

## Unified workflow acceptance (2026-10-09)

Actual browser acceptance on port 3000 completed MR, CMOS and DR through one acknowledged Start per job. MR job `8ba97871-4303-44b8-906c-e2451157e71b` produced result `09c90887-cd25-48b4-966b-f4091e081721`: two uploaded cells generated, four DP/SA trials completed, and both cells obtained a native `RESEARCH_GDS_VALID` search witness in one attempt each. Fourteen retained GDS files decoded successfully. Native required hard checks and model/routing milestones passed; the detailed geometry aggregate retains its native `NOT_CHECKED` value, and no extracted LVS1 or foundry certification is inferred from search.

CMOS job `a7d79292-88d3-415c-b795-e5b243555d80` and DR job `54a61257-9176-419c-8eda-af6e227d77ad` completed generation and their applicable stages. Unsupported search (CMOS) and comparison/search (DR) remain explicit. Report downloads bind exact stage paths despite duplicate `REPORT.md` basenames; complete ZIPs and retained artifact hashes were verified. Desktop and narrow result views and real GDS previews were checked. ACG-scoped grid constraints fixed the observed narrow-screen table overflow; final read-only MR/CMOS/DR checks at 390 px confirmed page width equals viewport width while wide tables scroll internally.

Cancellation job `1512234f-70fd-46e1-89c5-aa9e2d3fee29` was cancelled through the browser while native execution was active; it published no result and its PID/process group exited. Frontend checks passed 47 tests plus type checking; scoped backend checks passed 13 tests plus type checking; Python workflow checks passed 31 tests; independent compatibility regression passed 75 tests. Evidence is retained under `/home/duhaochen/autocellgen-integration-validation/unified-workflow-20261009/` and `/home/duhaochen/autocellgen-integration-validation/unified-independent-review.json`.

## Earlier acceptance status

Shared-platform migration, API ownership, publication/cancellation and TypeScript checks have passed. Isolated API and native acceptance verified 18 actual cases: 17 completed generation and one full DR route-template import correctly remained partial and unverified. Multi-cell artifact identity, including colliding cell-name prefixes, and DR placement replay followed by native routing were verified. Native DR replay and fresh-generation baseline checks also completed. Coverage includes all three engines in placement/routed modes, MR two-row routing and DP-to-SA fallback, MR three/four actual occupied rows, DR actual two-row geometry, port metadata, single-row MR JSON replay, result ownership/publication, retained artifact hashes, restart persistence and native cancellation/timeout cleanup.

Actual official GF180 PV pipeline execution completed and retained real DRC/LVS failures; this verifies pipeline integration and does not establish design signoff. DR two-row replay remains unsupported; imported routing templates remain unchecked and ineligible for official PV. Native single-row DR placement replay omits the `Layout Mode` header, so normalized actual rows and the UI remain unknown even when the retained N/P placement grid proves one row; this does not negate its separately verified native routing. The tested MR two-row initial four-column placement replay was unroutable and its failure was retained; the routed five-column candidate was not yet mapped to replay input. All eight current production tools completed healthy probes and self-tests, including replay preparation, research LVS1 and the research workflow helper. The production MR two-row browser workflow on port 3000 passed actual anonymous upload → role/config selection → preflight → native run → Results/preview → result-scoped ZIP download. Its native result records two actual rows, four-column placement and five-column routed output; both retained GDS files were decoded, the 1400×900 preview displayed, and desktop/narrow layouts had no page errors. Tool self-tests and platform tests do not replace these actual-run checks.

The production job is `3d01fa54-39c7-462d-8e85-8f65c3c4d1e4`; its result is `5a8736e1-173d-4ec4-9cb3-80d34a4e1d4a`. Detailed acceptance evidence, artifact hashes, screenshots and preserved failed attempts are recorded in `/home/duhaochen/autocellgen-integration-validation/web-acceptance/acceptance-final-summary.json`. The result-scoped ZIP verifier was corrected against this existing result without another native generation.

The current 2×9T staged browser smoke also passed fresh placement → exact export download → reupload with four extra CPP → native routing → Results/preview/ZIP. Job `303113f3-04c2-43d8-b6d0-d7dd9779839d`, result `f4c7a1c0-6215-4df6-a204-ca91c6a87cde`, passed occupied-row, alternating power rail, per-row input, internal M2 crossing, LVS0 and extracted research LVS1 checks. The source grid width of two (four CPP including borders) became six (eight CPP) after four extra CPP; source/derived replay bytes and hashes were verified. An empty optional KLayout diagnostic log stopped the first audit; the completed result was rechecked without another native run.

All 36 production MR height profiles passed: GF180 `inv4_common`, rows 2/3/4 × tracks 5–16, using browser placement → untouched native export download/reupload → transparent replay preparation → `uniform_safe` with four extra CPP → routed Results/preview/ZIP. Requested parameters, input/config/rules hashes, native argv and candidate artifacts bind each result to occupied rows, alternating power rails, N/P input A per row, internal M2 crossings, LVS0 and extracted research LVS1 evidence. Foundry checks were not run. The 2×9T placement has an acknowledged browser Start; its byte-identical original routed result retains reviewed historical after-Start evidence with no claimed POST acknowledgement. Native source files and all three binaries remained unchanged. Frozen evidence is `/home/duhaochen/autocellgen-integration-validation/readme-browser-audit/profiles-36-frozen/summary.json`.

All eight research browser job Starts passed on production port 3000: custom MR corpus cap and continuation, MR DP/SA comparison, CMOS DP comparison, an authenticated foreign-owner MR comparison, and three report-only jobs. Six native children ran; the three report-only jobs ran no native placement/routing. A separate zero-Start ownership check verified anonymous effective-owner sources and foreign/other-engine exclusions. Browser Start acknowledgements, selected parameters, retained input hashes, native outcomes and result-scoped ZIP hashes bind the evidence. Native comparison metrics remain `NOT_EVALUATED` for layout validity.

The custom corpus first retained `CAPPED_UNRESOLVED`; after a full page reload, selecting its owned source with zero uploaded files resumed to `RESEARCH_GDS_VALID`. Attempts increased from one to two and consumed native time from 5.024 to 9.9 seconds, preserving the original input hashes and attempt prefix. Result `610be868-4b6d-4ee6-a73a-28a56c448195` retains the selected routed GDS and actual placement/routing/LVS0 PASS reports; external LVS1 and foundry signoff remain `NOT_RUN`. This run exposed and fixed the ACG research draft endpoint's erroneous requirement for at least one uploaded file, covered by five HTTP regression tests. Earlier failed preflight attempts remain retained. Actual Input controls and Results screenshots use the full site styles and passed visual review. Evidence is `/home/duhaochen/autocellgen-integration-validation/readme-browser-audit/research-ui/execution-summary.json`, with hashes in `EVIDENCE-HANDOFF.json` and zero active jobs recorded after the eighth Start.

The 17 selected README feature cases finished with 15 scientific passes and two `tested_native_failure` outcomes. MR `sa_exp`, three rows, 9 tracks, seed 7 and one candidate for `inv4_common` emitted no GDS: native execution exited zero, but PRE_ROUTE failed `GF180_CRITICAL_GEOMETRY` because a declared row contained no active device. Result `67c9b984-c39d-496c-b28c-6131629d8291` records the cell and pre-route check as failed.

The two 15-cell MR placement batches used `greedy_min`, 9 tracks, seed 7 and one candidate. One row produced 15/15 cell GDS outputs; two rows produced 14/15, with `inv_x1` rejected by the native PRE_ROUTE gate because row 1 contained no active device. Thus 29/30 cell placements emitted GDS; this is not routed or signoff coverage. Result `8faac99f-ff07-4c24-b30a-a874cfbd9438` retains the failed cell alongside the other 14 complete cells. Both failure cases consumed the frozen requested config, and read-only browser checks displayed the failed placement/pre-route status and downloaded the matching native ledger. Evidence is under `readme-browser-audit/matrix/`: `feature-checkpoint.json`, `feature-native-failure-sa_exp-3row.json`, `readme-15cells-2row-retained-native-failure.json` and both `*-failed-ui-proof.json` files. Failures remain retained without a native edit or automatic retry; these outcomes do not establish full README verification.

The 23 supplemental browser cases completed with 19 verified generation workflows, one correctly partial DR routing-template import and three verified terminal cases: native routing congestion, cancellation and a one-second timeout. The terminal cases published no result and retained no surviving native process group. Official GF180 PV ran both drivers and retained DRC FAIL (93 markers) and LVS FAIL (netlists did not match); this verifies execution and failure reporting, not signoff. Other cases verified CMOS/DR modes, single-row MR DP, non-GF180 preset generation, blank/explicit config precedence, multi-start seeds, port metadata application, widening policies and height-dependent folding. Native port directions are not serialized in final evidence, so application/UNKNOWN checks do not establish final direction precedence. Evidence is `readme-browser-audit/matrix/supplemental-checkpoint.json`; the additional DR two-row placement result `123c9f15-8904-4520-8aab-a0bd5676b3e7` is bound by `supp-dr-double-row-browser-summary.json` and `supp-dr-double-row-supplemental-science.json`. Its four-device native export proves both N/P transistor rows and the `VSS–VDD–VSS` branch; routing was not requested.

Two additional zero-Start browser ACL views verified anonymous published research reports and authenticated non-owner published DR previews/metadata/ZIP. Private job and log access remained denied. Both test results were restored to private, all eight subsequent result/artifact accesses returned 404, and the temporary test account was disabled with sessions revoked. This used authorized repository publication of acceptance fixtures, not an administrator UI workflow. Evidence is `readme-browser-audit/matrix/live-readonly-acl-evidence.json` and `live-private-rollback-evidence.json`.

The 18 README requirement groups now map to retained evidence and explicit scope limits. Twenty-eight preflight boundaries and 75 preset catalog selections passed without starting native jobs; these are not generation evidence. Technology generation covers representative presets, not every preset. Folding counts come from occupied native export devices/GDS because `finger_summary` contains only a header. Restart persistence was verified in the earlier isolated API/hash acceptance; no new production restart was performed. Bounded research examples do not establish exhaustive corpus or algorithm success. Platform tests and intercepted frontend tests do not establish browser/native coverage. Detailed requirement status and evidence paths are in `/home/duhaochen/autocellgen-integration-validation/readme-browser-audit/coverage-matrix.json` and `coverage-matrix.md`.

## Horizontal result comparison (2026-10-17)

Results supports multiple checkboxes in selection order. Search, engine filters (CMOS, Double Row, Multi Row) and Clear remain available. Filtering does not discard selections; Refresh retains available IDs. A just-finished result is added once and focused in its overview column without replacing other selections. Ordinary checkbox changes do not request focus or scrolling.

The comparison table has a column per result and the union of metric rows from every selected result. Generation scopes use exact, case-sensitive cell names. Research/unified comparison trials align by cell, requested algorithm (falling back to recorded algorithm), row count and zero-based trial index; legacy report copies use the same trial keys. Search outcomes use exact cell names. Unidentified scopes are isolated per result; duplicate scopes are explicitly ambiguous. Cells/trials/attempts are never summed or implicitly selected. A scope selector can narrow the table; the default shows the full union. Search attempt evidence remains accessible in the matching result's feasible-search column.

The first selected result is the default baseline; any selected result can be chosen as baseline. Removing it falls back to selection order. Deltas show signed absolute change and `(value - baseline) / abs(baseline) × 100` when finite and the baseline is nonzero. Zero baseline retains the absolute delta with percentage unavailable. Absent fields display —, explicit null/nonfinite values display Unavailable, and statuses/booleans have values without numeric deltas. Numeric strings are not coerced.

Numeric deltas require identical scoped metric meaning, units and recorded technology. Placement cost, normalized HPWL and cross-row counts additionally require the same engine. Known metrics declare CPP, time, row or count units; unknown numeric fields remain visible without inferred deltas unless they explicitly declare `{value, unit, semantic}`. Placement width, proved routed width, minimum trial width and unknown-source width remain distinct. Configuration differences are retained as context in the table and provenance; comparison does not establish equivalent inputs, layout validity or certification.

Every checked result is represented throughout Results: overview/job/provenance, unified stage evidence, algorithm trials, feasible search, generated cells, and reports/artifacts/downloads each have horizontal columns in selection order. The global single-result inspector has been removed. Generated-cell groups cover the exact case-sensitive union of cell names, with an explicit missing-cell placeholder in every absent result; unnamed records are isolated and duplicate identities retain all records with an ambiguity notice. There is no first-cell fallback. Each cell column retains placement, routing, verification, width evidence, its own GDS preview selector, candidates, diagnostics and downloads. Cell navigation links expose every group. Unified, legacy and generation-only results show explicit absent section states.

Each selected result loads its own artifact metadata; adding or removing another selection does not restart its request. Refresh reloads every selected result. Requests are guarded against late responses after removal/refresh, and metadata with a different result ID is rejected. Errors/loading stay in that result's columns; no other result's artifact list is substituted. Stage-relative paths remain bound to their exact unified stage. Complete retained payloads are available in each report/artifact column. Section columns and nested tables scroll locally, including at 390 px.


Phase-level numeric evidence is retained in its own scope, separate from cells and trials. Unified search root metrics and explicit legacy corpus metrics appear under **Feasible search · Job**, including consumed/remaining attempts and seconds, maximum attempts and the shared wall budget. These are recorded values; the frontend does not derive totals from cells. Other root numeric fields remain visible without inferred units or deltas. Return/exit codes and requested/effective thread settings remain labelled metadata. Conflicting duplicate job observations are ambiguous. Parser-defined cell `validGdsCount` is a count metric with `valid-gds-count` meaning, so corresponding finite values can show count deltas even when no `cell.metrics` object exists. Unknown scalar counters do not gain count semantics by naming convention.
