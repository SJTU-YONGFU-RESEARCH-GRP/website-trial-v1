# Integrated DTCO workflow

This guide describes the multi-technology implementation introduced on 2026-10-25. Use `GET /api/dtco/options` for current availability, compatible IDs, model versions and tool health. Historical inverter acceptance and results remain in [dtco.md](dtco.md); its earlier single-circuit tables do not describe this expanded catalog.

Representative actual integrated acceptance completed on2026-10-25: GF18003v3 custom/extracted INV, GF18006v0 fixed INV, SKY130 fixed NAND2, and a corrected protocol-v2 three-evaluation GF180 frequency optimization. Actual APIs, native jobs, fresh Liberty handoff, GET-only Results browser checks, queued cancellation/fresh-graph retry and history were verified. See [the acceptance report](dtco-acceptance-2026-10-25.md) for IDs, measured improvements, historical frequency withdrawals and limits; isolated fixtures and tests are separately identified.

## Select resources and sizing

The immutable descriptor is [catalog.json](../scripts/dtco/catalog.json), loaded by [catalog.ts](../server/modules/dtco/catalog.ts). It registers 2 technologies, 3 model families and 30 circuit profiles:

| Technology | Model identity | Devices | Circuits |
| --- | --- | --- | --- |
| `gf180mcuA` | `gf180-03v3` | `nfet_03v3`, `pfet_03v3` | Custom INV, NAND2, NOR2 |
| `gf180mcuA` | `gf180-06v0` | `nfet_06v0`, `pfet_06v0` | Fixed MCU9T5V0 INV/NAND2/NOR2 drives 1/2 and customizable derivatives |
| `sky130A` | `sky130-01v8-hvt` | `sky130_fd_pr__nfet_01v8`, `sky130_fd_pr__pfet_01v8_hvt` | Custom INV/NAND2/NOR2, fixed HD drives 1/2 and customizable derivatives |

There are 6 built-in custom gates, 12 fixed cells and 12 `custom-from-library:<cell>` profiles. Model version IDs include the registered source hash; use the exact ID returned by options. Model family identity remains distinct even when two profiles share a library entry file.

Fixed cells retain their original transistor netlist, dimensions, body connections and selected original GDS/LEF. Width/length locks cannot be removed by a request. A customizable derivative has a separate identity and original source-device inventory, with editable dimensions; its original library GDS and Liberty no longer describe a resized design. Per-device locks can retain selected dimensions while other devices or groups vary. Conflicting group/device overrides are rejected. Models, nodes and body semantics remain locked; arbitrary hierarchy or uploaded schematic flattening is not exposed by this catalog.

The descriptor records ports, device IDs, source-instance paths, NMOS/PMOS groups, sensitized timing arcs and complete truth tables. Native-only rail/body binding and injective internal-net renaming preserve the electrical topology while avoiding native port conflicts and ASCII GDS label failures caused by `#`. The original simulation source remains separate. See `renderDtcoNativeSource` and `dtcoNativeNetBindings` in `catalog.ts`.

## Bounds and physical scope

`pdkBounds`, individual `dimensionBins`, rule-source hashes and `boundsProvenance` describe selected compact-model coverage and geometry constraints. A model-bin envelope is not a universally legal W/L rectangle: every W/L pair must fit an actual bin, and spacing, enclosure, device class and layout rules still apply. `layoutToolBounds` describe a narrower supported generator path; they are not advertised as foundry maxima. See [dimensions.ts](../server/modules/dtco/dimensions.ts).

GF180 HV NMOS and PMOS have different source lengths: authentic MCU9T5V0 INV1 uses N 0.60 µm and P 0.50 µm. Do not apply one generic 6 V minimum to both polarities. Fixed stock dimensions are validated against their respective families.

Native generated-area mode requires one uniform channel length and explicit devices with `nf=1`, `m=1`. Rules are derived from the resolved uniform length. Unsupported multiplicity or mixed lengths fail validation rather than silently changing the layout. GF180 HV customizable derivatives therefore use `schematic-only`: direct SPICE delay/power are available, area is unavailable, and integrated PPA/area or balanced optimization requiring area is rejected. Fixed HV cells retain their real library geometry and area.

