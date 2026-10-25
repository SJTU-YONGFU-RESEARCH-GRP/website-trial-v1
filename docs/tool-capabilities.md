# EDA tool capability audit

Audit baseline: `dhc` commit `298625252584267f625dc544e11b03da55a2405c` on 2026-08-14.

This document records observed repository entry points and executable probes. It is the source of truth for the platform tool registry. A frontend control is executable only when its adapter maps the value to one of the audited arguments below and the configured tool passes its health probe. Repository presence alone is not a healthy tool configuration.

## Current platform baseline

- The website is a Vite/React static application. `server/uploadService.ts` is a development-server middleware, not a production API.
- Existing uploads are base64-encoded JSON requests handled by one switch. They import completed Benchmark, Digital, or PPA outputs and regenerate source-tree data; they do not run EDA tools.
- Upload job state is process memory. It is lost when the Vite process restarts.
- Existing Benchmark, Digital, and PPA charts load bundled files or generated TypeScript. Newly computed results therefore currently require regeneration/rebuild.
- `src/compat/spiceWorkflow/mockRuntime.ts` and fixture normalizers are presentation/test compatibility code. They are not permitted in the production execution registry.

## Capability status vocabulary

- **Available**: the real entry point and its required runtime were probed successfully on this host.
- **Degraded**: the entry point is present, but a required dependency or optional capability is missing.
- **Not configured**: source may be present, but the platform has no healthy executable/runtime configuration.
- **Unavailable**: a probe demonstrated that the configured/current path cannot run.

The status is a runtime property stored in `tool_health_checks`; it must not be hard-coded into the UI.

## Benchmark processing tools

### `translator`

- Repository: `/home/duhaochen/new-spice-translator`, commit `8c496d415935d2f2ac837c11692ec9654bb65a3b` (dirty at audit time).
- Entry: configured Python interpreter plus `/home/duhaochen/new-spice-translator/cli.py`.
- Dependency: `spice_ast` from `/home/duhaochen/SPICE-Model-AST/src`, commit `dbacfb51eb1a3d655f1058883f2c6f4fc15cf665`.
- Version probe: repository commit plus `python cli.py --help`; the package metadata declares `2.0.0`.
- Required input: one SPICE model/library file. Supported source and target dialects are `spectre`, `hspice`, and `ngspice`.
- Optional input: relative include tree when `--follow-includes` is enabled.
- Audited `translate` arguments: positional input, `--output`, `--source`, `--target`, `--verify`, `--plot`, `--max-plots`, `--follow-includes`.
- Output: translated `.scs` or `.lib`, `model_manifest.json`, optional verification output and plots.
- Limits: verification and plots are implemented only for an ngspice target. The audited CLI has no `--preserve-comments` option. `--bridge` exists in the repository but is excluded from the platform because job DAG chaining belongs to the backend planner.
- Host status: **Degraded**. It runs only when `spice_ast` is supplied on the configured Python path; the repository venv also reported missing PyYAML.

### `fitting`

- Repository: `/home/duhaochen/spice_model_fitting`, commit `f9bfc2564d02329368be070c43e344679b64684d` (dirty at audit time).
- Entry: `/home/duhaochen/spice_model_fitting/.venv/bin/python calibrate_bsim.py`.
- Version probe: repository commit plus `calibrate_bsim.py --help`.
- Required input: one or more measured DC IV CSV files supplied with repeated `--dataset` arguments.
- Optional input: a base `.lib`/`.model`; without it the real CLI uses its built-in BSIM4.5 template.
- CSV contract: current column `I`, `id`, `ids`, `draincurrent`, or `current`; at least one of `Vgs`, `Vds`, `Vbs` swept; a fixed bias supplied in CSV or dataset spec; optional temperature and W/L geometry.
- Audited arguments: `--model-path`, `--model-name`, repeated `--dataset`, required `--sim-type dc`, `--device-type`, `--ngspice`, `--max-iters`, `--step-tol`, `--target-rel-loss`, repeated `--fix`, `--train`, `--limitmin`, `--limitmax`, `--optimizer`, `--loss-func`, `--output-model`, `--keep-temp`, `--plot`, and `--jobs`.
- Optimizer modules with a real `optimize()` entry: `cma_es`, `differential_evolution`, `lbfgs_fd`, `least_squares_trust_region`, `nelder_mead`, `nelder_mead_normalized`. Each must pass a minimal self-test before it is advertised.
- Output: fitted model, optional comparison plot, optimizer/loss log, and retained intermediate ngspice files only when requested.
- Limits: **DC IV only**. AC/CV controls are forbidden. User input may not select an arbitrary Python module or executable; optimizer and loss choices come from an adapter allowlist.
- Host status: **Available** with ngspice 46+.

### `reduction`

