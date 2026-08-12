* Fixed native HSPICE DC benchmark fixture.
* Benchmark contract: mosfet-fixed-native-v1
* Only /home/duhaochen/pipeline_sky130_mos/benchmark-inputs/09d52d65e2ca8b44ef9981e8e3a48f9a/hspice.lib and model-card tokens are bound per run.
.TITLE Fixed native MOSFET DC benchmark
.OPTION POST=1 BRIEF NOMOD INGOLD=2 NUMDGT=10
.OPTION TNOM=27 GMIN=1e-15 RELTOL=1e-6 ABSTOL=1e-12
.INC '/home/duhaochen/pipeline_sky130_mos/benchmark-inputs/09d52d65e2ca8b44ef9981e8e3a48f9a/hspice.lib'

M1 drain_iv gate_iv source_iv bulk_iv __benchmark_selected_nmos L=1u W=10u
M2 drain_bias gate_bias source_bias bulk_bias __benchmark_selected_nmos L=1u W=10u
Vds_iv drain_iv 0 DC 0
Vgs_iv gate_iv 0 DC 0
Vs_iv source_iv 0 DC 0
Vb_iv bulk_iv 0 DC 0
Vds_bias drain_bias 0 DC 0
Vgs_bias gate_bias 0 DC 0
Vs_bias source_bias 0 DC 0
Vb_bias bulk_bias 0 DC 0

.PRINT DC V(drain_iv) V(gate_iv) I(Vds_iv) I(Vs_iv) I(Vb_iv) I(Vgs_iv)

.ALTER FIXTURE_CASE_0
.TEMP -40
.DC Vds_iv 0 1.2 0.01 Vgs_iv 0 1.2 0.2
.ALTER FIXTURE_CASE_1
.TEMP 0
.DC Vds_iv 0 1.2 0.01 Vgs_iv 0 1.2 0.2
.ALTER FIXTURE_CASE_2
.TEMP 25
.DC Vds_iv 0 1.2 0.01 Vgs_iv 0 1.2 0.2
.ALTER FIXTURE_CASE_3
.TEMP 50
.DC Vds_iv 0 1.2 0.01 Vgs_iv 0 1.2 0.2
.ALTER FIXTURE_CASE_4
.TEMP 100
.DC Vds_iv 0 1.2 0.01 Vgs_iv 0 1.2 0.2
.ALTER FIXTURE_CASE_5
.TEMP 150
.DC Vds_iv 0 1.2 0.01 Vgs_iv 0 1.2 0.2

* The nine fixed bias points are also present explicitly.  Canonical output
* is sampled from the identical 25 C IV sweep to avoid simulator OP formatting.
.ALTER FIXTURE_CASE_6
.TEMP 27
Vds_bias drain_bias 0 DC 0.0
Vgs_bias gate_bias 0 DC 0.0
.OP
.ALTER FIXTURE_CASE_7
.TEMP 27
Vds_bias drain_bias 0 DC 0.0
Vgs_bias gate_bias 0 DC 0.6
.OP
.ALTER FIXTURE_CASE_8
.TEMP 27
Vds_bias drain_bias 0 DC 0.0
Vgs_bias gate_bias 0 DC 1.2
.OP
.ALTER FIXTURE_CASE_9
.TEMP 27
Vds_bias drain_bias 0 DC 0.6
Vgs_bias gate_bias 0 DC 0.0
.OP
.ALTER FIXTURE_CASE_10
.TEMP 27
Vds_bias drain_bias 0 DC 0.6
Vgs_bias gate_bias 0 DC 0.6
.OP
.ALTER FIXTURE_CASE_11
.TEMP 27
Vds_bias drain_bias 0 DC 0.6
Vgs_bias gate_bias 0 DC 1.2
.OP
.ALTER FIXTURE_CASE_12
.TEMP 27
Vds_bias drain_bias 0 DC 1.2
Vgs_bias gate_bias 0 DC 0.0
.OP
.ALTER FIXTURE_CASE_13
.TEMP 27
Vds_bias drain_bias 0 DC 1.2
Vgs_bias gate_bias 0 DC 0.6
.OP
.ALTER FIXTURE_CASE_14
.TEMP 27
Vds_bias drain_bias 0 DC 1.2
Vgs_bias gate_bias 0 DC 1.2
.OP
.END
