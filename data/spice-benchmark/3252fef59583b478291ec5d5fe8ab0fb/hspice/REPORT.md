# MOSFET Simulation Verification Report
Generated on: 2026-07-26 20:34:02

## Table of Contents
1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)
2. [Summary](#2-summary)
   - [DC Analysis Summary](#dc-analysis-summary)
   - [AC Analysis Summary](#ac-analysis-summary)
   - [Transient Analysis Summary](#transient-analysis-summary)
   - [Noise Analysis Summary](#noise-analysis-summary)
3. [DC Analysis](#3-dc-analysis)
   - [DC Operating Point Analysis](#dc-operating-point-analysis)
   - [Bias Point Analysis](#bias-point-analysis)
   - [Temperature Analysis](#temperature-analysis)
   - [Thermodynamic Analysis](#thermodynamic-analysis)
   - [Physical Properties Analysis](#physical-properties-analysis)
4. [AC Analysis](#4-ac-analysis)
   - [Small-Signal Analysis](#small-signal-analysis)
   - [S-Parameter Analysis](#s-parameter-analysis)
   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)
   - [Charge Conservation Analysis](#charge-conservation-analysis)
5. [Transient Analysis](#5-transient-analysis)
   - [Large-Signal Transient](#large-signal-transient)
   - [Switching Simulations](#switching-simulations)
   - [Delay Effect Simulations](#delay-effect-simulations)
6. [Noise Analysis](#6-noise-analysis)
   - [Thermal Noise Analysis](#thermal-noise-analysis)
   - [Flicker Noise Analysis](#flicker-noise-analysis)
   - [Shot Noise Analysis](#shot-noise-analysis)

## Notes
- This report is automatically generated based on mosfet_simulation.py
- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure
- Any deviations from expected behavior should be documented

## 1. Simulation Setup and Execution
- [<span style='color: green'>✓</span>] Circuit file exists and is readable
  - Path: /home/duhaochen/website-trial-v1/data/spice-benchmark/3252fef59583b478291ec5d5fe8ab0fb/model.lib
- [<span style='color: green'>✓</span>] ngspice is properly installed
  - Version: HSPICE S-2021.09
- [<span style='color: green'>✓</span>] Simulation runs without errors

## 2. Summary
### DC Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 2 VDS points, 2 VGS points, Currents: IDS: 0.00e+00A to 1.00e-03A, IG: 0.00e+00A to 1.00e-09A, IS: 0.00e+00A to 1.00e-03A, IB: 0.00e+00A to 1.00e-09A, KCL Error: 200.00%, Power: 0.00e+00W to 1.20e-03W, Temp: 27°C |

### AC Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
| [Small Signal Analysis](#small-signal-analysis) | <span style='color: red'>✗</span> | Data not available |
| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: red'>✗</span> | Data not available |
| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: red'>✗</span> | Data not available |
| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: red'>✗</span> | Data not available |

### Transient Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
- [<span style='color: red'>✗</span>] Transient simulations failed
  - Data not available or failed to read
### Noise Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
- [<span style='color: red'>✗</span>] Noise simulations failed
  - Data not available or failed to read
## 3. DC Analysis
### DC Operating Point Analysis
- [<span style='color: red'>✗</span>] IV data is Missing

### Bias Point Analysis
- [<span style='color: green'>✓</span>] Voltage Biasing Points
  - Points: 2 VDS points, 2 VGS points
- [<span style='color: green'>✓</span>] Current Range
  - IDS: 0.00e+00A to 1.00e-03A
  - IG: 0.00e+00A to 1.00e-09A
  - IS: 0.00e+00A to 1.00e-03A
  - IB: 0.00e+00A to 1.00e-09A
- [<span style='color: green'>✓</span>] KCL Error Range
  - KCL Error: 200.00%

*KCL verification showing current balance*

<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>

### Temperature Analysis
- [<span style='color: red'>✗</span>] Temperature data is Missing

### Thermodynamic Analysis
- [<span style='color: red'>✗</span>] Thermodynamic data is Missing

### Physical Properties Analysis
- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*
- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*
- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*
- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*
- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*

## 4. Transient Analysis
- [<span style='color: red'>✗</span>] Transient simulations failed
  - Data not available or failed to read
## 5. AC Analysis
- [<span style='color: red'>✗</span>] AC simulations failed
  - Data not available or failed to read
## 6. Noise Analysis
- [<span style='color: red'>✗</span>] Noise simulations failed
  - Data not available or failed to read