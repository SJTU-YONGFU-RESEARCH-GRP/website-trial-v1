`default_nettype none

module sky130_fd_sc_hd__fa_1(input A, B, CIN, output COUT, SUM);
  assign COUT = (A & B) | (A & CIN) | (B & CIN);
  assign SUM = A ^ B ^ CIN;
endmodule

module sky130_fd_sc_hd__fah_1(input A, B, CI, output COUT, SUM);
  assign COUT = (A & B) | (A & CI) | (B & CI);
  assign SUM = A ^ B ^ CI;
endmodule

module sky130_fd_sc_hd__fahcin_1(input A, B, CIN, output COUT, SUM);
  assign COUT = (A & B) | (A & ~CIN) | (B & ~CIN);
  assign SUM = A ^ B ^ ~CIN;
endmodule

module sky130_fd_sc_hd__fahcon_1(input A, B, CI, output COUT_N, SUM);
  assign COUT_N = ~((A & B) | (A & CI) | (B & CI));
  assign SUM = A ^ B ^ CI;
endmodule

module sky130_fd_sc_hd__ha_1(input A, B, output COUT, SUM);
  assign COUT = A & B;
  assign SUM = A ^ B;
endmodule

`default_nettype wire
