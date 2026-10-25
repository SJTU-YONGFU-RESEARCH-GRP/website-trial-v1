`timescale 1ns/1ps
module tb;
  reg [3:0] a, b;
  reg cin;
  wire [3:0] sum;
  wire cout;
  reg [4:0] expected;
  integer i;
  adder_top dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));
  initial begin
    for (i = 0; i < 128; i = i + 1) begin
      a = (i * 17 + 3) & 4'hf;
      b = (i * 29 + 11) & 4'hf;
      cin = i & 1;
      #1;
      expected = a + b + cin;
      if ({cout, sum} !== expected) begin
        $display("FAIL vector=%0d a=%h b=%h cin=%b got=%b_%h expected=%h", i, a, b, cin, cout, sum, expected);
        $finish_and_return(1);
      end
    end
    $display("PASS vectors=128 width=4");
    $finish;
  end
endmodule
