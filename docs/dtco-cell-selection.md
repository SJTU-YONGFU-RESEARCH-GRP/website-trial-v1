# DTCO standard-cell selection

This workflow selects a legal library cell for each instance in a digital circuit graph. It evaluates candidate assignments with native OpenSTA and compares area with timing feasibility. Complete v2 results also run native OpenROAD placement, pin placement, power routing and detailed signal routing for every evaluated assignment, then stream the resulting circuit into GDS with KLayout. It is separate from transistor sizing and from the integrated DTCO characterization pipeline.

## Library and analysis scope

The installed reference is GF180MCU 7T at TT, 25°C, 5 V. The hydrated Liberty is `data/digital-technologies/16bef11f7368a98382ba22ba1ba16ab0/library/timing.lib`, SHA-256 `08070623e53cd1db9abf74c6719510ebc11d8587895c0543016a28e025da0108`. Its timing and capacitance units are ns and pF; cell areas are µm². OpenSTA successfully loads this file.

Supported graph families are INV, NAND2, NOR2, AND2 and positive-edge DFF, each with drives 1, 2 and 4. The native library prefix is `gf180mcu_fd_sc_mcu7t5v0__`; cell stems are `inv`, `nand2`, `nor2`, `and2`, and `dffq`. The DFF has characterized setup, hold and clock-to-Q arcs.

Timing and optimization scores remain pre-layout cell estimates, even when the candidate has a completed routed GDS. Interconnect has no extracted routing parasitics. Summed Liberty area is the optimization metric; it is not placed die area. A setup or hold pass applies only to the frozen corner, graph and submitted constraints. It does not establish multi-corner signoff, physical legality, clock-tree quality or routed timing. Power is not an optimization metric in this workflow.

## Circuit and constraints

Each instance has a unique ID, family, input nets, output net, initial drive, allowed drives and optional lock. IDs and net connectivity determine the circuit; array position is not a stage number. A locked instance retains its initial drive. An unlocked instance can select only one of its allowed drives.

Combinational instances use one input for INV and two for NAND/NOR/AND. A DFF uses its data input and the graph clock. Its output Q launches a new register-to-register path. DFF-INV-DFF therefore requires real setup and hold checks at the capture DFF, including the launch DFF clock-to-Q arc.

Clock period, input/output delays, input slew, output load, setup clock uncertainty and hold uncertainty are explicit request constraints. Keep units consistent with the displayed labels. Tightening setup and hold requirements can make every allowed assignment infeasible.

## Interpreting a run

Inspect the baseline and every evaluated candidate, including assignments, mapped cell names, area, path delay, setup/hold slack and native report artifacts. A missing timing path or missing numeric slack is unavailable evidence, never a timing pass. A search with no feasible evaluated candidate has no selected winner. Proven violations yield `no_feasible_candidate`; missing or unknown timing evidence yields `inconclusive` if there is no feasible candidate.

Area minimizes summed cell area, using path delay to break ties. Performance maximizes global max/setup slack at the submitted fixed clock period, using area and path delay to break ties. Balanced combines equal weights of normalized area and constrained timing budget (clock period minus global max slack). It normally uses the baseline reference; if baseline timing is unknown, it uses the first known positive timing reference. Different objectives can legitimately select the same assignment. These scores do not measure circuit clock Fmax.

A selected result is the best feasible assignment among the evaluated candidates under the chosen objective. The search record states the theoretical space size, evaluations performed and termination reason. A budget-limited search does not prove a global optimum.

Completeness and timing feasibility are separate. A `dtco.cell-selection.result.v2` result is complete only when every evaluated candidate has successful physical evidence, including the exact assignment, routed DEF, circuit GDS, validation, native logs and hashes. An infeasible timing candidate can still have a completed physical layout; a missing GDS cannot count as a complete result.

## API and reproducibility

`GET /api/dtco/selection/options` provides available libraries, example graphs, defaults and an unavailable reason. `POST /api/dtco/selection/runs` submits a direct `dtco.cell-selection.request.v1` request and returns a queued job. `GET /api/dtco/selection/runs/:id` returns its job, structured result and downloadable artifacts. `GET /api/dtco/selection/runs` lists owned runs; failed, cancelled or interrupted runs can be retried with `POST /api/dtco/selection/runs/:id/retry`. Cancellation uses `POST /api/jobs/:id/cancel`.

The workflow reuses the platform job queue, configured native OpenSTA/OpenROAD/KLayout and artifact download system. Each run freezes its request, Liberty, physical LEF/GDS/layer-map assets and runtime/tool hashes. Native OpenROAD places the exact functional instances, connects the power grid and routes the signal nets; KLayout imports the real cell masters and preserves routed DEF placement and geometry in the circuit GDS. This flow operates on the mapped graph rather than running a Digital RTL synthesis job. It does not run the transistor-sizing, AutoCellGen or LibCharX characterization pipeline.

