`default_nettype none

module adder_and2(input A, B, output Y);
  wire unused_sum;
  sky130_fd_sc_hd__ha_1 u_cell(.A(A), .B(B), .COUT(Y), .SUM(unused_sum));
endmodule

module adder_xor2(input A, B, output Y);
  wire unused_cout;
  sky130_fd_sc_hd__ha_1 u_cell(.A(A), .B(B), .COUT(unused_cout), .SUM(Y));
endmodule

module adder_or2(input A, B, output Y);
  wire unused_sum;
  sky130_fd_sc_hd__fa_1 u_cell(
    .A(A), .B(B), .CIN(1'b1), .COUT(Y), .SUM(unused_sum)
  );
endmodule

module adder_mux2(input D0, D1, S, output Y);
  wire delta;
  wire selected_delta;
  adder_xor2 u_delta(.A(D0), .B(D1), .Y(delta));
  adder_and2 u_select(.A(S), .B(delta), .Y(selected_delta));
  adder_xor2 u_output(.A(D0), .B(selected_delta), .Y(Y));
endmodule

module adder_prefix_node(
  input G_HI, P_HI, G_LO, P_LO,
  output G_OUT, P_OUT
);
  wire propagated_g;
  adder_and2 u_pg(.A(P_HI), .B(G_LO), .Y(propagated_g));
  adder_and2 u_pp(.A(P_HI), .B(P_LO), .Y(P_OUT));
  adder_or2 u_gg(.A(G_HI), .B(propagated_g), .Y(G_OUT));
endmodule

`default_nettype wire
