`default_nettype none

module adder8_kogge_stone(
  input [7:0] A, B,
  input CIN,
  output [7:0] SUM,
  output COUT
);
  wire [7:0] p0, g0;
  wire [7:0] p1, g1;
  wire [7:0] p2, g2;
  wire [7:0] p3, g3;
  wire [8:0] carry;

  assign carry[0] = CIN;
  assign COUT = carry[8];

  genvar i;
  generate
    for (i = 0; i < 8; i = i + 1) begin : gen_pg
      sky130_fd_sc_hd__ha_1 u_pg(
        .A(A[i]), .B(B[i]), .COUT(g0[i]), .SUM(p0[i])
      );
    end
    for (i = 0; i < 8; i = i + 1) begin : gen_stage1
      if (i >= 1) begin
        adder_prefix_node u_prefix(
          .G_HI(g0[i]), .P_HI(p0[i]), .G_LO(g0[i-1]), .P_LO(p0[i-1]),
          .G_OUT(g1[i]), .P_OUT(p1[i])
        );
      end else begin
        assign g1[i] = g0[i];
        assign p1[i] = p0[i];
      end
    end
    for (i = 0; i < 8; i = i + 1) begin : gen_stage2
      if (i >= 2) begin
        adder_prefix_node u_prefix(
          .G_HI(g1[i]), .P_HI(p1[i]), .G_LO(g1[i-2]), .P_LO(p1[i-2]),
          .G_OUT(g2[i]), .P_OUT(p2[i])
        );
      end else begin
        assign g2[i] = g1[i];
        assign p2[i] = p1[i];
      end
    end
    for (i = 0; i < 8; i = i + 1) begin : gen_stage3
      if (i >= 4) begin
        adder_prefix_node u_prefix(
          .G_HI(g2[i]), .P_HI(p2[i]), .G_LO(g2[i-4]), .P_LO(p2[i-4]),
          .G_OUT(g3[i]), .P_OUT(p3[i])
        );
      end else begin
        assign g3[i] = g2[i];
        assign p3[i] = p2[i];
      end
    end
    for (i = 0; i < 8; i = i + 1) begin : gen_carry_sum
      wire cin_term;
      adder_and2 u_cin_term(.A(p3[i]), .B(CIN), .Y(cin_term));
      adder_or2 u_carry(.A(g3[i]), .B(cin_term), .Y(carry[i+1]));
      adder_xor2 u_sum(.A(p0[i]), .B(carry[i]), .Y(SUM[i]));
    end
  endgenerate
endmodule

`default_nettype wire
