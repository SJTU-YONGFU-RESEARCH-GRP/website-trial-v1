# DTCO acceptance — 2026-10-25

Status: **representative integrated acceptance passed, with the scope and limits below**. This report separates actual website jobs, isolated native fixtures and automated tests. Retained historical frequency numbers are not accepted scientific results.

## Real integrated execution

Each integrated point created four tracked jobs: Benchmark, DTCO, PPA and Digital. Benchmark executed selected-family MOS-card translation; DTCO consumed its derived model and called AutoCellGen for generated cells or selected original GDS/LEF for fixed cells. PPA executed fresh native LibCharX cell characterization. Digital consumed that exact fresh Liberty through one-cell Yosys/OpenSTA timing. This is partial reuse of the four business modules, not full Benchmark reporting, OpenROAD place-and-route or chip implementation.

| Case | Experiment | Actual coverage | Outcome excluding frequency |
| --- | --- | --- | --- |
| P01 | `243a6284-b7bb-4260-a238-bf1527765216` | GF18003v3 custom INV, generated/extracted, TT25°C, VDD3.3/VSS0 | Four jobs succeeded; delay74.01494ps, supply power16.61902µW, area27.745µm² |
| P04 | `0746edb5-9d56-4192-b53e-ec2e57033e4b` | GF18006v0 fixed INV, SS85°C, VDD5.1/VSS0.1 | Four jobs succeeded; original transistor dimensions retained; delay131.75258ps, power32.29191µW, LEF area11.2896µm² |
| P05 | `2487e8fa-8130-41dd-882e-112f2993b150` | SKY130 fixed NAND2, FF25°C, VDD1.8/VSS0 | Four jobs succeeded; delay90.87906ps, power3.79623µW, LEF area3.7536µm²; frequency unavailable |
| P10 retry | `3849555c-d0e8-4e80-8bf7-8e470ddbc5a4` | GF180 custom INV with NMOS locks and editable PMOS width | Queued attempt cancelled; whole-point retry created four fresh jobs and succeeded; frequency unavailable |

Audits checked source-model/translated-MOS/consumed-model lineage, deck and published-artifact bytes, actual native process evidence, PVT, exact transistor dimensions, fresh Liberty and its downstream consumption. PPA received60ps20–80% transition for the requested100ps full ramp. Digital power remained null because fresh Liberty had no power tables. GF180 extracted evidence includes finite capacitances and actual extracted-deck consumption, without wire resistance or a full signoff claim.

P01 also passed real GET-only browser checks for Results-only reports, four graph links, actual artifact downloads, comparison selection and Clear. The optimizer Results browser checked all retained rounds, parameter/base lineage, four-node links and subset comparison without creating jobs.

## Three real adaptive evaluations — corrected protocol v2

Optimizer `36f66d0c-35e4-420a-bb2a-2a0a204287d3`, experiment `258eeb75-4a43-42a3-8d68-79f2314ccdab`, completed **three total evaluations including baseline**, each with four fresh successful child jobs. Conditions stayed GF18003v3 INV, TT25°C, VSS0.1V,100fF load,100ps full ramp and10ns nominal period. NMOS W1µm and both L0.28µm stayed fixed. Only the requested PMOS-width and absolute-VDD axes changed.

| Evaluation | PMOS W µm | VDD V | Verified pass / fail MHz | Delay ps | Power µW | Area µm² | Score1/Hz | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 3.4 | 136.901855 / 137.988281 | 381.648428 | 112.643296 | 9.6768 | 7.304502898e-09 | Accepted |
| 2 | 2.3 | 3.4 | 154.284668 / 155.371094 | 355.724864 | 113.004006 | 9.6768 | 6.481525437e-09 | Accepted |
| 3 | 2.3 | 3.1 | 144.506836 / 145.593262 | 373.735088 | 93.362736 | 9.6768 | 6.920087853e-09 | Worse; retained, rejected |

Round2 improved measured frequency **12.69728%**; its reciprocal objective score decreased11.26671%. Actual PMOS width changed2→2.3µm while boundary-union area quantized to the same9.6768µm². Power increased0.32022% and delay decreased381.648→355.725ps. Round3 inherited round2's2.3µm width, then reduced VDD to3.1V. Its frequency was6.33753% below the incumbent; the optimizer retained that worse candidate and kept round2 as best.

