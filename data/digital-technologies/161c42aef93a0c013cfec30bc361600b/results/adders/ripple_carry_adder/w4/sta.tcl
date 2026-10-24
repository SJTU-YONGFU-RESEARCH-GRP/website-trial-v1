read_liberty /home/duhaochen/website-trial-v1/data/digital-technologies/161c42aef93a0c013cfec30bc361600b/library/timing.lib
read_verilog /home/duhaochen/website-trial-v1/data/digital-technologies/161c42aef93a0c013cfec30bc361600b/results/adders/ripple_carry_adder/w4/mapped.v
link_design adder_top
create_clock -name vclk -period 100.0
set_input_delay 0.0 -clock vclk [all_inputs]
set_input_transition 0.05 [all_inputs]
set_output_delay 0.0 -clock vclk [all_outputs]
set_load 0.01 [all_outputs]
report_checks -path_delay max -format full -fields {slew cap input_pins} -digits 6 -group_path_count 20
exit