SKY130 uses `mr-sa-10t-sky130` and [catalog-sky130-sa10.json](../scripts/dtco/catalog-sky130-sa10.json). Native INV/NAND2/NOR2 and drive-2 library derivatives produced readable GDS; poly∩OD checks verified channel length, widths and counts. Two width variants changed actual active geometry even when boundary area quantized to the same value. This proves generation, not DRC/LVS, body connectivity or extracted electrical correctness. **SKY130 has no enabled validated PV/PEX path in this workflow.** Its electrical metrics remain schematic measurements; generated layout contributes area only.

The legacy `gf180-inverter` + `mr-sa-12t-pex` path additionally performs physical completion, final-GDS round-trip Magic extraction, source-W/L/topology/body checks, finite capacitance checks and zero configured Magic `drc(full)` errors. It extracts device geometry and capacitance, not wire resistance. Its recorded official checks apply to recorded candidates/decks; runtime Magic validation is not foundry signoff or a promise of official-deck verification for every candidate.

## PVT and optimization

`voltageV` is absolute VDD and `groundVoltageV` is absolute VSS. The model supply constraint applies to **VDD−VSS**. Pulse levels, fixed inputs, body/well pins and output load refer to these rails; temperature is passed to SPICE. The selected model's operating bounds override the technology envelope. Registered voltage ranges are characterization envelopes, not reliability guarantees.

TT maps to GF180 `typical` and SKY130 `tt`; FF/SS/FS/SF map to their native sections. GF180 06v0 shares `_t` model blocks across sections but changes parameters such as threshold and oxide offsets before including them; these are real parameterized corners. Do not infer identical electrical behavior from the shared block name.

Experiments can compare multiple process scenarios. Each optimization fixes one process corner; corner is not an axis the optimizer may change to claim a design improvement. Selected absolute VDD, VSS, temperature and unlocked device/group dimensions can vary as numeric axes. All other characterization conditions remain the same across candidate comparisons. Objective support follows measured capabilities: missing area cannot be replaced with zero. Preserve worse candidates, incumbent decisions, failed attempts and stop reasons.

## What actually runs

The integrated graph in [pipeline.ts](../server/modules/dtco/pipeline.ts) and [pipelineNative.ts](../server/modules/dtco/pipelineNative.ts) creates ordinary tracked jobs, with module permissions, tool health, durable lineage, cancellation and result checks:

1. **Benchmark:** expand the selected native `.lib` section and relative includes, distinguishing file/section references from true include cycles. Send only exact selected-family MOS model cards through the installed SPICE Translator. Preserve the surrounding parameters, wrappers, options and units, then reinsert the translated MOS cards after checking a name/polarity bijection. This is genuine but partial **MOS-card normalization**, not whole-PDK translation, fitting, reduction or expansion. See [pipelineModel.ts](../server/modules/dtco/pipelineModel.ts).
2. **DTCO:** consume that normalized model, render resolved transistor inputs, run actual AutoCellGen for generated layouts or select the exact fixed-library GDS top, then run ngspice DC, truth-table and sensitized-arc transients. Supply power comes from actual waveform integration. Extracted mode adds the bounded GF180 physical path above.
3. **PPA:** pass the consumed model, actual cell netlist, selected GDS/top, optional original LEF, PVT, arcs and waveform evidence into the installed LibCharX through [characterization.ts](../server/modules/ppa/characterization.ts) and `scripts/ppa/characterize.py`. It creates fresh `output/libcharx/characterized.lib` and measured NLDM timing tables for this point. This stage is cell characterization, not place-and-route. Proxy LibCharX power tables are omitted; DTCO supply-power evidence remains separately attributed.
4. **Digital:** consume that fresh Liberty and a real one-cell mapped design with exact pins, then use Yosys/OpenSTA. This demonstrates downstream timing consumption of the characterized cell. It is not chip placement/routing or a complete system implementation. Missing Liberty power capability remains unavailable; dynamic or total chip power is not inferred from timing tables.

