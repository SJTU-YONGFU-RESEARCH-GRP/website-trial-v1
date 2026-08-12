module adder_top(input [7:0] a, b, input cin, output [7:0] sum, output cout);
  wire [2:0] block_carry;
  assign block_carry[0] = cin;
  wire [4:0] candidate0_0;
  wire [4:0] candidate1_0;
  assign candidate0_0 = {1'b0, a[3:0]} + {1'b0, b[3:0]};
  assign candidate1_0 = {1'b0, a[3:0]} + {1'b0, b[3:0]} + 1'b1;
  assign sum[3:0] = block_carry[0] ? candidate1_0[3:0] : candidate0_0[3:0];
  assign block_carry[1] = block_carry[0] ? candidate1_0[4] : candidate0_0[4];
  wire [4:0] candidate0_1;
  wire [4:0] candidate1_1;
  assign candidate0_1 = {1'b0, a[7:4]} + {1'b0, b[7:4]};
  assign candidate1_1 = {1'b0, a[7:4]} + {1'b0, b[7:4]} + 1'b1;
  assign sum[7:4] = block_carry[1] ? candidate1_1[3:0] : candidate0_1[3:0];
  assign block_carry[2] = block_carry[1] ? candidate1_1[4] : candidate0_1[4];
  assign cout = block_carry[2];
endmodule
