`timescale 1ns/1ps
module tb;
  reg [7:0] a, b;
  reg cin;
  wire [7:0] sum;
  wire cout;
  reg [8:0] expected;
  integer i;
  adder_top dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));
  initial begin
    for (i = 0; i < 128; i = i + 1) begin
      a = (i * 17 + 3) & 8'hff;
      b = (i * 29 + 11) & 8'hff;
      cin = i & 1;
      #1;
      expected = a + b + cin;
      if ({cout, sum} !== expected) begin
        $display("FAIL vector=%0d a=%h b=%h cin=%b got=%b_%h expected=%h", i, a, b, cin, cout, sum, expected);
        $finish_and_return(1);
      end
    end
    $display("PASS vectors=128 width=8");
    $finish;
  end
endmodule
