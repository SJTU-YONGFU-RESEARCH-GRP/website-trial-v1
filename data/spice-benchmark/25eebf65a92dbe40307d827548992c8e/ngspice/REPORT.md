# MOSFET Simulation Verification Report
Generated on: 2026-07-26 20:30:59

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
  - Path: /home/duhaochen/website-trial-v1/data/spice-benchmark/25eebf65a92dbe40307d827548992c8e/ngspice/_ngspice_netlists/dc_circuit.cir, /home/duhaochen/website-trial-v1/data/spice-benchmark/25eebf65a92dbe40307d827548992c8e/ngspice/_ngspice_netlists/transient_circuit.cir, /home/duhaochen/website-trial-v1/data/spice-benchmark/25eebf65a92dbe40307d827548992c8e/ngspice/_ngspice_netlists/noise_circuit.cir, /home/duhaochen/website-trial-v1/data/spice-benchmark/25eebf65a92dbe40307d827548992c8e/ngspice/_ngspice_netlists/ac_circuit.cir
- [<span style='color: green'>✓</span>] ngspice is properly installed
  - Version: ngspice-46+
- [<span style='color: green'>✓</span>] Simulation runs without errors

## 2. Summary
### DC Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -7.48e-03A to 0.00e+00A |
| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -6.88e-03A to 0.00e+00A, IG: 0.00e+00A to 0.00e+00A, IS: 0.00e+00A to 6.88e-03A, IB: 0.00e+00A to 2.40e-15A, KCL Error: 0.00%, Power: 0.00e+00W to 8.25e-03W, Temp: -40°C |
| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000004 /°C, IDS: -7.475e-03A to 0.000e+00A |
| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 8.970e-03W, Efficiency: 1.706e+01 to 1.768e+05, TC: nan/°C |

