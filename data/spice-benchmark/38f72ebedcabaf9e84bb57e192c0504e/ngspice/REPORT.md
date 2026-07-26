# MOSFET Simulation Verification Report
Generated on: 2026-07-27 06:02:21

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
  - Path: /home/duhaochen/website-trial-v1/data/spice-model-benchmark/38f72ebedcabaf9e84bb57e192c0504e/ngspice/_ngspice_netlists/dc_circuit.cir, /home/duhaochen/website-trial-v1/data/spice-model-benchmark/38f72ebedcabaf9e84bb57e192c0504e/ngspice/_ngspice_netlists/transient_circuit.cir, /home/duhaochen/website-trial-v1/data/spice-model-benchmark/38f72ebedcabaf9e84bb57e192c0504e/ngspice/_ngspice_netlists/noise_circuit.cir, /home/duhaochen/website-trial-v1/data/spice-model-benchmark/38f72ebedcabaf9e84bb57e192c0504e/ngspice/_ngspice_netlists/ac_circuit.cir
- [<span style='color: green'>✓</span>] ngspice is properly installed
  - Version: ngspice-46+
- [<span style='color: green'>✓</span>] Simulation runs without errors

## 2. Summary
### DC Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.19e-05A to 0.00e+00A |
| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -1.10e-05A to 0.00e+00A, IG: 0.00e+00A to 0.00e+00A, IS: 0.00e+00A to 1.10e-05A, IB: 0.00e+00A to 1.20e-15A, KCL Error: 0.00%, Power: 0.00e+00W to 1.32e-05W, Temp: -40°C |
| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000000 /°C, IDS: -1.186e-05A to 0.000e+00A |
| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 1.423e-05W, Efficiency: 5.082e+00 to 2.737e+02, TC: nan/°C |

### AC Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [Small Signal Analysis](#small-signal-analysis) | <span style='color: green'>✓</span> | Gate capacitance range: 34.15fF to 118.12fF |
| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: green'>✓</span> | S11 range: -0dB to 0dB, S21 range: -122dB to -62dB |
| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: green'>✓</span> | Max phase shift: 91.564 |
| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: green'>✓</span> | Total charge error: 0.0 |

