* Fixed native HSPICE AC benchmark fixture.
* Benchmark contract: mosfet-fixed-native-v1
* One parameter sweep replaces the former 341-case generated expansion.
.TITLE Fixed native MOSFET AC benchmark
.OPTION POST=1 BRIEF NOMOD INGOLD=2 NUMDGT=10
.OPTION TNOM=27 GMIN=1e-15 RELTOL=1e-6 ABSTOL=1e-12
.INC '/home/duhaochen/pipeline_sky130_mos/benchmark-inputs/a027fb5803148e83aab109b4c0b22e97/hspice.lib'

* Four identical DUTs form the four columns of the terminal Y/C matrix.
.PARAM VG_BIAS=-0.8
M_CG dg gg sg bg __benchmark_selected_nmos L=1u W=10u
VG_G gg 0 DC=VG_BIAS AC=1
VD_G dg 0 DC=1.0 AC=0
VS_G sg 0 DC=0 AC=0
VB_G bg 0 DC=0 AC=0
M_CD dd gd sd bd __benchmark_selected_nmos L=1u W=10u
VG_D gd 0 DC=VG_BIAS AC=0
VD_D dd 0 DC=1.0 AC=1
VS_D sd 0 DC=0 AC=0
VB_D bd 0 DC=0 AC=0
M_CS ds gs ss bs __benchmark_selected_nmos L=1u W=10u
VG_S gs 0 DC=VG_BIAS AC=0
VD_S ds 0 DC=1.0 AC=0
VS_S ss 0 DC=0 AC=1
VB_S bs 0 DC=0 AC=0
M_CB db gb sb bb __benchmark_selected_nmos L=1u W=10u
VG_B gb 0 DC=VG_BIAS AC=0
VD_B db 0 DC=1.0 AC=0
VS_B sb 0 DC=0 AC=0
VB_B bb 0 DC=0 AC=1

* Two simultaneous port excitations recover all four Y parameters.
M_SPG drain_spg gate_spg 0 0 __benchmark_selected_nmos L=1u W=10u
RG_G gate_spg gate_in_g 50
RD_G drain_spg drain_in_g 50
VSP_G gate_in_g 0 DC=0.8 AC=1
VSP_D0 drain_in_g 0 DC=1.0 AC=0
M_SPD drain_spd gate_spd 0 0 __benchmark_selected_nmos L=1u W=10u
RG_D gate_spd gate_in_d 50
RD_D drain_spd drain_in_d 50
VSP_G0 gate_in_d 0 DC=0.8 AC=0
VSP_D drain_in_d 0 DC=1.0 AC=1

* NQS phase setup.
M_NQS drain_nqs gate_nqs 0 0 __benchmark_selected_nmos L=1u W=10u
VNQS_G gate_nqs 0 DC=0.8 AC=1
VNQS_D drain_nqs 0 DC=1.0 AC=0

* Charge-conservation transient remains part of the fixed AC experiment.
M_Q drain_q gate_q source_q bulk_q __benchmark_selected_nmos L=1u W=10u
VQG gate_q 0 PWL(0 0 1n 0 2n 1.0 5n 1.0)
VQD drain_q 0 DC=1.0
VQS source_q 0 DC=0
VQB bulk_q 0 DC=0

.PRINT AC II(VG_G) IR(VG_G) II(VD_G) IR(VD_G) II(VS_G) IR(VS_G) II(VB_G) IR(VB_G)
.PRINT AC II(VG_D) IR(VG_D) II(VD_D) IR(VD_D) II(VS_D) IR(VS_D) II(VB_D) IR(VB_D)
.PRINT AC II(VG_S) IR(VG_S) II(VD_S) IR(VD_S) II(VS_S) IR(VS_S) II(VB_S) IR(VB_S)
.PRINT AC II(VG_B) IR(VG_B) II(VD_B) IR(VD_B) II(VS_B) IR(VS_B) II(VB_B) IR(VB_B)
.PRINT AC VR(gate_in_g) VI(gate_in_g) II(VSP_G) IR(VSP_G) II(VSP_D0) IR(VSP_D0)
.PRINT AC VR(drain_in_d) VI(drain_in_d) II(VSP_G0) IR(VSP_G0) II(VSP_D) IR(VSP_D)
.PRINT AC VR(gate_nqs) VI(gate_nqs) II(VNQS_D) IR(VNQS_D)
.PRINT TRAN V(gate_q) I(VQG) I(VQD) I(VQS) I(VQB)

.PARAM AC_START=1k AC_STOP=1meg VG_START=-0.8 VG_STOP=1.2 VG_STEP=0.05
.AC DEC 1 AC_START AC_STOP SWEEP VG_BIAS VG_START VG_STOP VG_STEP
.ALTER FIXTURE_CASE_0
.TEMP 27
.PARAM AC_START=1k AC_STOP=1meg VG_START=-0.8 VG_STOP=1.2 VG_STEP=0.05
.ALTER FIXTURE_CASE_1
.TEMP 27
.PARAM AC_START=1meg AC_STOP=1gig VG_START=0.8 VG_STOP=0.8 VG_STEP=0.05
.ALTER FIXTURE_CASE_2
.TEMP 27
.PARAM AC_START=10meg AC_STOP=10gig VG_START=0.8 VG_STOP=0.8 VG_STEP=0.05
.ALTER FIXTURE_CASE_3
.TEMP 27
.PARAM AC_START=1meg AC_STOP=1meg VG_START=0.8 VG_STOP=0.8 VG_STEP=0.05
.TRAN 0.01n 5n
.END
