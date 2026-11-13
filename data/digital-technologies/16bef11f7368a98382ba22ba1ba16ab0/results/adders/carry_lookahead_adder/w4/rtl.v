module adder_top(input [3:0] a, b, input cin, output [3:0] sum, output cout);
  wire [3:0] p = a ^ b;
  wire [3:0] g = a & b;
  wire [4:0] carry;
  assign carry[0] = cin;
  assign carry[1] = (g[0]) | (cin & p[0]);
  assign carry[2] = (g[1]) | (g[0] & p[1]) | (cin & p[1] & p[0]);
  assign carry[3] = (g[2]) | (g[1] & p[2]) | (g[0] & p[2] & p[1]) | (cin & p[2] & p[1] & p[0]);
  assign carry[4] = (g[3]) | (g[2] & p[3]) | (g[1] & p[3] & p[2]) | (g[0] & p[3] & p[2] & p[1]) | (cin & p[3] & p[2] & p[1] & p[0]);
  assign sum = p ^ carry[3:0];
  assign cout = carry[4];
endmodule
