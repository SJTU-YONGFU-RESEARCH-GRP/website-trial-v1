`default_nettype none

(* blackbox *) module sky130_fd_sc_hd__fa_1(
  input A, B, CIN, output COUT, SUM
); endmodule
(* blackbox *) module sky130_fd_sc_hd__fah_1(
  input A, B, CI, output COUT, SUM
); endmodule
(* blackbox *) module sky130_fd_sc_hd__fahcin_1(
  input A, B, CIN, output COUT, SUM
); endmodule
(* blackbox *) module sky130_fd_sc_hd__fahcon_1(
  input A, B, CI, output COUT_N, SUM
); endmodule
(* blackbox *) module sky130_fd_sc_hd__ha_1(
  input A, B, output COUT, SUM
); endmodule

`default_nettype wire