DTCO `inputSlewPs` is the full 0–100% linear PULSE ramp. The bridge converts it by **0.6×** to LibCharX/Liberty's 20–80% input slew and Digital's input transition, with unit conversion to seconds or nanoseconds respectively. `slewProvenance` retains the original ramp, converted transition and verified 20%/80% thresholds. PPA characterizes the full catalog timing-arc set; any selected DTCO power arc is recorded separately as `powerArcScope`.

For generated layouts, authoritative area is the polygon **union** on the profile's boundary layer/datatype for the actual selected GDS top, including referenced geometry (`gds-boundary`). The geometry bounding box is a separate diagnostic. Fixed cells retain the original selected LEF `SIZE` footprint (`lef-size`); it is not substituted with a GDS bounding box.

A `schematic-only` point cannot enter integrated PPA because it has no actual GDS. All four child modules must be authorized and configured. A point is not an integrated success until the required child graph and verified result artifacts have completed.

## Frequency and null values

The measured frequency is **sensitized combinational-cell toggle frequency**, not a chip clock Fmax and not `1/delay`. [frequencyRuntime.ts](../server/modules/dtco/frequencyRuntime.ts) runs bounded native transient rounds; [frequency.py](../scripts/dtco/frequency.py) checks every selected arc against its truth table at fixed load, slew, PVT and body binding.

The current runtime permits at most 16 rounds. With nominal frequency `1/period` and full input ramp `slew` in seconds, its lower bound is `max(nominal/4, 1/(6060×slew))` and its cap is `min(nominal×64, 0.9/(4×slew))`. Tolerance is `max(1 MHz, lower-bound×0.05)`. Each native deck runs for 8.25 periods, checks eight complete cycles, and uses `.tran maxstep=min(slew/20, period/10000)`. Waveforms retain 17-digit precision to distinguish closely spaced adaptive SPICE timesteps. The interval budget is approximate: adaptive solver steps can increase the row count, so it is not a hard one-million-sample limit. Protocol `dtco.transient-toggle.v2` validates input settling independently of output settling and never reverses a hold interval. Invalid input drive is unknown evidence, not an electrical output failure. Output levels use 20%/80% of VDD−VSS and repeated settling/hold checks; the exact deck, checks, thresholds and waveform hashes are retained.

A passing cap without a verified failure is `upper_bound_not_found` and proves a lower bound only. A failing minimum with no verified pass is `no_verified_pass`. Inverted observations are `non_monotonic`; unknown simulator/evidence results stop the search as `indeterminate`, and later planned rounds are explicit skips. Simulator failures, malformed/nonfinite waveforms and incomplete coverage do not become electrical pass/fail data. `metrics.maxFrequencyHz` is populated only for a real ordered pass/fail bracket meeting tolerance (`bracketed`); otherwise it is `null`. Frequency optimization requires that verified bracket and matching evidence/conditions. The Digital STA critical-path/Fmax estimate is a separate timing-model result for its design and constraints, not this transient limit or a measured chip maximum.

`areaUm2=null` means explicitly unavailable area, not zero. Failed or cancelled jobs do not produce successful metrics. Read `areaStatus`, metric scope, frequency status and provenance alongside numbers; do not fill missing power, area or frequency with a proxy.

## Storage, hashes and result lookup

[storage.ts](../server/app/storage/storage.ts) uses `EDA_STORAGE_ROOT`; development defaults to `<checkout>/.eda-storage`. `NODE_ENV=production` requires an explicit root outside the checkout. The current River Vite development service uses `/home/duhaochen/website-trial-v1/.eda-storage`, with `eda.sqlite` inside that persistent, Git-excluded directory. The API and worker must use the same storage/database configuration.

- Canonical workspace: `<storage>/jobs/<jobId>/{input,work,output,logs,artifacts}` and `manifest.json`. Never guess `.eda-storage/<jobId>` or a separate module-job directory.
- Published copy: `<storage>/results/<module>/<resultId>/`; publication uses staging and an atomic rename. Working output paths and published artifact paths are different identities.
- Pipeline-normalized model staging: `<storage>/pipelines/<pipelineRunId>/normalized-model.lib`.
- DTCO evidence includes `output/dtco-result.json`, `output/dtco/{metrics,provenance,frequency}.json`, actual simulation/model/deck/log/waveform files, and selected native/fixed/completed GDS as applicable. Per-arc and per-round files remain distinct.