- Repository: `/home/duhaochen/spice_model_reduction`, commit `d6c9a4eb167611d7fc2bc3947d5952bc3b46181b` (dirty at audit time).
- Entry: configured Python plus `-m bmr.cli complete`.
- Dependency: `spice_ast` from the audited AST repository.
- Version probe: repository commit and a dependency/import probe. This CLI does not implement standard `--help`; invoking it prints the command list and exits non-zero.
- Required input: BSIM model file.
- Positional `complete` contract: model, output directory, error tolerance, minimum parameters, maximum iterations, optimization method, reduction method, test type, device type, and optional `use_prebuilt_netlist` boolean.
- Audited optimization values: `gradient_descent`, `genetic`, `bayesian`, `particle_swarm`.
- Audited reduction values: `sensitivity`, `pruning`, `pca`, `lasso`.
- Audited test values: `dc_iv`, `dc_transfer`, `cv`, `ac`, `transient`, `noise`, `combined`.
- Output: `reduction_results.json`, assembled `reduced_model.lib`, and `model_manifest.json`.
- Limits: the CLI exposes no worker-count argument. The `error-analysis` and method-comparison paths contain placeholder/generated data and are excluded from production. Prebuilt-netlist support is only exposed after an adapter self-test proves the expected netlist contract.
- Host status: **Degraded** until the configured Python environment includes `spice_ast` and a minimal complete reduction succeeds.

### `expansion`

- Repository: `/home/duhaochen/spice_model_expansion`, commit `8f51a8ad20fca934d5be61ebcb59c53cb4324ff3` (dirty at audit time); package version `0.1.0`.
- Entry: configured Python plus `-m model_expansion`.
- Dependency: `spice_ast` and ngspice for characterization.
- Version probe: package metadata/repository commit plus `python -m model_expansion --help`.
- Required input: one nominal TT SPICE model.
- Optional input: sigma JSON.
- Real subcommands are separate steps:
  - `generate-corners MODEL --out-dir DIR [--sigma-json FILE] [--n-sigma N]`;
  - `iv --model MODEL --corners-dir DIR --work-dir DIR --out-dir DIR [--summary-path FILE] [--model-name NAME] [--jobs N] [--plot]`;
  - `cv` with the same model/corner/work/output/model/jobs/plot shape;
  - `monte-carlo MODEL --out-dir DIR [--summary-path FILE] [--samples N] [--sigma-json FILE] [--n-sigma N] [--distribution normal|uniform] [--seed N] [--model-name NAME] [--work-dir DIR] [--jobs N] [--vds-at V] [--vgs-at V] [--hist-bins N] [--plot] [--corners-dir DIR]`.
- Output: T/S/F model files, IV/CV JSON data, Monte Carlo model/data sets, plots, and `SUMMARY.md`.
- Limits: `lognormal` is not supported. The shell wrapper self-installs packages and defaults Monte Carlo on, so it is excluded from production; the adapter executes the Python subcommands directly. IV, CV, and Monte Carlo are independent planned steps.
- Host status: **Degraded** until a configured environment supplies the package and `spice_ast` without modifying the tool repository.

### `spice-benchmark`

- Repository: `/home/duhaochen/spice_model_benchmark`, commit `c133a9ba326a704cf1aaa8cffff49001a7876c11` (dirty at audit time); package version `1.0.0`.
- Entry: configured Python plus `-m spice_model_benchmark.cli` (or installed `spice-benchmark`).
- Version probe: package metadata/repository commit and `--help`.
- Required input: one simulator-compatible MOS model handoff.
- Arguments: positional model, one or more `--simulator ngspice|spectre|hspice`, one or more `--modes dc|transient|ac|noise`, `--output-dir`, `--dpi`, and `--log-level`.
- Output per simulator: `REPORT.md`, native submitted netlists, `native-fixture-manifest.json`, raw data, plots, wall time and parsed domain status.
- Limits: the benchmark circuit is intentionally fixed. Arbitrary uploaded testbenches are not supported. `--bridge` is excluded because the backend owns DAG composition.
- Simulator health: ngspice 46+ is **Available**. HSPICE and Spectre are **Not configured** (no executable found); they must remain disabled and never return demo success.

## Digital tools

### `yosys`

- Entry/version probe: `/usr/local/bin/yosys -V` → `Yosys 0.64+72 (22ef99218)`.
- Input: Verilog/SystemVerilog source or supported gate-level Verilog, top module, optional include/defines, and selected Liberty for technology mapping.
- Output: synthesis log, mapped Verilog, Yosys JSON, cell counts, and `stat -liberty` mapped-cell area.
- Host status: **Available**.

### `opensta`

- Entry/version probe: `/usr/local/bin/sta -version` → `3.1.0`.
- Input: mapped Verilog, Liberty, SDC or backend-generated constraints.
- Output: timing checks, critical paths, slack, and timing logs.
- Host status: **Available**.

### `iverilog` and `vvp`

- Entries: `/usr/bin/iverilog` and `/usr/bin/vvp`; version `12.0`.
- Input: RTL plus optional testbench/includes.
- Output: compiled simulation image and simulation log. Simulation is optional and only planned when a testbench is mapped.
- Host status: **Available**.

### Current Digital script limitation

`scripts/run-digital-technology-ppa.py` proves real Yosys/OpenSTA/Icarus execution, but generates its own adder RTL and hard-codes personal Liberty paths. It is not the production user-input adapter. The new Digital adapter reuses its safe argv/script concepts while receiving executable and Liberty paths from administrator-managed configurations and technology records. Power from this path is static Liberty leakage, never total power.