### AC Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
| [Small Signal Analysis](#small-signal-analysis) | <span style='color: green'>✓</span> | Gate capacitance range: 6.48fF to 6.53fF |
| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: green'>✓</span> | S11 range: -0dB to 0dB, S21 range: -14dB to -14dB |
| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: green'>✓</span> | Max phase shift: 179.996 |
| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: green'>✓</span> | Total charge error: 0.0 |

### Transient Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
| [Large-Signal Transient](#large-signal-transient) | <span style='color: red'>✗</span> | Data not available |
| [Switching Simulations](#switching-simulations) | <span style='color: red'>✗</span> | Data not available |
| [Delay Effect](#delay-effect-simulations) | <span style='color: red'>✗</span> | Data not available |
| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: red'>✗</span> | Data not available |
| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: red'>✗</span> | Data not available |
| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: None |

### Noise Analysis Summary
| Test Type | Status | Key Findings |
|-----------|--------|-------------|
| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |
| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |
| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |
| [Temperature Dependence](#temperature-dependence) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |
| [Bias Dependence](#bias-dependence) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |

## 3. DC Analysis
### DC Operating Point Analysis
- [<span style='color: green'>✓</span>] IV data file is generated
- [<span style='color: green'>✓</span>] Data points are properly read
- [<span style='color: green'>✓</span>] Vds values are within range
  - Range: 0.00V to 1.20V
- [<span style='color: green'>✓</span>] Vgs values are within range
  - Range: 0.00V to 1.20V
- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured
  - Range: -7.48e-03A to 0.00e+00A

*IV Characteristics showing drain current vs drain-source voltage*

<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>

### Bias Point Analysis
- [<span style='color: green'>✓</span>] Voltage Biasing Points
  - Points: 9 VDS points, 9 VGS points
- [<span style='color: green'>✓</span>] Current Range
  - IDS: -6.88e-03A to 0.00e+00A
  - IG: 0.00e+00A to 0.00e+00A
  - IS: 0.00e+00A to 6.88e-03A
  - IB: 0.00e+00A to 2.40e-15A
- [<span style='color: green'>✓</span>] KCL Error Range
  - KCL Error: 0.00%

*KCL verification showing current balance*

<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>

### Temperature Analysis
- [<span style='color: green'>✓</span>] Temperature sweep is performed
  - Points: [-40, 0, 25, 50, 100, 150]
- [<span style='color: green'>✓</span>] Temperature coefficient is calculated
  - Temperature Coefficient: 0.000004 /°C
- [<span style='color: green'>✓</span>] Device behavior is valid
  - Current Range: -7.475e-03A to 0.000e+00A
- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid

*Temperature analysis showing current variation*

<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>

### Thermodynamic Analysis
- [<span style='color: green'>✓</span>] Energy is conserved
  - Power Range: 0.000e+00W to 8.970e-03W
- [<span style='color: green'>✓</span>] Device is efficient
  - Efficiency Range: 1.706e+01 to 1.768e+05
- [<span style='color: green'>✓</span>] Temperature coefficient is calculated
  - Value: nan/°C

### Physical Properties Analysis
- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*
- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*
- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*
- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*
- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*

## 4. Transient Analysis
### Large-Signal Transient
- [<span style='color: red'>✗</span>] Large-Signal Transient verification failed
  - Data not available or failed to read

### Switching Simulations
- [<span style='color: red'>✗</span>] Switching Simulations verification failed
  - Data not available or failed to read

### Delay Effect Simulations
- [<span style='color: red'>✗</span>] Delay Effect Simulations verification failed
  - Data not available or failed to read

### Transient Simulations for Power Dissipation
- [<span style='color: red'>✗</span>] Power verification failed
  - Data not available or failed to read

### Quasi-Static Analysis
- [<span style='color: red'>✗</span>] Quasi-Static Simulations verification failed
  - Data not available or failed to read

### Charge Conservation Tests
- [<span style='color: red'>✗</span>] Charge Conservation verification failed
  - Data not available or failed to read


## 5. AC Analysis
### Small-Signal Analysis
- [<span style='color: green'>✓</span>] AC small-signal simulations verified
  - Gate capacitance range: 6.48fF to 6.53fF
  - Frequency range: 1.00e+06Hz to 1.00e+09Hz
  - Max capacitance at: 0.00V

*CV characteristics showing gate capacitance variation with gate voltage*

<img src='plots/ac_cv_characteristics.png' alt='CV Characteristics' width='400'/>

Capacitance components (Cgb, Cgs, Cgd) variation with gate voltage*

<img src='plots/ac_cv_components.png' alt='CV Components' width='400'/>

### AC-Integral Large-Signal Capacitance
- [<span style='color: red'>✗</span>] AC-integral LS capacitance not available
  - cv_data.txt may be missing required columns

### S-Parameter Analysis
- [<span style='color: green'>✓</span>] High-frequency AC simulations verified
  - Frequency range: 1.0MHz to 1.0GHz
- [<span style='color: green'>✓</span>] S-parameter analysis verified
  - S11 range: -0dB to 0dB
  - S21 range: -14dB to -14dB
  - S12 range: -118dB to -58dB
  - S22 range: -2dB to -2dB
- [<span style='color: green'>✓</span>] RF simulations verified
  - Isolation: >-44dB

*S-Parameter analysis showing frequency response characteristics*

<img src='plots/ac_cv_sparameter_analysis.png' alt='S-Parameters' width='400'/>

### Non-Quasi-Static Effects Analysis
- [<span style='color: green'>✓</span>] NQS effects verified
  - Maximum phase shift: 179.996
  - Frequency range: 10.0MHz to 10.0GHz

*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*

<img src='plots/ac_cv_nqs_effects.png' alt='NQS Effects' width='400'/>

### Charge Conservation Analysis
- [<span style='color: red'>✗</span>] Charge conservation verification failed
  - Data not available or failed to read

## 6. Noise Analysis
### Thermal Noise Analysis
- [<span style='color: green'>✓</span>] Thermal noise analysis completed
  - Max Noise: 1.00e+09 V²/Hz
  - Min Noise: 2.16e-15 V²/Hz
  - Avg Noise: 2.54e+07 V²/Hz
  - Noise Floor: 2.65e+07 V²/Hz
  - Frequency Range: 0.0MHz to 1.0GHz

*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*

<img src='plots/noise_thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>

### Flicker Noise Analysis
- [<span style='color: green'>✓</span>] Flicker noise analysis completed
  - Coefficient (K): 4.68e-08
  - Exponent (γ): 5.07e-01 (ideally -1.0 for pure 1/f noise)
  - Correlation (R²): 0.8265
  - Corner Frequency: 1.12e+00 Hz

*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*

<img src='plots/noise_flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>

### Short Noise Analysis
- [<span style='color: green'>✓</span>] Short noise analysis completed
  - Shot Noise Level: 3.79e-09 V²/Hz
  - Standard Deviation: 5.56e-09 V²/Hz
  - Variation Coefficient: 1.4676

*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*

<img src='plots/noise_shot_noise.png' alt='Shot Noise Analysis' width='400'/>

### Temperature Dependence
- [<span style='color: green'>✓</span>] Short noise analysis completed
  - Temperature Coefficient: 2.77e-11 V²/Hz/°C
  - Temperature-Noise Correlation: None
  - Temperature Range: -40.0°C to 150.0°C

*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*

<img src='plots/noise_vs_temperature.png' alt='Shot Noise Analysis' width='400'/>

### Bias Dependence
- [<span style='color: green'>✓</span>] Bias Dependance analysis completed
*Thermal Noise Results at Different Bias Points*

| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |
|----------------|-------------------|-------------------|-------------------|--------------------|
| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |
| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |
| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |
| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |
| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |
| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |

