`default_nettype none

module adder8_carry_select(
  input [7:0] A, B,
  input CIN,
  output [7:0] SUM,
  output COUT
);
  wire [4:0] low_carry;
  wire [8:4] upper_carry0, upper_carry1;
  wire [7:4] upper_sum0, upper_sum1;
  wire upper_cout0, upper_cout1;

  assign low_carry[0] = CIN;
  assign upper_carry0[4] = 1'b0;
  assign upper_carry1[4] = 1'b1;
  assign upper_cout0 = upper_carry0[8];
  assign upper_cout1 = upper_carry1[8];

  genvar i;
  generate
    for (i = 0; i < 4; i = i + 1) begin : gen_low
      sky130_fd_sc_hd__fah_1 u_fa(
        .A(A[i]), .B(B[i]), .CI(low_carry[i]),
        .COUT(low_carry[i+1]), .SUM(SUM[i])
      );
    end
    for (i = 4; i < 8; i = i + 1) begin : gen_upper
      sky130_fd_sc_hd__fah_1 u_fa0(
        .A(A[i]), .B(B[i]), .CI(upper_carry0[i]),
        .COUT(upper_carry0[i+1]), .SUM(upper_sum0[i])
      );
      sky130_fd_sc_hd__fah_1 u_fa1(
        .A(A[i]), .B(B[i]), .CI(upper_carry1[i]),
        .COUT(upper_carry1[i+1]), .SUM(upper_sum1[i])
      );
      adder_mux2 u_sum_mux(
        .D0(upper_sum0[i]), .D1(upper_sum1[i]),
        .S(low_carry[4]), .Y(SUM[i])
      );
    end
  endgenerate
  adder_mux2 u_cout_mux(
    .D0(upper_cout0), .D1(upper_cout1), .S(low_carry[4]), .Y(COUT)
  );
endmodule

`default_nettype wire
