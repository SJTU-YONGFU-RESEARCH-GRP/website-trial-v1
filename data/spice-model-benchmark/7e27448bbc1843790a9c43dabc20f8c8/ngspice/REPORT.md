# MOSFET Simulation Verification Report
Generated on: 2026-07-30 01:02:59

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
- [<span style='color: green'>✓</span>] Circuit files exist and are readable
  - DC: /home/duhaochen/website-trial-v1/data/spice-model-benchmark/7e27448bbc1843790a9c43dabc20f8c8/ngspice/netlist/dc.cir
  - TRANSIENT: /home/duhaochen/website-trial-v1/data/spice-model-benchmark/7e27448bbc1843790a9c43dabc20f8c8/ngspice/netlist/transient.cir
  - AC: /home/duhaochen/website-trial-v1/data/spice-model-benchmark/7e27448bbc1843790a9c43dabc20f8c8/ngspice/netlist/ac.cir
  - NOISE: /home/duhaochen/website-trial-v1/data/spice-model-benchmark/7e27448bbc1843790a9c43dabc20f8c8/ngspice/netlist/noise.cir
- [<span style='color: green'>✓</span>] ngspice is properly installed
  - Version: ngspice-46+
- [<span style='color: green'>✓</span>] Simulation runs without errors

## 2. Summary
### DC Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.13e-02A to 4.14e-30A |
| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -7.03e-03A to 5.83e-43A, IG: 0.00e+00A to 0.00e+00A, IS: -1.50e-42A to 6.90e-05A, IB: 2.43e-43A to 6.97e-03A, KCL Error: 0.00%, Power: 0.00e+00W to 8.44e-03W, Temp: -40°C |
| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000009 /°C, IDS: -1.132e-02A to 4.136e-30A |
| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 1.358e-02W, Efficiency: 1.055e+02 to 7.150e+12, TC: 5.61e-02/°C |

### AC Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [Small Signal Analysis](#small-signal-analysis) | <span style='color: green'>✓</span> | Gate capacitance range: 63.67fF to 80.56fF |
| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: green'>✓</span> | S11 range: -0.0112033dB to 0dB, S21 range: -107.588dB to -47.6033dB |
| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: green'>✓</span> | Max phase shift: 89.9988 |
| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: green'>✓</span> | Total charge error: 0.0 |

