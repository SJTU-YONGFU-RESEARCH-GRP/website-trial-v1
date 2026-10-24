# Digital Technology result store

Digital data is strictly partitioned by the 32-character MD5 UID shown in the
frontend Technology selector:

```text
digital-technologies/
  <technology-md5>/
    technology.json
    library/
      timing.lib
    results/
      <category>/
        <architecture>/
          w<bit-width>/
            result.json
            rtl.v
            testbench.v
            rtl-simulation.log
            synthesis.ys
            synthesis.log
            mapped.v
            mapped.json
            area.rpt
            sta.tcl
            sta.log
```

`scripts/generate-design-data.mjs` rejects non-MD5 resource directories,
missing manifests, identity/UID mismatches, and rows stored under the wrong
Technology. `scripts/run-digital-technology-ppa.py` regenerates the open-PDK
adder matrix with one common Yosys/ABC, Icarus, and OpenSTA flow.

`npm run import:sky130-adders` imports the verified five-architecture 8-bit
closed-loop experiment from `LibCharX/characterization/sky130_adders`. It keeps
the existing LibCharX Liberty, formal proofs, Yosys area, and OpenSTA timing.
Because that experiment does not report activity-based design power, its
`powerMw` is explicitly marked as a representative transition-power proxy: the
middle 3×3 NLDM slew/load point is averaged across each cell's characterized
rise/fall arcs and summed by the mapped cell counts.
