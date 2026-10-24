.subckt dtco_inv A Y VDD VSS
*.PININFO A:I Y:O VDD:B VSS:B
XMP0 Y A VDD VDD pfet_03v3 w=2u l=280n
XMN0 Y A VSS VSS nfet_03v3 w=1u l=280n
.ends dtco_inv
