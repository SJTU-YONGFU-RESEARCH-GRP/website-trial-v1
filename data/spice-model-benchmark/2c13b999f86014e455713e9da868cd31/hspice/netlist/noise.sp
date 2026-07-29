* Translated benchmark circuit
* semantic-sha256: 1775cfeb1bf3e0a1e85e628065e4f0024ef970cfc26209ccd44d453f092cadb2
.INC '/home/duhaochen/pipeline_sky130_mos/benchmark-inputs/2c13b999f86014e455713e9da868cd31/hspice.lib'
.TITLE Translated benchmark circuit
.option tnom=27
.option gmin=1e-15
.option reltol=1e-8
.option abstol=1e-12
.option chgtol=1e-15
.option method=gear
.option TNOM=27
.option TEMPSCALE=1.0

Vdd_noise vdd_noise 0 DC 1.2
Vin_noise in_noise 0 DC 0.6 AC 1
Rb_noise in_noise gate_noise 1k
Cb_noise in_noise gate_noise 1u
Rs_noise source_noise 0 100
Rd_noise vdd_noise drain_noise 10k
Vgs_noise gate_noise source_noise DC 0
Vds_noise drain_noise source_noise DC 0
Vbulk_noise bulk_noise 0 DC 0
M_noise drain_noise gate_noise source_noise bulk_noise __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
Vin_f flicker_in 0 DC 0 AC 1
Rin_f flicker_in flicker_gate 1k
Vbias_f flicker_vdd 0 DC 1.2
Vgs_flicker flicker_gate_bias 0 DC 0.6
M_flicker flicker_drain flicker_gate flicker_source flicker_bulk __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
Vgs_inp_f flicker_gate flicker_gate_bias DC 0
Rout_f flicker_drain flicker_vdd 10k
Vbulk_f flicker_bulk 0 DC 0
Vsrc_f flicker_source 0 DC 0
Vdd_shot shot_vdd 0 DC 1.2 AC 1
Vgs_shot shot_gate 0 DC 0.9
Rload_shot shot_vdd shot_drain 10k
M_shot shot_drain shot_gate shot_source shot_bulk __benchmark_selected_nmos l=5.0250000000000006e-07 w=9.9749999999999998e-07
Vbulk_shot shot_bulk 0 DC 0
Vsrc_shot shot_source 0 DC 0
.PRINT NOISE ONOISE INOISE
.ALTER AST_CASE_0
Vgs_noise gate_noise source_noise DC 0.3
Vds_noise drain_noise source_noise DC 0.3
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_1
Vgs_noise gate_noise source_noise DC 0.3
Vds_noise drain_noise source_noise DC 0.6
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_2
Vgs_noise gate_noise source_noise DC 0.3
Vds_noise drain_noise source_noise DC 0.9
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_3
Vgs_noise gate_noise source_noise DC 0.3
Vds_noise drain_noise source_noise DC 1.2
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_4
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.3
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_5
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_6
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
.TEMP 27
.AC dec 20 0.1 1000000
.NOISE v(flicker_drain) vin_f 1
.ALTER AST_CASE_7
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(shot_drain) vdd_shot 1
.ALTER AST_CASE_8
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP -40
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_9
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP 0
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_10
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP 27
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_11
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP 50
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_12
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP 100
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.ALTER AST_CASE_13
Vgs_noise gate_noise source_noise DC 0.6
Vds_noise drain_noise source_noise DC 0.6
Vgs_flicker flicker_gate_bias 0 DC 0.6
Vbias_f flicker_vdd 0 DC 1.2
Vgs_shot shot_gate 0 DC 0.9
.TEMP 150
.AC dec 20 1 1000000000
.NOISE v(drain_noise) vin_noise 1
.END