## PPA flows and parser

### `openroad-orfs`

- Flow repository: `/home/duhaochen/OpenROAD-flow-scripts`, commit `778c4e556a6f1d104621b92f6a851324bf34ff1a`.
- OpenROAD executable: `/home/duhaochen/OpenROAD-flow-scripts/tools/install/OpenROAD/bin/openroad`.
- Version probe: `openroad -version` → `26Q3-771-g7cfb2105c9`.
- Entry: GNU Make with the configured ORFS `flow/Makefile` and a backend-generated `DESIGN_CONFIG`. No uploaded Makefile or Tcl is executed.
- Required input: RTL, top, selected registered platform/technology, and a clock definition/SDC.
- Supported platform parameters are derived from the selected ORFS platform and adapter schema, including clock period and adapter-confirmed Make variables. The generic adapter may not pass arbitrary Make variables.
- Output: synthesis, floorplan, placement, CTS, routing, final timing/power reports, DEF/ODB/GDS and signoff artifacts according to the selected platform.
- Host status: OpenROAD binary is **Available**; the complete ORFS adapter remains **Degraded** until its minimal registered-platform self-test passes under the worker service account.

### `openlane1`

- Repository: `/home/duhaochen/rtl2gds-copilot-orchestrator/OpenLane`, version probe `v1.0.2` at commit `ff5509f65b17bfa4068d5336495ab1718987ff69`.
- Intended entry: OpenLane `flow.tcl` in a configured container/runtime, with a backend-generated safe config.
- Required input: supported RTL design directory, top, PDK/SCL, clock/SDC.
- Output: OpenLane run tree including `reports/metrics.csv`, final DEF/GDS, STA/SPEF, logs and signoff evidence.
- Limits: repository is maintenance-mode OpenLane 1. The local source probe failed because its container manifest is missing, and this user cannot access the Docker socket. Uploaded Tcl/config is parsed as data only; the adapter writes its own allowlisted config.
- Host status: **Unavailable** until an administrator supplies a healthy container/executable configuration and worker permission.

### `librelane`

- Repository: `/home/duhaochen/rtl2gds-copilot-orchestrator/librelane`, package version `2.4.13`.
- Intended entry: configured Python `-m librelane` or pinned container `ghcr.io/librelane/librelane:2.4.13`.
- Required input: supported RTL, backend-generated JSON/YAML config, PDK root and selected PDK/SCL.
- Output: step state files, terminal `state_out.json`, `final/metrics.json`, DEF/GDS and step logs/artifacts.
- Limits: there is no configured local Python environment and Docker access is denied for the current user. Only parameters discovered from the configured version's capability schema are shown.
- Host status: **Not configured**.

### `ppa-result-parser`

- Repository: `/home/duhaochen/rtl2gds-copilot-orchestrator`, commit `c759d8feb7076a3e8aff838c1bbc8e4fdc22192b` (dirty at audit time).
- Entry: `python3 scripts/result_json_ast.py run --flow openroad|openlane|librelane RUN_DIRECTORY [--include-all]`.
- Version probe: repository commit plus `--help` and parser tests.
- Input: a completed native run directory. Supported primary sources include OpenROAD `metrics.json`, OpenLane `reports/metrics.csv` with final DEF/OpenSTA evidence, and LibreLane `final/metrics.json` or terminal `state_out.json`.
- Output: cross-flow normalized PPA schema with source provenance plus lossless JSON/CSV AST evidence.
- Host status: **Available**. The path must be an administrator tool configuration, never a hard-coded sibling path.

## Physical dependencies

- KLayout `/usr/bin/klayout`, version `0.30.7`: **Available**.
- Magic `/usr/local/bin/magic`, version `8.3.664`: **Available**.
- Docker CLI version `29.4.2` exists, but access to `/var/run/docker.sock` is denied: **Unavailable to the current service user**.
- PDK data exists under `/home/duhaochen/rtl2gds-copilot-orchestrator/pdk` (Ciel sky130/gf180 and IHP data), but no PDK is usable until registered as a `technology_libraries` record and validated for the selected adapter.

## Frozen corrections to the legacy frontend adapters

The following legacy controls/argv mappings are not production capabilities:

- Translator `preserveComments` / `--preserve-comments`: remove or disable.
- Fitting `normalized_nelder_mead`: map only to real `nelder_mead_normalized`; `trust_region_ls` is not a real module name; `--step-tolerance` must be `--step-tol`.
- Reduction `genetic_algorithm`, `bayesian_optimization`, and `parameter_pruning` do not match the CLI enum values `genetic`, `bayesian`, and `pruning`; `--workers` is unsupported.
- Expansion `lognormal`, `--no-plot`, `--mc-*` on a single Python invocation, and unconditional combined execution are not the real Python CLI contract. Expansion must be a multi-step plan.
- Spectre/HSPICE options are disabled until both executable health and the benchmark adapter's native netlist/parser self-test pass.

These corrections are enforced in backend capabilities. The frontend renders the returned schema and does not maintain an independent list.
