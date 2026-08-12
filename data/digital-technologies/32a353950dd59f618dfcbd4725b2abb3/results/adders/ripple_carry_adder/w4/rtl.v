module adder_top(input [3:0] a, b, input cin, output [3:0] sum, output cout);
  wire [4:0] carry;
  assign carry[0] = cin;
  assign {carry[1], sum[0]} = a[0] + b[0] + carry[0];
  assign {carry[2], sum[1]} = a[1] + b[1] + carry[1];
  assign {carry[3], sum[2]} = a[2] + b[2] + carry[2];
  assign {carry[4], sum[3]} = a[3] + b[3] + carry[3];
  assign cout = carry[4];
endmodule