### Transient Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: -6.894e-03A, Rise Time: 400ps |
| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 499.663ps (sample interval 10ps), Power: 2.366e-04W (max), 3.359e-07W (avg) |
| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 5805.94ps (sample interval 10ps) |
| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: 4.808183e-07W/°C |
| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed: None |
| [Charge Conservation](#charge-conservation-checks) | <span style='color: green'>✓</span> | Error: None |

### Noise Analysis Summary
| Check Type | Status | Key Findings |
|-----------|--------|-------------|
| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.53e-10 V²/Hz, Range: 5.60e-16 V²/Hz to 2.55e-09 V²/Hz |
| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.0000, Corner Freq: not resolved |
| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 6.30e-10 V²/Hz, Variation: 0.0000 |
| [Temperature Dependence](#temperature-dependence) | <span style='color: green'>✓</span> | Coefficient: 1.77e-12 V²/Hz/°C, Range: -40.0°C to 150.0°C |
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
  - Range: -1.13e-02A to 4.14e-30A

*IV Characteristics showing drain current vs drain-source voltage*

<img src='plot/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>

### Bias Point Analysis
- [<span style='color: green'>✓</span>] Voltage Biasing Points
  - Points: 9 VDS points, 9 VGS points
- [<span style='color: green'>✓</span>] Current Range
  - IDS: -7.03e-03A to 5.83e-43A
  - IG: 0.00e+00A to 0.00e+00A
  - IS: -1.50e-42A to 6.90e-05A
  - IB: 2.43e-43A to 6.97e-03A
- [<span style='color: green'>✓</span>] KCL Error Range
  - KCL Error: 0.00%

*KCL verification showing current balance*

<img src='plot/dc_kcl_verification.png' alt='KCL Verification' width='400'/>

### Temperature Analysis
- [<span style='color: green'>✓</span>] Temperature sweep is performed
  - Points: [-40, 0, 25, 50, 100, 150]
- [<span style='color: green'>✓</span>] Temperature coefficient is calculated
  - Temperature Coefficient: -0.000009 /°C
- [<span style='color: green'>✓</span>] Device behavior is valid
  - Current Range: -1.132e-02A to 4.136e-30A
- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid

*Temperature analysis showing current variation*

<img src='plot/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>

### Thermodynamic Analysis
- [<span style='color: green'>✓</span>] Energy is conserved
  - Power Range: 0.000e+00W to 1.358e-02W
- [<span style='color: green'>✓</span>] Device is efficient
  - Efficiency Range: 1.055e+02 to 7.150e+12
- [<span style='color: green'>✓</span>] Temperature coefficient is calculated
  - Value: 5.61e-02/°C

### Physical Properties Analysis
- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*
- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*
- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*
- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*
- <span style='color: gray'>✗</span> Terminal permutation checks: *In Progress*

## 4. Transient Analysis
### Large-Signal Transient
- [<span style='color: green'>✓</span>] Large Signal Transient Verified
  - Maximum Drain Current: -6.894222e-03A
  - Gate Voltage Rise Time: 400ps

*Large-signal transient analysis showing voltages and current response*

<img src='plot/trans_large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>

### Switching Simulations
- [<span style='color: green'>✓</span>] Propagation Delay Verified
  - Propagation Delay: 499.663ps
  - Transient sample interval: 10ps

  - Maximum Switching Power: 2.366408e-04W

  - Average Switching Power: 3.359044e-07W

*Inverter switching analysis showing input/output voltages and power*

<img src='plot/trans_switching_response.png' alt='Switching Response' width='400'/>

### Delay Effect Simulations
- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed
  - Stage 1 Delay: 993.378ps

  - Stage 2 Delay: 1791.23ps

  - Stage 3 Delay: 1306.41ps

  - Total Delay: 5805.94ps
  - Transient sample interval: 10ps

*Delay effect analysis showing signal propagation through inverter chain*

<img src='plot/trans_delay_effect.png' alt='Delay Effect Analysis' width='400'/>

### Transient Simulations for Power Dissipation
- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed
  - Maximum Power at 27°C: 2.366408e-04W

  - Maximum Power at 100°C: 2.717405e-04W

  - Average Power at 27°C: 3.359044e-07W

  - Average Power at 100°C: 1.226144e-06W

  - Power Temperature Coefficient: 4.808183e-07W/°C

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

<img src='plot/trans_charge_conservation.png' alt='Charge Conservation Analysis' width='400'/>

*Total charge conservation analysis*

<img src='plot/trans_total_charge.png' alt='Total Charge' width='400'/>


## 5. AC Analysis
### Small-Signal Analysis
- [<span style='color: green'>✓</span>] AC small-signal simulations verified
  - Gate capacitance range: 63.67fF to 80.56fF
  - Frequency range: 1MHz to 1GHz
  - Max capacitance at: 0.00V

*CV characteristics showing gate capacitance variation with gate voltage*

<img src='plot/ac_cv_characteristics.png' alt='CV Characteristics' width='400'/>

Capacitance components (Cgb, Cgs, Cgd) variation with gate voltage*

<img src='plot/ac_cv_components.png' alt='CV Components' width='400'/>

### AC-Integral Large-Signal Capacitance
- [<span style='color: green'>✓</span>] Large-signal capacitances computed from AC C(V) integral
  - Path: Vg -0.8 → 1.2 V (ΔV=2.0)
  - Cgg source: Cgg_1MHz from cv_data.txt
  - Cgg_ls: 68.723756 fF
  - Cgs_ls: -12.709622 fF
  - Cgd_ls: -28.214006 fF
  - Cgb_ls: -27.800119 fF
  - Output: data/ac_ls_caps_from_cv_integral.csv
  - Output: data/ac_qg_from_cv_integral.csv
  - Per-gate-area (W*L) normalization available
    - Geometry: W=10 µm, L=1 µm, Area=10 µm²
    - Cgg_ls/Area: 6.872376 fF/µm²
    - Cgs_ls/Area: -1.270962 fF/µm²
    - Cgd_ls/Area: -2.821401 fF/µm²
    - Cgb_ls/Area: -2.780012 fF/µm²
    - Output: data/ac_ls_caps_from_cv_integral_per_gate_area.csv
    - Output: data/ac_cv_caps_1MHz_per_gate_area.csv

### S-Parameter Analysis
- [<span style='color: green'>✓</span>] High-frequency AC simulations verified
  - Frequency range: 1MHz to 1GHz
- [<span style='color: green'>✓</span>] S-parameter analysis verified
  - S11 range: -0.0112033dB to 0dB
  - S21 range: -107.588dB to -47.6033dB
  - S12 range: -95.0074dB to -35.0187dB
  - S22 range: -8.08595dB to -8.08426dB
- [<span style='color: green'>✓</span>] RF simulations verified
  - Isolation: >12.5846dB

*S-Parameter analysis showing frequency response characteristics*

<img src='plot/ac_cv_sparameter_analysis.png' alt='S-Parameters' width='400'/>

### Non-Quasi-Static Effects Analysis
- [<span style='color: green'>✓</span>] NQS effects verified
  - Maximum phase shift: 89.9988
  - Frequency range: 10MHz to 10GHz

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
  - Max Noise: 2.55e-09 V²/Hz
  - Min Noise: 5.60e-16 V²/Hz
  - Avg Noise: 2.32e-10 V²/Hz
  - Noise Floor: 2.53e-10 V²/Hz
  - Frequency Range: 1Hz to 1GHz

*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*

<img src='plot/noise_thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>

### Flicker Noise Analysis
- [<span style='color: green'>✓</span>] Flicker noise analysis completed
  - Coefficient (K): 2.75e-12
  - Exponent (γ): 1.35e-07 (ideally -1.0 for pure 1/f noise)
  - Correlation (R²): 0.4677
  - Corner Frequency: *Not measured*

*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*

<img src='plot/noise_flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>

### Short Noise Analysis
- [<span style='color: green'>✓</span>] Short noise analysis completed
  - Shot Noise Level: 6.30e-10 V²/Hz
  - Standard Deviation: 1.92e-15 V²/Hz
  - Variation Coefficient: 0.0000

*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*

<img src='plot/noise_shot_noise.png' alt='Shot Noise Analysis' width='400'/>

### Temperature Dependence
- [<span style='color: green'>✓</span>] Short noise analysis completed
  - Temperature Coefficient: 1.77e-12 V²/Hz/°C
  - Temperature-Noise Correlation: 0.8682361676012542
  - Temperature Range: -40.0°C to 150.0°C

*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*

<img src='plot/noise_vs_temperature.png' alt='Shot Noise Analysis' width='400'/>

### Bias Dependence
- [<span style='color: green'>✓</span>] Bias Dependance analysis completed
*Thermal Noise Results at Different Bias Points*

| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |
|----------------|-------------------|-------------------|-------------------|--------------------|
| Vgs=0.3V, Vds=0.3V | 1.80e-11 | 5.60e-16 | 9.14e-13 | 1.82e-12 |
| Vgs=0.3V, Vds=0.6V | 2.44e-11 | 5.02e-12 | 5.84e-12 | 6.47e-12 |
| Vgs=0.3V, Vds=0.9V | 2.55e-09 | 4.79e-10 | 6.31e-10 | 4.80e-10 |
| Vgs=0.3V, Vds=1.2V | 2.40e-09 | 6.30e-10 | 7.51e-10 | 6.30e-10 |
| Vgs=0.6V, Vds=0.3V | 1.79e-11 | 5.60e-16 | 9.11e-13 | 1.81e-12 |
| Vgs=0.6V, Vds=0.6V | 2.12e-11 | 2.75e-12 | 3.50e-12 | 4.23e-12 |

<!-- collection-run-integrity -->
## Run Integrity

- Model: `sky130__fd__pr__pfet__01v8__model__original`
- Model MD5: `7e27448bbc1843790a9c43dabc20f8c8`
- Simulator: `ngspice`
- Modes: `dc, transient, ac, noise`
- Started: `2026-07-29T16:59:07.624121+00:00`
- Finished: `2026-07-29T17:03:16.477377+00:00`
- Elapsed seconds: `248.853262`
- Peak resident memory KiB: `236664`
- Process return code: `0`
- Benchmark circuit: fixed, source-controlled simulator-native fixture; no circuit AST or netlist translation was used.
- Benchmark contract SHA-256: `8b8fd67ae3dd54834b283ee6d3f132cd79406c04868a9e13f5404c2e0a8b3931`
- Device-model handoff preserved model names, polarity, and every AST parameter; no fallback or parameter lowering was applied.
- Executed netlists: `netlist/dc`, `netlist/transient`, `netlist/ac`, and `netlist/noise` (simulator-native extensions).
- Plot inventory: `26` non-empty PNG files generated from simulator data.
