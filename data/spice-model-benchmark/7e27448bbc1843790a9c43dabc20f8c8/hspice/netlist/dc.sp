* Translated benchmark circuit
* semantic-sha256: 5c3155cef4fd9aa82b5801d2474abe7f78e43b8f8b4b3656df2a3355adc3a2d2
.INC '/home/duhaochen/pipeline_sky130_mos/benchmark-inputs/7e27448bbc1843790a9c43dabc20f8c8/hspice.lib'
.TITLE Translated benchmark circuit
.option tnom=27
.option gmin=1e-15
.option reltol=1e-8
.option abstol=1e-12
.option chgtol=1e-15
.option method=gear
.option TNOM=27
.option TEMPSCALE=1.0

M1 drain_iv gate_iv source_iv bulk_iv __benchmark_selected_pmos l=1u w=10u
M2 drain_bias gate_bias source_bias bulk_bias __benchmark_selected_pmos l=1u w=10u
Vds_iv drain_iv 0 DC 0
Vgs_iv gate_iv 0 DC 0
Vs_iv source_iv 0 DC 0
Vb_iv bulk_iv 0 DC 0
Vds_bias drain_bias 0 DC 0
Vgs_bias gate_bias 0 DC 0
Vs_bias source_bias 0 DC 0
Vb_bias bulk_bias 0 DC 0
.PRINT DC V(drain_iv) V(gate_iv) I(Vds_iv) I(Vs_iv) I(Vb_iv) I(Vgs_iv)
.ALTER AST_CASE_0
.TEMP -40
.dc vds_iv 0 -1.2 -0.01 vgs_iv 0 -1.2 -0.2
.ALTER AST_CASE_1
.TEMP 0
.dc vds_iv 0 -1.2 -0.01 vgs_iv 0 -1.2 -0.2
.ALTER AST_CASE_2
.TEMP 25
.dc vds_iv 0 -1.2 -0.01 vgs_iv 0 -1.2 -0.2
.ALTER AST_CASE_3
.TEMP 50
.dc vds_iv 0 -1.2 -0.01 vgs_iv 0 -1.2 -0.2
.ALTER AST_CASE_4
.TEMP 100
.dc vds_iv 0 -1.2 -0.01 vgs_iv 0 -1.2 -0.2
.ALTER AST_CASE_5
.TEMP 150
.dc vds_iv 0 -1.2 -0.01 vgs_iv 0 -1.2 -0.2
.ALTER AST_CASE_6
Vds_bias drain_bias 0 DC 0.0
Vgs_bias gate_bias 0 DC 0.0
.TEMP 27
.op
.ALTER AST_CASE_7
Vds_bias drain_bias 0 DC 0.0
Vgs_bias gate_bias 0 DC -0.6
.TEMP 27
.op
.ALTER AST_CASE_8
Vds_bias drain_bias 0 DC 0.0
Vgs_bias gate_bias 0 DC -1.2
.TEMP 27
.op
.ALTER AST_CASE_9
Vds_bias drain_bias 0 DC -0.6
Vgs_bias gate_bias 0 DC 0.0
.TEMP 27
.op
.ALTER AST_CASE_10
Vds_bias drain_bias 0 DC -0.6
Vgs_bias gate_bias 0 DC -0.6
.TEMP 27
.op
.ALTER AST_CASE_11
Vds_bias drain_bias 0 DC -0.6
Vgs_bias gate_bias 0 DC -1.2
.TEMP 27
.op
.ALTER AST_CASE_12
Vds_bias drain_bias 0 DC -1.2
Vgs_bias gate_bias 0 DC 0.0
.TEMP 27
.op
.ALTER AST_CASE_13
Vds_bias drain_bias 0 DC -1.2
Vgs_bias gate_bias 0 DC -0.6
.TEMP 27
.op
.ALTER AST_CASE_14
Vds_bias drain_bias 0 DC -1.2
Vgs_bias gate_bias 0 DC -1.2
.TEMP 27
.op
.END
