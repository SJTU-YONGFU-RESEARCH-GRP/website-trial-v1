`default_nettype none

module adder8_ripple(
  input [7:0] A, B,
  input CIN,
  output [7:0] SUM,
  output COUT
);
  wire [8:0] carry;
  assign carry[0] = CIN;
  assign COUT = carry[8];
  genvar i;
  generate
    for (i = 0; i < 8; i = i + 1) begin : gen_bits
      sky130_fd_sc_hd__fa_1 u_fa(
        .A(A[i]), .B(B[i]), .CIN(carry[i]),
        .COUT(carry[i+1]), .SUM(SUM[i])
      );
    end
  endgenerate
endmodule

`default_nettype wire
