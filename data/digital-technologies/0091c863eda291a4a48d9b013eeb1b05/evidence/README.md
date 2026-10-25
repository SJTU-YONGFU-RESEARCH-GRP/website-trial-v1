# SKY130 adder closed-loop experiment

This experiment characterizes one representative cell from each installed
SKY130 HD adder variant, then uses the generated Liberty in five functionally
equivalent 8-bit adder implementations.

## Characterized cells

- `sky130_fd_sc_hd__fa_1`
- `sky130_fd_sc_hd__fah_1`
- `sky130_fd_sc_hd__fahcin_1`
- `sky130_fd_sc_hd__fahcon_1`
- `sky130_fd_sc_hd__ha_1`

The configured corner is TT, 1.8 V, 25 °C. The full NLDM grid contains three
input slews and three output loads. A normal run is:

```sh
cd /home/duhaochen/LibCharX
.venv/bin/python characterization/sky130_adders/run_characterization.py
```

This creates `results/libcharx_adder_test.lib`, `results/results.json`, and a
hash-bearing `results/run_manifest.json`.

## Application flow

The five top modules have exactly the same ports and implement the same 8-bit
addition function. Only their internal architectures differ: ripple carry,
Kogge-Stone, carry-select, carry-skip, and alternating-polarity ripple.

Run formal equivalence, common Yosys synthesis, common OpenSTA analysis, and
the final report as follows:

```sh
cd /home/duhaochen/LibCharX/characterization/sky130_adders/application/scripts
yosys -ql ../formal.log formal.ys

cd /home/duhaochen/LibCharX
.venv/bin/python characterization/sky130_adders/application/run_synthesis.py
cd characterization/sky130_adders/application/scripts
yosys -ql ../formal_mapped.log formal_mapped.ys
cd /home/duhaochen/LibCharX
.venv/bin/python characterization/sky130_adders/application/run_sta.py
.venv/bin/python characterization/sky130_adders/application/make_report.py
```

The mapped Verilog/JSON files are under `application/netlists`. Machine-readable
area, cell count, and timing summaries plus the Chinese Markdown report are
under `application/reports`.

## Modeling scope

XOR/XNOR `SUM` outputs are non-unate over all static input conditions. Per the
experiment's one-normal-run scope, the final full sweep uses one explicitly
configured representative sensitization vector per input-to-`SUM` arc. This is
sufficient for the closed-loop comparison, but it is not a dual-sensitization
sign-off characterization of every XOR parity condition.