All three brackets met the1.25MHz tolerance, with width1.08642578125MHz,13 actual native frequency rounds each, and no unknown or input-failure rounds. Independent waveform audits passed707/706/707 checks: finite ordered samples, correct input levels after the settling deadline, complete hold intervals and genuine output-high/output-low settling failures. Frequency protocol is `dtco.transient-toggle.v2`. The38-check decision audit verified actual dimensions, condition inheritance, strict reciprocal scores, incumbent decisions and12 distinct child jobs. PPA performed4 native ngspice calls/4 positive timing values per point, and Digital consumed each exact fresh Liberty; missing Digital power remained null.

The final GET-only browser audit confirmed actual bounds, fixed-cell/derivative controls, all3 results, best/score/base lineage, four-node graph links, versioned pass/fail evidence and subset comparison; no browser mutations or job Starts were used for this inspection. Complete child job/result IDs and fresh Liberty hashes are retained in `acceptance/final-summary.json`.

### Historical frequency withdrawal

Original optimizer `1be687f2-e23f-4b04-a10e-aba8e7c3d2ee` correctly paused on unknown frequency. Optimizer `afc07976-8a4b-45e5-a083-bd310c8a395d` completed3 real evaluations but used an invalid classifier that could inspect the input ramp before its deadline. Its numerical frequency brackets/scores and P01's earlier bracket remain **withdrawn as scientific evidence**; P04's old bracket is also not accepted. Their valid delay/power/area, pipeline and history evidence remain separate. The corrected100fF run has a fresh environment and identity; it does not rewrite old records. Read-only v2 reclassification of the old10fF baseline found all13 retained rounds passed up to2.25GHz, a lower bound with null maximum, not a new native measurement or optimization score.

## Other validation and limits

- Nine guard checks covered model/technology mismatch, supply and dimension bounds, stock locks, incompatible native lengths, conflicting overrides, and separate customizable clones. Seven rejection checks used actual API requests without creating jobs; two clone checks saved unsubmitted drafts.
- Queued cancellation left no successful old results. Retry used a fresh graph and retained the cancelled history. This case does not prove killing an already-running native child. Current restart recovery is covered by scoped tests, not a new service restart during this acceptance.
- Historical phase4 optimization `d71b94dd-26d2-4c61-8502-e87f4d8a9552` remained retrievable with its three original results.
- Separate native fixtures covered12 profile/circuit combinations at SS85°C/VSS0.1: GF03 custom INV/NAND/NOR, GF06 fixed INV/NAND/NOR, and SKY custom/fixed INV/NAND/NOR. Raw/staged/recombined selected-model equivalence covered GF03/GF06/SKY TT and FF. These isolated runs are not additional full website graphs.
- SKY native layout geometry is supported, but no validated SKY PV/PEX path is enabled. GF06 mixed-length clones are schematic-only. Model-bin bounds do not constitute full layout-rule legality or reliability guarantees. Measured sensitized cell toggle frequency is not chip-clock Fmax.

Final protocol-v2 checks passed:100 backend tests across9 scoped files, both TypeScript checks, and a direct Vite build. Typechecks took33.77s frontend/13.40s server; direct Vite took15.67s. Only the existing large-bundle/plugin-timing warnings remained. Tests are distinct from the actual native/API/browser evidence above.

## Evidence and preservation

Durable evidence root: `/home/duhaochen/dtco-phase5-20261025/acceptance/`.

Key records are `frequency-scientific-disposition.json`, `P07-protocol-v2-draft-feasibility.json`, the per-case `runs/` directories, `guards-evidence.json`, `legacy-history-proof.json` and `protected-runtime-final.json`. The old optimizer decision evidence states `decision_consistency_only_frequency_protocol_invalid`; the new v2 decision audit is independently passed. Historical reassessments override earlier mechanical pass labels. Recovered diagnostic replay files are retained under `frequency-protocol-replay/` and prove simulation/timestamp recovery only.

The pre-v2 protection audit found32,696 protected source/binary identities unchanged, including native ACG2975files plus3binaries and96 protected Benchmark files. Existing repository dirt was preserved. The frequency/runtime work is outside that protected set. The final read-only closure found0 queued/running/validating jobs and matched both frozen v2 runtime/helper hashes. P02/P03/P06 supplementary full-web plans were not executed; their scope is not silently counted. This is representative supported-flow acceptance, not whole-catalog signoff.
