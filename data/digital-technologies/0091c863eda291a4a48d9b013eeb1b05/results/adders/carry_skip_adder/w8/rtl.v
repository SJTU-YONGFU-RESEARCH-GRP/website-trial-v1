`default_nettype none

module adder8_carry_skip(
  input [7:0] A, B,
  input CIN,
  output [7:0] SUM,
  output COUT
);
  wire [7:0] propagate;
  wire [3:1] carry_low;
  wire ripple4;
  wire carry4;
  wire [7:5] carry_high;
  wire ripple8;
  wire p01, p23, skip_low;
  wire p45, p67, skip_high;

  genvar i;
  generate
    for (i = 0; i < 8; i = i + 1) begin : gen_propagate
      adder_xor2 u_p(.A(A[i]), .B(B[i]), .Y(propagate[i]));
    end
  endgenerate

  sky130_fd_sc_hd__fah_1 u_b0(.A(A[0]), .B(B[0]), .CI(CIN),          .COUT(carry_low[1]), .SUM(SUM[0]));
  sky130_fd_sc_hd__fah_1 u_b1(.A(A[1]), .B(B[1]), .CI(carry_low[1]), .COUT(carry_low[2]), .SUM(SUM[1]));
  sky130_fd_sc_hd__fah_1 u_b2(.A(A[2]), .B(B[2]), .CI(carry_low[2]), .COUT(carry_low[3]), .SUM(SUM[2]));
  sky130_fd_sc_hd__fah_1 u_b3(.A(A[3]), .B(B[3]), .CI(carry_low[3]), .COUT(ripple4),      .SUM(SUM[3]));

  adder_and2 u_p01(.A(propagate[0]), .B(propagate[1]), .Y(p01));
  adder_and2 u_p23(.A(propagate[2]), .B(propagate[3]), .Y(p23));
  adder_and2 u_skip_low(.A(p01), .B(p23), .Y(skip_low));
  adder_mux2 u_skip_mux_low(.D0(ripple4), .D1(CIN), .S(skip_low), .Y(carry4));

  sky130_fd_sc_hd__fah_1 u_b4(.A(A[4]), .B(B[4]), .CI(carry4),        .COUT(carry_high[5]), .SUM(SUM[4]));
  sky130_fd_sc_hd__fah_1 u_b5(.A(A[5]), .B(B[5]), .CI(carry_high[5]), .COUT(carry_high[6]), .SUM(SUM[5]));
  sky130_fd_sc_hd__fah_1 u_b6(.A(A[6]), .B(B[6]), .CI(carry_high[6]), .COUT(carry_high[7]), .SUM(SUM[6]));
  sky130_fd_sc_hd__fah_1 u_b7(.A(A[7]), .B(B[7]), .CI(carry_high[7]), .COUT(ripple8),       .SUM(SUM[7]));

  adder_and2 u_p45(.A(propagate[4]), .B(propagate[5]), .Y(p45));
  adder_and2 u_p67(.A(propagate[6]), .B(propagate[7]), .Y(p67));
  adder_and2 u_skip_high(.A(p45), .B(p67), .Y(skip_high));
  adder_mux2 u_skip_mux_high(.D0(ripple8), .D1(carry4), .S(skip_high), .Y(COUT));
endmodule

`default_nettype wire
