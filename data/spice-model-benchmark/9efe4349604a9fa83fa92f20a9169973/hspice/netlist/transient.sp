* Translated benchmark circuit
* semantic-sha256: 2ad8cde147b2424235ca92430457ce42415aeb19771c7ec53de3872285a20c06
.INC '/home/duhaochen/pipeline_sky130_mos/benchmark-inputs/9efe4349604a9fa83fa92f20a9169973/hspice.lib'
.TITLE Translated benchmark circuit
.option tnom=27
.option gmin=1e-15
.option reltol=1e-4
.option abstol=1e-12
.option chgtol=1e-15
.option method=gear
.option TNOM=27
.option TEMPSCALE=1.0

M_tran drain_tran gate_tran source_tran bulk_tran __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
Vgs_tran gate_tran 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
Vds_tran drain_tran 0 DC 1.2
Vs_tran source_tran 0 DC 0
Vb_tran bulk_tran 0 DC 0
Cload drain_tran 0 1f
M_inv_n out_inv in_inv 0 0 __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
M_inv_p out_inv in_inv vdd_inv vdd_inv __fixture_pmos l=1u w=20u
Vdd_inv vdd_inv 0 DC 1.2
Vin_inv in_inv 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
Cload_inv out_inv 0 1f
Vdd_delay vdd_delay 0 DC 1.2
Vin_delay in_delay 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
M_d1_n mid1_delay in_delay 0 0 __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
M_d1_p mid1_delay in_delay vdd_delay vdd_delay __fixture_pmos l=1u w=20u
Cload_d1 mid1_delay 0 1f
M_d2_n mid2_delay mid1_delay 0 0 __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
M_d2_p mid2_delay mid1_delay vdd_delay vdd_delay __fixture_pmos l=1u w=20u
Cload_d2 mid2_delay 0 1f
M_d3_n out_delay mid2_delay 0 0 __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
M_d3_p out_delay mid2_delay vdd_delay vdd_delay __fixture_pmos l=1u w=20u
Cload_d3 out_delay 0 1f
M_power_n out_power in_power 0 0 __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
M_power_p out_power in_power vdd_power vdd_power __fixture_pmos l=1u w=20u
Vdd_power vdd_power 0 DC 1.2
Vin_power in_power 0 PULSE(0 1.2 0n 0.5n 0.5n 10n 20n)
Cload_power out_power 0 1f
Vdd_charge vdd_charge 0 DC 1.2
Vg_charge gate_charge 0 PULSE(0 1.2 0n 1n 1n 10n 20n)
M_charge drain_charge gate_charge source_charge bulk_charge __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
Vd_charge drain_charge 0 DC 1.2
Vs_charge source_charge 0 DC 0
Vb_charge bulk_charge 0 DC 0
Cg gate_charge 0 1e-18
Cd drain_charge 0 1e-18
Cs source_charge 0 1e-18
Cb bulk_charge 0 1e-18
M_qs drain_qs gate_qs source_qs bulk_qs __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
Vgs_qs gate_qs 0 PULSE(0 1.2 0n 20n 20n 100n 200n)
Vds_qs drain_qs 0 DC 1.2
Vs_qs source_qs 0 DC 0
Vb_qs bulk_qs 0 DC 0
Cload_qs drain_qs 0 10f
.PRINT TRAN V(gate_tran) V(drain_tran) I(Vds_tran) I(Vgs_tran) I(Vs_tran) I(Vb_tran) V(in_inv) V(out_inv) V(vdd_inv) I(Vdd_inv) V(in_delay) V(mid1_delay) V(mid2_delay) V(out_delay) V(in_power) V(out_power) V(vdd_power) I(Vdd_power) V(gate_qs) V(drain_qs) I(Vds_qs) V(gate_charge) I(Vg_charge) I(Vd_charge) I(Vs_charge) I(Vb_charge)
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.TRAN AST_TRAN_STEP AST_TRAN_STOP AST_TRAN_START
.ALTER AST_CASE_0
.TEMP 27
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.ALTER AST_CASE_1
.TEMP 27
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.ALTER AST_CASE_2
.TEMP 27
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.ALTER AST_CASE_3
.TEMP 27
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.ALTER AST_CASE_4
.TEMP 100
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.ALTER AST_CASE_5
.TEMP 27
.PARAM AST_TRAN_STEP=1e-10 AST_TRAN_STOP=5e-07 AST_TRAN_START=0
.ALTER AST_CASE_6
.TEMP 27
.PARAM AST_TRAN_STEP=1e-11 AST_TRAN_STOP=1e-07 AST_TRAN_START=0
.END
