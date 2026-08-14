read_liberty /home/duhaochen/LibCharX/characterization/sky130_adders/results/libcharx_adder_test.lib
read_verilog /home/duhaochen/LibCharX/characterization/sky130_adders/application/netlists/adder8_ripple_mapped.v
link_design adder8_ripple
create_clock -name vclk -period 10.0
set_input_delay 0.0 -clock vclk [all_inputs]
set_input_transition 0.0531329 [all_inputs]
set_output_delay 0.0 -clock vclk [all_outputs]
set_load 0.00956858 [all_outputs]
report_checks -path_delay max -format full -fields {slew cap input_pins} -digits 6 -group_path_count 20
report_worst_slack -max -digits 6
exit
