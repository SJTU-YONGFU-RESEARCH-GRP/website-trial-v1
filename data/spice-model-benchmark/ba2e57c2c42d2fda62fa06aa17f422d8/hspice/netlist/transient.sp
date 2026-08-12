* Fixed native HSPICE transient benchmark fixture.
* Benchmark contract: mosfet-fixed-native-v1
.TITLE Fixed native MOSFET transient benchmark
.OPTION POST=1 BRIEF NOMOD INGOLD=2 NUMDGT=10
.OPTION TNOM=27 GMIN=1e-15 RELTOL=1e-6 ABSTOL=1e-12 METHOD=GEAR
.INC '/home/duhaochen/pipeline_sky130_mos/benchmark-inputs/ba2e57c2c42d2fda62fa06aa17f422d8/hspice.lib'

M_tran drain_tran gate_tran source_tran bulk_tran __benchmark_selected_pmos L=1u W=10u
Vgs_tran gate_tran 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
Vds_tran drain_tran 0 DC 1.2
Vs_tran source_tran 0 DC 0
Vb_tran bulk_tran 0 DC 0
Cload drain_tran 0 1f

M_inv_n out_inv in_inv 0 0 __fixture_nmos L=1u W=10u
M_inv_p out_inv in_inv vdd_inv vdd_inv __benchmark_selected_pmos L=1u W=20u
Vdd_inv vdd_inv 0 DC 1.2
Vin_inv in_inv 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
Cload_inv out_inv 0 1f

Vdd_delay vdd_delay 0 DC 1.2
Vin_delay in_delay 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
M_d1_n mid1_delay in_delay 0 0 __fixture_nmos L=1u W=10u
M_d1_p mid1_delay in_delay vdd_delay vdd_delay __benchmark_selected_pmos L=1u W=20u
Cload_d1 mid1_delay 0 1f
M_d2_n mid2_delay mid1_delay 0 0 __fixture_nmos L=1u W=10u
M_d2_p mid2_delay mid1_delay vdd_delay vdd_delay __benchmark_selected_pmos L=1u W=20u
Cload_d2 mid2_delay 0 1f
M_d3_n out_delay mid2_delay 0 0 __fixture_nmos L=1u W=10u
M_d3_p out_delay mid2_delay vdd_delay vdd_delay __benchmark_selected_pmos L=1u W=20u
Cload_d3 out_delay 0 1f

M_power_n out_power in_power 0 0 __fixture_nmos L=1u W=10u
M_power_p out_power in_power vdd_power vdd_power __benchmark_selected_pmos L=1u W=20u
Vdd_power vdd_power 0 DC 1.2
Vin_power in_power 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
Cload_power out_power 0 1f

M_qs drain_qs gate_qs source_qs bulk_qs __benchmark_selected_pmos L=1u W=10u
Vgs_qs gate_qs 0 PULSE(0 1.2 0n 20n 20n 100n 200n)
Vds_qs drain_qs 0 DC 1.2
Vs_qs source_qs 0 DC 0
Vb_qs bulk_qs 0 DC 0
Cload_qs drain_qs 0 10f

M_charge drain_charge gate_charge source_charge bulk_charge __benchmark_selected_pmos L=1u W=10u
Vg_charge gate_charge 0 PULSE(0 1.2 0n 1n 1n 10n 20n)
Vd_charge drain_charge 0 DC 1.2
Vs_charge source_charge 0 DC 0
Vb_charge bulk_charge 0 DC 0
Cg gate_charge 0 1e-18
Cd drain_charge 0 1e-18
Cs source_charge 0 1e-18
Cb bulk_charge 0 1e-18

.PRINT TRAN V(gate_tran) V(drain_tran) I(Vds_tran) I(Vgs_tran) I(Vs_tran) I(Vb_tran)
.PRINT TRAN V(in_inv) V(out_inv) V(vdd_inv) I(Vdd_inv)
.PRINT TRAN V(in_delay) V(mid1_delay) V(mid2_delay) V(out_delay)
.PRINT TRAN V(in_power) V(out_power) V(vdd_power) I(Vdd_power)
.PRINT TRAN V(gate_qs) V(drain_qs) I(Vds_qs)
.PRINT TRAN V(gate_charge) I(Vg_charge) I(Vd_charge) I(Vs_charge) I(Vb_charge)

.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.TRAN FIXTURE_TRAN_STEP FIXTURE_TRAN_STOP
.ALTER FIXTURE_CASE_0
.TEMP 27
.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.ALTER FIXTURE_CASE_1
.TEMP 27
.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.ALTER FIXTURE_CASE_2
.TEMP 27
.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.ALTER FIXTURE_CASE_3
.TEMP 27
.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.ALTER FIXTURE_CASE_4
.TEMP 100
.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.ALTER FIXTURE_CASE_5
.TEMP 27
.PARAM FIXTURE_TRAN_STEP=0.1n FIXTURE_TRAN_STOP=500n
.ALTER FIXTURE_CASE_6
.TEMP 27
.PARAM FIXTURE_TRAN_STEP=0.01n FIXTURE_TRAN_STOP=100n
.END