### Transient Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 5.675e-05A, Rise Time: 0.4ps |
| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 6071.1ps, Power: 1.289e-03W (max), 1.219e-04W (avg) |
| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 292.9ps |
| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -8.692503e-07W/°C |
| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed: None |
| [Charge Conservation](#charge-conservation-checks) | <span style='color: green'>✓</span> | Error: None |

### Noise Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 3.07e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |
| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.4994, Corner Freq: 1.58e+00 Hz |
| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.84e-09 V²/Hz, Variation: 1.4580 |
| [Temperature Dependence](#temperature-dependence) | <span style='color: green'>✓</span> | Coefficient: -4.82e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |
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
  - Range: -1.19e-05A to 0.00e+00A

*IV Characteristics showing drain current vs drain-source voltage*

<img src='plot/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>

### Bias Point Analysis
- [<span style='color: green'>✓</span>] Voltage Biasing Points
  - Points: 9 VDS points, 9 VGS points
- [<span style='color: green'>✓</span>] Current Range
  - IDS: -1.10e-05A to 0.00e+00A
  - IG: 0.00e+00A to 0.00e+00A
  - IS: 0.00e+00A to 1.10e-05A
  - IB: 0.00e+00A to 1.20e-15A
- [<span style='color: green'>✓</span>] KCL Error Range
  - KCL Error: 0.00%

*KCL verification showing current balance*

<img src='plot/dc_kcl_verification.png' alt='KCL Verification' width='400'/>

### Temperature Analysis
- [<span style='color: green'>✓</span>] Temperature sweep is performed
  - Points: [-40, 0, 25, 50, 100, 150]
- [<span style='color: green'>✓</span>] Temperature coefficient is calculated
  - Temperature Coefficient: 0.000000 /°C
- [<span style='color: green'>✓</span>] Device behavior is valid
  - Current Range: -1.186e-05A to 0.000e+00A
- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid

*Temperature analysis showing current variation*

<img src='plot/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>

### Thermodynamic Analysis
- [<span style='color: green'>✓</span>] Energy is conserved
  - Power Range: 0.000e+00W to 1.423e-05W
- [<span style='color: green'>✓</span>] Device is efficient
  - Efficiency Range: 5.082e+00 to 2.737e+02
- [<span style='color: green'>✓</span>] Temperature coefficient is calculated
  - Value: nan/°C

### Physical Properties Analysis
- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*
- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*
- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*
- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*
- <span style='color: gray'>✗</span> Terminal permutation checks: *In Progress*

## 4. Transient Analysis
### Large-Signal Transient
- [<span style='color: green'>✓</span>] Large Signal Transient Verified
  - Maximum Drain Current: 5.674921e-05A
  - Gate Voltage Rise Time: 0.4ps

*Large-signal transient analysis showing voltages and current response*

<img src='plot/trans_large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>

### Switching Simulations
- [<span style='color: green'>✓</span>] Propagation Delay Verified
  - Propagation Delay: 6071.1ps

  - Maximum Switching Power: 1.288757e-03W

  - Average Switching Power: 1.219492e-04W

*Inverter switching analysis showing input/output voltages and power*

<img src='plot/trans_switching_response.png' alt='Switching Response' width='400'/>

### Delay Effect Simulations
- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed
  - Stage 1 Delay: 9390.5ps

  - Stage 2 Delay: 2061.9ps

  - Stage 3 Delay: 499.6ps

  - Total Delay: 292.9ps

*Delay effect analysis showing signal propagation through inverter chain*

<img src='plot/trans_delay_effect.png' alt='Delay Effect Analysis' width='400'/>

### Transient Simulations for Power Dissipation
- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed
  - Maximum Power at 27°C: 1.288757e-03W

  - Maximum Power at 100°C: 1.225302e-03W

  - Average Power at 27°C: 1.219492e-04W

  - Average Power at 100°C: 1.239276e-04W

  - Power Temperature Coefficient: -8.692503e-07W/°C

*Power dissipation analysis at different temperatures*

<img src='plot/trans_power_dissipation.png' alt='Power Dissipation' width='400'/>

*Energy consumption analysis at different temperatures*

<img src='plot/trans_energy_consumption.png' alt='Energy Consumption' width='400'/>

### Quasi-Static Analysis
- [<span style='color: green'>✓</span>] Charge conservation analyzed
*Quasi-static time-domain behavior analysis*

<img src='plot/trans_quasi_static_time.png' alt='Quasi-Static Analysis' width='400'/>

*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*

<img src='plot/trans_quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>

### Charge Conservation Checks
- [<span style='color: green'>✓</span>] Charge conservation analyzed

  - Maximum charge balance error: 0.000000e+00 C

  - Maximum current balance error: 0.000000e+00 A

*Terminal currents and charges analysis*

<img src='plot/ac_charge_conservation.png' alt='Charge Conservation Analysis' width='400'/>

*Total charge conservation analysis*

<img src='plot/ac_charge_conservation.png' alt='Total Charge' width='400'/>


## 5. AC Analysis
### Small-Signal Analysis
- [<span style='color: green'>✓</span>] AC small-signal simulations verified
  - Gate capacitance range: 34.15fF to 118.12fF
  - Frequency range: 1.00e+06Hz to 1.00e+09Hz
  - Max capacitance at: 0.00V

*CV characteristics showing gate capacitance variation with gate voltage*

<img src='plot/ac_cv_characteristics.png' alt='CV Characteristics' width='400'/>

Capacitance components (Cgb, Cgs, Cgd) variation with gate voltage*

<img src='plot/ac_cv_components.png' alt='CV Components' width='400'/>

### AC-Integral Large-Signal Capacitance
- [<span style='color: green'>✓</span>] Large-signal capacitances computed from AC C(V) integral
  - Path: Vg -0.8 → 1.2 V (ΔV=2.0)
  - Cgg source: Cgg_1MHz from cv_data.txt
  - Cgg_ls: 65.558025 fF
  - Cgs_ls: -10.570865 fF
  - Cgd_ls: -7.466940 fF
  - Cgb_ls: -47.520125 fF
  - Output: data/ac_ls_caps_from_cv_integral.csv
  - Output: data/ac_qg_from_cv_integral.csv
  - Per-gate-area (W*L) normalization available
    - Geometry: W=10 µm, L=1 µm, Area=10 µm²
    - Cgg_ls/Area: 6.555803 fF/µm²
    - Cgs_ls/Area: -1.057087 fF/µm²
    - Cgd_ls/Area: -0.746694 fF/µm²
    - Cgb_ls/Area: -4.752013 fF/µm²
    - Output: data/ac_ls_caps_from_cv_integral_per_gate_area.csv
    - Output: data/ac_cv_caps_1MHz_per_gate_area.csv

### S-Parameter Analysis
- [<span style='color: green'>✓</span>] High-frequency AC simulations verified
  - Frequency range: 1.0MHz to 1.0GHz
- [<span style='color: green'>✓</span>] S-parameter analysis verified
  - S11 range: -0dB to 0dB
  - S21 range: -122dB to -62dB
  - S12 range: -122dB to -62dB
  - S22 range: -0dB to 0dB
- [<span style='color: green'>✓</span>] RF simulations verified
  - Isolation: >-0dB

*S-Parameter analysis showing frequency response characteristics*

<img src='plot/ac_cv_sparameter_analysis.png' alt='S-Parameters' width='400'/>

### Non-Quasi-Static Effects Analysis
- [<span style='color: green'>✓</span>] NQS effects verified
  - Maximum phase shift: 91.564
  - Frequency range: 10.0MHz to 10.0GHz

*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*

<img src='plot/ac_cv_nqs_effects.png' alt='NQS Effects' width='400'/>

### Charge Conservation Analysis
- [<span style='color: green'>✓</span>] Charge conservation verified
  - Total charge error: 0.0
  - Max current: 0.0
  - Current Threshold: 1e-12

*Terminal currents and charges analysis*

<img src='plot/ac_charge_conservation.png' alt='Charge Conservation' width='400'/>

## 6. Noise Analysis
### Thermal Noise Analysis
- [<span style='color: green'>✓</span>] Thermal noise analysis completed
  - Max Noise: 1.00e+09 V²/Hz
  - Min Noise: 2.16e-15 V²/Hz
  - Avg Noise: 2.95e+07 V²/Hz
  - Noise Floor: 3.07e+07 V²/Hz
  - Frequency Range: 0.0MHz to 1.0GHz

*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*

<img src='plot/noise_thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>

### Flicker Noise Analysis
- [<span style='color: green'>✓</span>] Flicker noise analysis completed
  - Coefficient (K): 4.37e-08
  - Exponent (γ): 4.99e-01 (ideally -1.0 for pure 1/f noise)
  - Correlation (R²): 0.8214
  - Corner Frequency: 1.58e+00 Hz

*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*

<img src='plot/noise_flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>

### Short Noise Analysis
- [<span style='color: green'>✓</span>] Short noise analysis completed
  - Shot Noise Level: 3.84e-09 V²/Hz
  - Standard Deviation: 5.60e-09 V²/Hz
  - Variation Coefficient: 1.4580

*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*

<img src='plot/noise_shot_noise.png' alt='Shot Noise Analysis' width='400'/>

### Temperature Dependence
- [<span style='color: green'>✓</span>] Short noise analysis completed
  - Temperature Coefficient: -4.82e-11 V²/Hz/°C
  - Temperature-Noise Correlation: 1.5105701435783878e-16
  - Temperature Range: -40.0°C to 150.0°C

*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*

<img src='plot/noise_vs_temperature.png' alt='Shot Noise Analysis' width='400'/>

### Bias Dependence
- [<span style='color: green'>✓</span>] Bias Dependance analysis completed
*Thermal Noise Results at Different Bias Points*

| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |
|----------------|-------------------|-------------------|-------------------|--------------------|
| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.95e+07 | 2.16e-15 |
| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.95e+07 | 2.16e-15 |
| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.95e+07 | 2.16e-15 |
| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.95e+07 | 2.16e-15 |
| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.95e+07 | 2.16e-15 |
| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.95e+07 | 2.16e-15 |

<!-- collection-run-integrity -->
## Run Integrity

- Model: `ptm__22nm__lp__pm__fitting_reduction_translation`
- Model MD5: `38f72ebedcabaf9e84bb57e192c0504e`
- Simulator: `ngspice`
- Modes: `dc, transient, ac, noise`
- Started: `2026-07-26T22:01:26.801150+00:00`
- Finished: `2026-07-26T22:02:21.659251+00:00`
- Elapsed seconds: `54.858081`
- Peak resident memory KiB: `216220`
- Process return code: `0`
- Input passed SPICE-Model-AST immediately before simulator handoff.
- Plot inventory: `24` non-empty PNG files generated from simulator data.