Historical v1 timing-only runs remain archived and are excluded from the completed-result picker. **Complete layout flow** explicitly submits `POST /api/dtco/selection/runs/:id/complete-layout` with `{}`. It returns a new linked job; `completeness.sourceJobId` and `sourceResultId` identify the archive. It retains the original evaluated assignments and timing, adds physical evidence to every row, and leaves the source result unchanged. History is not automatically backfilled.

Selected completed results use the same picker fields. Detailed comparison is one merged section, initially collapsed; recorded platform pipelines are also initially collapsed. The selected-result gallery binds each preview and GDS download to that candidate's retained physical artifact.

For each evaluation, retain mapped Verilog, SDC, OpenSTA Tcl/log, JSON setup/hold/global min/max reports and provenance. Native JSON report times are seconds; the result displays ns. Multiplying native slack by 1e9 reproduces the corresponding structured slack. Path delay comes from the global maximum report; for a primary-input path it subtracts the first source arrival, so multiplying data arrival alone is insufficient. Native electrical reports must also pass capacitance, slew, minimum pulse width and minimum period checks.

The archived timing acceptance harness lives outside the source checkout at `/home/duhaochen/AI-Core-Workshop/evidence/dtco-cell-selection/acceptance/run_acceptance.py`. After freezing source and starting the final server, run it with `python3 /home/duhaochen/AI-Core-Workshop/evidence/dtco-cell-selection/acceptance/run_acceptance.py --base http://127.0.0.1:3001 --execute-after-freeze`. It creates timestamped evidence directories and downloads actual artifacts for numeric audits. The current harness uses the corrected independent-input complex graphs and a legal clock for isolated setup rejection. Executed historical harness snapshots are retained inside their evidence directories; the joint-constraint fixture is also available as `run_joint.py`.

## Importing a larger circuit

The circuit JSON uploader accepts the circuit object alone. This tested example has independent data inputs, four DFFs, fanout and reconverging branches. Paste or upload this object, then set constraints separately.

```json
{
  "name": "branched_sequential", "inputs": ["da", "db", "clk"],
  "outputs": ["q1", "q2"], "clock": "clk", "instances": [
    {"id":"launch_a","family":"DFF","inputs":["da"],"output":"la","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"launch_b","family":"DFF","inputs":["db"],"output":"lb","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"branch_a","family":"NAND","inputs":["la","lb"],"output":"a1","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"branch_b","family":"NOR","inputs":["la","lb"],"output":"b1","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"invert_a","family":"INV","inputs":["a1"],"output":"a2","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"invert_b","family":"INV","inputs":["b1"],"output":"b2","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"merge_a","family":"AND","inputs":["a2","b2"],"output":"a3","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"merge_b","family":"NAND","inputs":["b2","la"],"output":"b3","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"buffer_a","family":"INV","inputs":["a3"],"output":"a4","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"buffer_b","family":"INV","inputs":["b3"],"output":"b4","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"capture_a","family":"DFF","inputs":["a4"],"output":"q1","allowedDrives":[1,2,4],"initialDrive":1},
    {"id":"capture_b","family":"DFF","inputs":["b4"],"output":"q2","allowedDrives":[1,2,4],"initialDrive":1}
  ]
}
```

For the tested bounded run, use objective **Area**, evaluation budget **25**, and these constraints (ns and pF):

```json
{
  "clockPeriodNs": 100,
  "inputDelayNs": 0.1,
  "outputDelayNs": 0,
  "inputSlewNs": 0.1,
  "outputLoadPf": 0.01,
  "clockUncertaintyNs": 0,
  "holdUncertaintyNs": 0
}
```

Changing the input JSON changes circuit connectivity. Changing allowed drives or locks changes the search domain. An evaluated subset of this 531,441-assignment space is evidence of bounded search, not exhaustive optimization.

## Archived timing acceptance evidence

The reviewed historical acceptance covers 396 actual native candidates across 16 cases. Every candidate has its mapped Verilog pin/net/drive connectivity and Boolean or next-state signature independently checked, along with its Liberty-derived exact decimal area. Native setup/hold/global min/max report slack matches the structured result. The audit verifies 4,372 output hashes against the embedded provenance manifest, in addition to each downloaded artifact's published hash and size. All 303 feasible candidates pass native electrical checks.

Evidence is under `/home/duhaochen/AI-Core-Workshop/evidence/dtco-cell-selection/acceptance/`. `historical-audit-summary.json` indexes the cases. `run-20261107-211218` contains exhaustive 81-assignment four-family combinational searches, 27-assignment DFF-INV-DFF searches, objective/lock/domain checks and negative cases. Its original larger fixtures are logically redundant and are not the meaningful complexity proof. `run-20261107-212539` supplies corrected independent-input 12-instance combinational and branched four-DFF sequential cases, with 13 and 25 evaluated candidates respectively. Both capture-register endpoints appear in the native reports. Missing register paths are explicitly inconclusive, and malformed connectivity, library paths and identifiers are rejected.