Use `GET /api/jobs/:jobId/artifacts` for authorized job evidence, `GET /api/results/:module/:resultId` for the retained result and its artifact IDs, and `GET /api/artifacts/:artifactId/download` for the registered bytes. Result visibility/ownership controls access; publication is not an authorization bypass. Do not reconstruct a published file location from a workspace-relative path.

Catalog entries pin source, model, rule, GDS/LEF/Liberty, binary, native template and configuration hashes. Execution freezes inputs and tool/environment versions, rechecks trusted files, and publishes output hashes. Child lineage records source job/result/artifact IDs, byte hashes and sizes; the consumer verifies them before preparation. Original source, normalized MOS stage, consumed model, resolved dimensions and measured GDS remain distinguishable. A resource change requires a fresh compatible revision, not reuse under an old environment identity.

## Administrator setup and reproduction

Resource paths are administrator descriptors, not user-supplied filesystem inputs. The installed Ciel PDK roots and ORFS fixed-cell GDS locations are recorded in the private catalog asset; public options hide those absolute paths. PDK-contained resources require realpath containment; selected external GDS resources require exact registered path and hash matching. Symlink escapes and changed hashes fail preflight.

Regenerate the descriptor only after reviewing installed sources. The builder reads model bins, stock cell inventory, LEF sizes and resource fingerprints; it does not run simulation:

```sh
python3 scripts/dtco/catalog-build.py
npx vitest run test/modules/dtco-catalog.test.ts
```

For another installation, set administrator build-time `DTCO_GF180_PDK_ROOT` / `DTCO_SKY130_PDK_ROOT` and review the builder's native project/ORFS paths before regeneration. These are not request fields or runtime user environment knobs. Review the resulting catalog diff and rerun native/semantic verification; a directory's existence alone does not establish support.

Configure tools through Admin → Tools and run their real probes/self-tests; allowed environment names are centralized in [toolCatalog.ts](../shared/toolCatalog.ts):

| Tool | Trusted configuration |
| --- | --- |
| `acg-mr` | Actual `autocell` executable, installed MR project root, required `PATH`/`LD_LIBRARY_PATH`; selected technology rules and frozen catalog config |
| `dtco-ngspice` | Native ngspice executable; `DTCO_MODEL_FILE` relative to the administrator model root for legacy configuration; catalog selections resolve their own trusted closure |
| `dtco-analysis` | Python with gdstk, repository root and `entryPoint=scripts/dtco/analyze.py` |
| `dtco-physical`, `dtco-magic` | Repository `physical.py` with gdstk/Pillow; native Magic with GF180 Magic root and `DTCO_MAGIC_TECH_FILE=gf180mcuA.tech`; only needed for supported extracted mode |
| Benchmark `translator` | Installed translator Python/CLI; optional allowed `PYTHONPATH` |
| PPA `libcharx` | Repository `scripts/ppa/characterize.py`, LibCharX Python and absolute `LIBCHARX_ROOT`, `LIBCHARX_NGSPICE`, `LIBCHARX_GDS_PYTHON` |
| Digital `yosys`, `opensta` | Native executables and approved `PATH` |

The new PPA configurator is [ppa-characterization-configure.ts](../server/cli/ppa-characterization-configure.ts). It registers only this adapter and refuses configuration changes while jobs are active. Use the same `EDA_DATABASE_PATH` and `EDA_STORAGE_ROOT` as the running services:

```sh
npx tsx server/cli/ppa-characterization-configure.ts --help
npx tsx server/cli/ppa-characterization-configure.ts --root /home/duhaochen/LibCharX --probe --self-test
```

No credentials or secret values belong in this guide, catalog or artifacts. Catalog unit tests cover compatibility, stock locks, units, actual resources, hash changes and symlink escapes. SKY native semantic evidence is retained externally at `/home/duhaochen/dtco-phase4-20261025/native-proof/catalog-sky130/geometry-proof.json`; it is an isolated fixture record, not proof of the entire website graph. Representative actual API/UI, lifecycle, publication and downstream evidence is recorded in [the acceptance report](dtco-acceptance-2026-10-25.md); unexecuted catalog combinations are not inferred from isolated fixtures.