Negative fixture evidence is preserved: a 1 pF load exceeds the AND cells' native maximum capacitance, and the initial 1.05 ns sequential clock violates native minimum-period/pulse-width checks. Neither is presented as feasible. `run-20261107-212609` instead proves isolated setup rejection with a legal 10 ns clock, positive hold/global minimum slack and clean electrical checks. These broad runs precede the final exact-decimal-area ranking correction; the final joint-constraint rerun is documented separately below.

Reusable tested fixtures are in `docs/examples/dtco-cell-selection/`:

| Circuit JSON to upload | Separate settings reference | Structure |
| --- | --- | --- |
| `combinational.circuit.json` | `combinational.settings.json` | NAND/NOR/INV/AND, ternary drives |
| `sequential.circuit.json` | `sequential.settings.json` | DFF-INV-DFF, all-X2 baseline |
| `complex-combinational.circuit.json` | `complex-combinational.settings.json` | 12 instances, ten independent inputs |
| `complex-sequential.circuit.json` | `complex-sequential.settings.json` | 12 instances, independent data inputs, four DFFs |

Upload only the `.circuit.json` file. The `.settings.json` file is a reference for setting the library, constraints, objective and evaluation budget in the UI; it is not a circuit upload file. For direct API submission, combine the circuit object with those settings and the request schema/version fields shown in the API contract.

The final eight-assignment joint-constraint run is job `91df5738-c81a-49d7-8296-30d028ce6bdf`, evidence `run-20261107-213134`. With period 2 ns, setup uncertainty 0.95 ns, hold uncertainty 0.70 ns, input delay 0.8 ns and output load 0.03 pF, the all-X2 baseline fails setup (−0.01255 ns) while all-X1 fails hold (−0.008769 ns). Three assignments are feasible. The selected launch/INV/capture drives are **1/2/1**, area **140.4928 µm²**, setup slack **0.005558 ns**, hold slack **0.01633 ns** and global minimum slack **0.01423 ns**. Both DFFs change from the baseline. Drives 2/1/1 have exactly equal area and reported path delay; 1/2/1 is the first equal-ranked candidate, not evidence of another timing tie-break.

This final job records engine SHA-256 `e8ebab5cc890157fc7b74b67da32ff84113f3cf01b04a49df84a3b9c73c8f520` and snapshot hash `66f2adf864f4d081560d3d62cd8eb6c46c78cc9e1540e56f21271900cff17271`. The historical engine hash is `93df08ec48b8a513666c767de05ff279dafecece7c0ba4f83019df53b82d1f87`; its raw timing and logic evidence remains separately classified. `final-summary.json` records the distinction and final audits: **404 candidates and 4,461 embedded provenance output hashes** across the historical runs and final rerun. The final eight candidates independently pass mapped connectivity/function, canonical decimal area, report-slack and artifact-integrity audits; feasible candidates also pass native electrical checks.

## Complete physical-result acceptance

The independent physical acceptance harness is `/home/duhaochen/AI-Core-Workshop/evidence/dtco-complete-results/run_acceptance.py`. Run it only after source freeze and native tool health checks, using `python3 run_acceptance.py --execute-after-freeze`; it intentionally submits one four-candidate combinational run and one explicit eight-candidate historical sequential completion. Its final evidence is `run-20261108-195513/final-summary.json` in that evidence directory.

New combinational job `557b3fca-9bfd-4ec5-88e1-6a9da00d6a7f` and linked sequential completion `988bb2b8-e66b-4eb7-8c93-7711a5ffd31c` both succeeded as complete v2 results. All 12 candidate GDS files were independently inspected with native KLayout: the exact 40 functional instance placements match routed DEF and assignment, native master polygons match the original source GDS, signal pin/net connectivity matches the submitted graph, and all 323 routed-segment sample midpoints intersect actual top-level GDS metal. Every emitted GDS uses 0.0005 µm database units, matching the DEF's 2,000 units/µm. Actual preview PNGs and GDS preview endpoints return HTTP 200. The audit verifies all 336 downloaded artifact hashes and the embedded physical/provenance manifests. The sequential source result `91df5738-c81a-49d7-8296-30d028ce6bdf` is unchanged, including its eight timing measurements and assignments.

The read-only transistor baseline inventory also checked all 35 saved experiment/optimization measurements: each exact `selectedGdsPath` resolves to a retained result artifact, and all 35 downloaded files pass SHA-256, size and GDS-header checks. This inventory is `transistor-baseline-inventory.json` beside the physical acceptance harness.

These layouts are engineering physical evidence, not foundry signoff. Zero native router DRC and successful connectivity checks apply to the configured router rules. OpenROAD warns that some LEF58 enclosure/CUTCLASS constructs are unsupported. Foundry DRC/LVS, extracted interconnect timing, clock-tree synthesis and routed power/timing optimization are not established by this workflow. The retained native reports state these limits; no routed PPA feedback or Fmax claim is made.
