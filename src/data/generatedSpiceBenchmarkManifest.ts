// Auto-generated — 2026-07-21T11:12:02.995Z
// Runs: 11, Models: 11, Suites: 11
import type { SpiceBenchmarkManifest } from "./SpiceBenchmarkTypes";
export const SPICE_BENCHMARK_MANIFEST: SpiceBenchmarkManifest = {
  "generatedAt": "2026-07-21T11:12:02.984Z",
  "repoUrl": "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark",
  "runs": {
    "reference_results": {
      "runId": "reference_results",
      "status": "completed",
      "pdkId": "reference_results",
      "modelId": "reference_results",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "reference_results",
        "suiteName": "reference_results",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "42",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\n\nGenerated on: 2025-05-13 15:15:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Temperature Dependence](#temperature-dependence)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties](#physical-properties)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n   - [Transient Simulations for Power Dissipation](#transient-simulations-for-power-dissipation)\n   - [Quasi-Static Analysis](#quasi-static-analysis)\n   - [Charge Conservation Tests](#charge-conservation-tests)\n5. [AC Analysis](#5-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [High-Frequency Analysis](#high-frequency-analysis)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n   - [Temperature Dependence](#temperature-dependence-1)\n   - [Detailed Noise Characteristics](#detailed-noise-characteristics)\n7. [Geometry and Layout Analysis](#7-geometry-and-layout-analysis)\n   - [Geometry Dependence](#geometry-dependence)\n   - [Layout Effects](#layout-effects)\n\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n- Sections marked \"In Progress\" have not been implemented yet\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] DC circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/dc_circuit.cir\n- [<span style='color: green'>✓</span>] Transient circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/transient_circuit.cir\n- [<span style='color: green'>✓</span>] Noise circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/noise_circuit.cir\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-42\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [IV Characteristics](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | Range: 0.00V to 1.20V, -1.79e-02A to 2.87e-08A |\n| [Temperature Analysis](#temperature-dependence) | <span style='color: green'>✓</span> | Temp Coef: 0.000015 /°C |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 2.934e-05A, Rise Time: 0.1ps |\n| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 10.7ps |\n| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 25.0ps |\n| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -1.718433e-05W/°C |\n| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed |\n| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: 0.000000% |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Capacitance-Voltage](#small-signal-analysis) | <span style='color: green'>✓</span> | Range: 7.08fF to 13.98fF |\n| [Charge Conservation](#small-signal-analysis) | <span style='color: green'>✓</span> | Error: 3.8477522766233967e-07% |\n| [S-Parameter](#high-frequency-analysis) | <span style='color: green'>✓</span> | Frequency: 1.0MHz to 1.0GHz |\n| [Non-Quasi-Static](#high-frequency-analysis) | <span style='color: green'>✓</span> | Phase Shift: -176.581 |\n\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |\n| [Temperature Dependence](#temperature-dependence-1) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |\n| [Bias Dependence](#detailed-noise-characteristics) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range (0-5V)\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range (0-5V)\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -1.79e-02A to 2.87e-08A\n- [<span style='color: green'>✓</span>] Log scale measurements are valid (2+ decades)\n  - Decades: 8.71\n- [<span style='color: green'>✓</span>] Linear scale measurements are valid\n  - Points: 432\n  - Range: 0.00V to 0.35V\n- [<span style='color: green'>✓</span>] Multi-terminal current analysis is valid\n  - KCL Error: 6.39e-12A\n\n<img src='plots/iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n### Temperature Dependence\n- [<span style='color: green'>✓</span>] Temperature sweep is performed (-40°C to 150°C)\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -1.793e-02A to 2.870e-08A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n  - Temperature Coefficient: 1.48e-05A/°C\n\n<img src='plots/temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n*Temperature analysis showing current variation*\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy conservation verified\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device efficiency analyzed\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Power measurements complete\n- [<span style='color: green'>✓</span>] Temperature coefficient calculated\n  - Value: 8.34e-04/°C\n\n<img src='plots/kcl_verification.png' alt='KCL Verification' width='400'/>\n\n*KCL verification showing current balance*\n\n### Physical Properties\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n### Large-Signal Transient\n- [<span style='color: green'>✓</span>] Time-domain transient analysis completed\n  - Maximum Drain Current: 2.934381e-05A\n  - Gate Voltage Rise Time: 0.1ps\n\n<img src='plots/large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>\n\n*Large-signal transient analysis showing voltages and current response*\n\n### Switching Simulations\n- [<span style='color: green'>✓</span>] Inverter switching behavior analyzed\n  - Propagation Delay: 10.7ps\n  - Maximum Switching Power: 5.659051e-03W\n  - Average Switching Power: 1.470466e-03W\n\n<img src='plots/switching_response.png' alt='Switching Response' width='400'/>\n\n*Inverter switching analysis showing input/output voltages and power*\n\n### Delay Effect Simulations\n- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed\n  - Stage 1 Delay: 13.7ps\n  - Stage 2 Delay: 6.1ps\n  - Stage 3 Delay: 5.1ps\n  - Total Chain Delay: 25.0ps\n\n<img src='plots/delay_effect.png' alt='Delay Effect Analysis' width='400'/>\n\n*Delay effect analysis showing signal propagation through inverter chain*\n\n### Transient Simulations for Power Dissipation\n- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed\n  - Maximum Power at 27°C: 5.659051e-03W\n  - Maximum Power at 100°C: 4.404595e-03W\n  - Average Power at 27°C: 1.470466e-03W\n  - Average Power at 100°C: 1.017077e-03W\n  - Power Temperature Coefficient: -1.718433e-05W/°C\n\n<img src='plots/power_dissipation.png' alt='Power Dissipation' width='400'/>\n\n*Power dissipation analysis at different temperatures*\n\n<img src='plots/energy_consumption.png' alt='Energy Consumption' width='400'/>\n\n*Energy consumption analysis at different temperatures*\n\n### Quasi-Static Analysis\n- [<span style='color: green'>✓</span>] Quasi-static behavior analyzed\n  - Performed quasi-static transient analysis with slower rise/fall times\n  - Analyzed relationship between gate voltage and drain current\n\n<img src='plots/quasi_static.png' alt='Quasi-Static Analysis' width='400'/>\n\n*Quasi-static time-domain behavior analysis*\n\n<img src='plots/quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>\n\n*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*\n\n### Charge Conservation Tests\n- [<span style='color: green'>✓</span>] Charge conservation analyzed\n  - Total Charge Variation: 3.184928e-18C\n  - Mean Total Charge: 3.718811e-19C\n  - Charge Conservation Error: 0.000000%\n\n<img src='plots/charge_conservation.png' alt='Charge Conservation Analysis' width='400'/>\n\n*Terminal currents and charges analysis*\n\n<img src='plots/total_charge.png' alt='Total Charge' width='400'/>\n\n*Total charge conservation analysis*\n\n## 5. AC Analysis\n### Small-Signal Analysis\n- [<span style='color: green'>✓</span>] AC small-signal simulations completed\n  - Range: 7.08fF to 13.98fF\n- [<span style='color: green'>✓</span>] Capacitance-voltage (C-V) measurements analyzed\n  - Max Value at: 1.20V\n- [<span style='color: green'>✓</span>] Charge conservation tests completed\n  - Conservation Error: 3.8477522766233967e-07%\n\n<img src='plots/cv_characteristics.png' alt='CV Characteristics' width='400'/>\n\n*CV characteristics showing gate capacitance variation with gate voltage*\n\n<img src='plots/cv_components.png' alt='CV Components' width='400'/>\n\n*Capacitance components (Cgb, Cgs, Cgd) variation with gate voltage*\n\n### High-Frequency Analysis\n- [<span style='color: green'>✓</span>] High-frequency AC simulations completed\n  - Frequency Range: 1.0MHz to 1.0GHz\n- [<span style='color: green'>✓</span>] S-parameter analysis completed\n  - S11: -2dB to -1dB\n  - S21: -26dB to -22dB\n- [<span style='color: green'>✓</span>] RF simulations completed\n  - Isolation: >-10dB\n- [<span style='color: green'>✓</span>] Non-quasi-static effects analyzed\n  - Max Phase Shift: -176.581\n\n<img src='plots/sparameter_analysis.png' alt='S-Parameter Analysis' width='400'/>\n\n*S-Parameter analysis showing frequency response characteristics*\n\n<img src='plots/nqs_effects.png' alt='Non-Quasi-Static Effects' width='400'/>\n\n*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*\n\n\n## 6. Noise Analysis\n### Thermal Noise Analysis\n\n<img src='plots/thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>\n\n*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*\n\n#### Flicker Noise Analysis\n\n<img src='plots/flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>\n\n*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*\n\n#### Shot Noise Analysis\n\n<img src='plots/shot_noise.png' alt='Shot Noise Analysis' width='400'/>\n\n*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*\n\n#### Temperature Dependence\n\n<img src='plots/noise_vs_temperature.png' alt='Noise vs Temperature' width='400'/>\n\n*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*\n\n### Detailed Noise Characteristics\n- [<span style='color: green'>✓</span>] Thermal noise analysis completed\n  - Max Noise: 1.00e+09 V²/Hz\n  - Min Noise: 2.16e-15 V²/Hz\n  - Avg Noise: 2.54e+07 V²/Hz\n  - Noise Floor: 2.65e+07 V²/Hz\n  - Frequency Range: 1.00e+00 to 1.00e+09 Hz\n\n#### Thermal Noise Results at Different Bias Points\n\n| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |\n|----------------|-------------------|-------------------|-------------------|--------------------|\n| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n\n- [<span style='color: green'>✓</span>] Flicker (1/f) noise analysis completed\n  - Coefficient (K): 4.68e-08\n  - Exponent (γ): 0.5075 (ideally -1.0 for pure 1/f noise)\n  - Correlation (R²): 0.8265\n  - Corner Frequency: 1.12e+00 Hz\n\n- [<span style='color: green'>✓</span>] Shot noise analysis completed\n  - Shot Noise Level: 3.79e-09 V²/Hz\n  - Standard Deviation: 5.56e-09 V²/Hz\n  - Variation Coefficient: 1.4676\n\n- [<span style='color: green'>✓</span>] Temperature dependence analysis completed\n  - Temperature Coefficient: 2.77e-11 V²/Hz/°C\n  - Temperature-Noise Correlation: None\n  - Temperature Range: -40.0°C to 150.0°C\n\n## 7. Geometry and Layout Analysis\n### Geometry Dependence\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Monte Carlo simulations for geometry variations: *In Progress*\n- <span style='color: gray'>✗</span> Layout-dependent effect (LDE) simulations: *In Progress*\n\n### Layout Effects\n- <span style='color: gray'>✗</span> Layout-dependent simulations: *In Progress*\n- <span style='color: gray'>✗</span> Stress effect simulations: *In Progress*\n- <span style='color: gray'>✗</span> Proximity effect simulations: *In Progress*\n- <span style='color: gray'>✗</span> Parasitic extraction: *In Progress*\n- <span style='color: gray'>✗</span> RC extraction simulations: *In Progress*\n",
        "simulator": "ngspice",
        "simulatorVersion": "42",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "IV Characteristics",
          "status": "pass",
          "detail": "Range: 0.00V to 1.20V, -1.79e-02A to 2.87e-08A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Coef: 0.000015 /°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W"
        },
        {
          "testId": "transient_4",
          "domain": "transient",
          "name": "Large-Signal Transient",
          "status": "pass",
          "detail": "Max Current: 2.934e-05A, Rise Time: 0.1ps"
        },
        {
          "testId": "transient_5",
          "domain": "transient",
          "name": "Switching Simulations",
          "status": "pass",
          "detail": "Propagation Delay: 10.7ps"
        },
        {
          "testId": "transient_6",
          "domain": "transient",
          "name": "Delay Effect",
          "status": "pass",
          "detail": "Total Chain Delay: 25.0ps"
        },
        {
          "testId": "transient_7",
          "domain": "transient",
          "name": "Power Dissipation",
          "status": "pass",
          "detail": "Temp Coeff: -1.718433e-05W/°C"
        },
        {
          "testId": "transient_8",
          "domain": "transient",
          "name": "Quasi-Static Analysis",
          "status": "pass",
          "detail": "I-V characteristics analyzed"
        },
        {
          "testId": "transient_9",
          "domain": "transient",
          "name": "Charge Conservation",
          "status": "pass",
          "detail": "Error: 0.000000%"
        },
        {
          "testId": "ac_10",
          "domain": "ac",
          "name": "Capacitance-Voltage",
          "status": "pass",
          "detail": "Range: 7.08fF to 13.98fF"
        },
        {
          "testId": "ac_11",
          "domain": "ac",
          "name": "Charge Conservation",
          "status": "pass",
          "detail": "Error: 3.8477522766233967e-07%"
        },
        {
          "testId": "ac_12",
          "domain": "ac",
          "name": "S-Parameter",
          "status": "pass",
          "detail": "Frequency: 1.0MHz to 1.0GHz"
        },
        {
          "testId": "ac_13",
          "domain": "ac",
          "name": "Non-Quasi-Static",
          "status": "pass",
          "detail": "Phase Shift: -176.581"
        },
        {
          "testId": "noise_14",
          "domain": "noise",
          "name": "Thermal Noise",
          "status": "pass",
          "detail": "Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz"
        },
        {
          "testId": "noise_15",
          "domain": "noise",
          "name": "Flicker (1/f) Noise",
          "status": "pass",
          "detail": "Exponent: 0.5075, Corner Freq: 1.12e+00 Hz"
        },
        {
          "testId": "noise_16",
          "domain": "noise",
          "name": "Shot Noise",
          "status": "pass",
          "detail": "Level: 3.79e-09 V²/Hz, Variation: 1.4676"
        },
        {
          "testId": "noise_17",
          "domain": "noise",
          "name": "Temperature Dependence",
          "status": "pass",
          "detail": "Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C"
        },
        {
          "testId": "noise_18",
          "domain": "noise",
          "name": "Bias Dependence",
          "status": "pass",
          "detail": "Analyzed at 6 bias points"
        },
        {
          "testId": "setup_19",
          "domain": "overview",
          "name": "DC circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_20",
          "domain": "overview",
          "name": "Transient circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_21",
          "domain": "overview",
          "name": "Noise circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_22",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_23",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "548 B",
          "hash": "09f8b80d",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/bias_point_data_09f8b80d.json",
          "rawUrl": "benchmark/reference_results/data/bias_point_data_09f8b80d.txt",
          "metadata": {}
        },
        {
          "name": "charge_conservation.txt",
          "relPath": "data/charge_conservation.txt",
          "domain": "overview",
          "format": "txt",
          "size": "130.4 KB",
          "hash": "847652fc",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 5542,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/charge_conservation_847652fc.json",
          "rawUrl": "benchmark/reference_results/data/charge_conservation_847652fc.txt",
          "metadata": {}
        },
        {
          "name": "cv_data.txt",
          "relPath": "data/cv_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "3.7 KB",
          "hash": "5eec3676",
          "columns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/cv_data_5eec3676.json",
          "rawUrl": "benchmark/reference_results/data/cv_data_5eec3676.txt",
          "metadata": {}
        },
        {
          "name": "flicker_noise.txt",
          "relPath": "data/flicker_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "c6988c54",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/flicker_noise_c6988c54.json",
          "rawUrl": "benchmark/reference_results/data/flicker_noise_c6988c54.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "99e090ce",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/iv_data_-40_99e090ce.json",
          "rawUrl": "benchmark/reference_results/data/iv_data_-40_99e090ce.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "cfca6f39",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/iv_data_0_cfca6f39.json",
          "rawUrl": "benchmark/reference_results/data/iv_data_0_cfca6f39.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "c68c9ff4",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/iv_data_100_c68c9ff4.json",
          "rawUrl": "benchmark/reference_results/data/iv_data_100_c68c9ff4.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "c2440f01",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/iv_data_150_c2440f01.json",
          "rawUrl": "benchmark/reference_results/data/iv_data_150_c2440f01.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "3a52fb59",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/iv_data_25_3a52fb59.json",
          "rawUrl": "benchmark/reference_results/data/iv_data_25_3a52fb59.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "9eaaa012",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/iv_data_50_9eaaa012.json",
          "rawUrl": "benchmark/reference_results/data/iv_data_50_9eaaa012.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp-40.txt",
          "relPath": "data/noise_temp-40.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "0ac5d294",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/noise_temp-40_0ac5d294.json",
          "rawUrl": "benchmark/reference_results/data/noise_temp-40_0ac5d294.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp0.txt",
          "relPath": "data/noise_temp0.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "0ac5d294",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/noise_temp0_0ac5d294.json",
          "rawUrl": "benchmark/reference_results/data/noise_temp0_0ac5d294.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp100.txt",
          "relPath": "data/noise_temp100.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "0ac5d294",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/noise_temp100_0ac5d294.json",
          "rawUrl": "benchmark/reference_results/data/noise_temp100_0ac5d294.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp150.txt",
          "relPath": "data/noise_temp150.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "0ac5d294",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/noise_temp150_0ac5d294.json",
          "rawUrl": "benchmark/reference_results/data/noise_temp150_0ac5d294.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp27.txt",
          "relPath": "data/noise_temp27.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "0ac5d294",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/noise_temp27_0ac5d294.json",
          "rawUrl": "benchmark/reference_results/data/noise_temp27_0ac5d294.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp50.txt",
          "relPath": "data/noise_temp50.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "0ac5d294",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/noise_temp50_0ac5d294.json",
          "rawUrl": "benchmark/reference_results/data/noise_temp50_0ac5d294.txt",
          "metadata": {}
        },
        {
          "name": "nqs_effects.txt",
          "relPath": "data/nqs_effects.txt",
          "domain": "ac",
          "format": "txt",
          "size": "180 B",
          "hash": "849ea1c6",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "rowCount": 4,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/nqs_effects_849ea1c6.json",
          "rawUrl": "benchmark/reference_results/data/nqs_effects_849ea1c6.txt",
          "metadata": {}
        },
        {
          "name": "shot_noise.txt",
          "relPath": "data/shot_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "6e5c297a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/shot_noise_6e5c297a.json",
          "rawUrl": "benchmark/reference_results/data/shot_noise_6e5c297a.txt",
          "metadata": {}
        },
        {
          "name": "sparams_data.txt",
          "relPath": "data/sparams_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "286 B",
          "hash": "9c16f21a",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "rowCount": 4,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/sparams_data_9c16f21a.json",
          "rawUrl": "benchmark/reference_results/data/sparams_data_9c16f21a.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "772f68e1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds0.3_772f68e1.json",
          "rawUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds0.3_772f68e1.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "772f68e1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds0.6_772f68e1.json",
          "rawUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds0.6_772f68e1.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.9.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.9.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "772f68e1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds0.9_772f68e1.json",
          "rawUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds0.9_772f68e1.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds1.2.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds1.2.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "772f68e1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds1.2_772f68e1.json",
          "rawUrl": "benchmark/reference_results/data/thermal_noise_vgs0.3_vds1.2_772f68e1.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "772f68e1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/thermal_noise_vgs0.6_vds0.3_772f68e1.json",
          "rawUrl": "benchmark/reference_results/data/thermal_noise_vgs0.6_vds0.3_772f68e1.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "772f68e1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/thermal_noise_vgs0.6_vds0.6_772f68e1.json",
          "rawUrl": "benchmark/reference_results/data/thermal_noise_vgs0.6_vds0.6_772f68e1.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "5802.0 KB",
          "hash": "24ee01bf",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "ig_charge",
            "id_charge",
            "is_charge",
            "ib_charge",
            "i_total",
            "qg_approx",
            "qd_approx",
            "qs_approx",
            "qb_approx",
            "q_total"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "ig_charge",
            "id_charge",
            "is_charge",
            "ib_charge",
            "i_total",
            "qg_approx",
            "qd_approx",
            "qs_approx",
            "qb_approx",
            "q_total"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_charge_24ee01bf.json",
          "rawUrl": "benchmark/reference_results/data/tran_charge_24ee01bf.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2692.8 KB",
          "hash": "8baf8632",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_delay_8baf8632.json",
          "rawUrl": "benchmark/reference_results/data/tran_delay_8baf8632.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3581.1 KB",
          "hash": "03a2abe7",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_large_signal_03a2abe7.json",
          "rawUrl": "benchmark/reference_results/data/tran_large_signal_03a2abe7.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2654.0 KB",
          "hash": "5fff07c4",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 28016,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_power_100C_5fff07c4.json",
          "rawUrl": "benchmark/reference_results/data/tran_power_100C_5fff07c4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2692.8 KB",
          "hash": "b674199e",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_power_27C_b674199e.json",
          "rawUrl": "benchmark/reference_results/data/tran_power_27C_b674199e.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "8146.5 KB",
          "hash": "cec7884c",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "id_qs"
          ],
          "rowCount": 102987,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "id_qs"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_quasi_static_cec7884c.json",
          "rawUrl": "benchmark/reference_results/data/tran_quasi_static_cec7884c.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2248.6 KB",
          "hash": "04f0f9c5",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_switching_04f0f9c5.json",
          "rawUrl": "benchmark/reference_results/data/tran_switching_04f0f9c5.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1360.3 KB",
          "hash": "5f6a2bbe",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/reference_results/data/tran_switching_power_5f6a2bbe.json",
          "rawUrl": "benchmark/reference_results/data/tran_switching_power_5f6a2bbe.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "charge_conservation.png",
          "relPath": "plots/charge_conservation.png",
          "domain": "overview",
          "format": "png",
          "size": "493.1 KB",
          "displayUrl": "benchmark/reference_results/plots/charge_conservation_8537b1f5.png"
        },
        {
          "name": "cv_characteristics.png",
          "relPath": "plots/cv_characteristics.png",
          "domain": "overview",
          "format": "png",
          "size": "155.1 KB",
          "displayUrl": "benchmark/reference_results/plots/cv_characteristics_54ad29bc.png"
        },
        {
          "name": "cv_components.png",
          "relPath": "plots/cv_components.png",
          "domain": "overview",
          "format": "png",
          "size": "240.5 KB",
          "displayUrl": "benchmark/reference_results/plots/cv_components_b0763246.png"
        },
        {
          "name": "cv_multifreq_characteristics.png",
          "relPath": "plots/cv_multifreq_characteristics.png",
          "domain": "overview",
          "format": "png",
          "size": "232.2 KB",
          "displayUrl": "benchmark/reference_results/plots/cv_multifreq_characteristics_1a753823.png"
        },
        {
          "name": "delay_effect.png",
          "relPath": "plots/delay_effect.png",
          "domain": "transient",
          "format": "png",
          "size": "145.3 KB",
          "displayUrl": "benchmark/reference_results/plots/delay_effect_2b75b9da.png"
        },
        {
          "name": "energy_consumption.png",
          "relPath": "plots/energy_consumption.png",
          "domain": "overview",
          "format": "png",
          "size": "136.6 KB",
          "displayUrl": "benchmark/reference_results/plots/energy_consumption_5d386f74.png"
        },
        {
          "name": "flicker_noise.png",
          "relPath": "plots/flicker_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "210.3 KB",
          "displayUrl": "benchmark/reference_results/plots/flicker_noise_8992dd34.png"
        },
        {
          "name": "iv_characteristics.png",
          "relPath": "plots/iv_characteristics.png",
          "domain": "overview",
          "format": "png",
          "size": "1230.2 KB",
          "displayUrl": "benchmark/reference_results/plots/iv_characteristics_44e599f9.png"
        },
        {
          "name": "kcl_verification.png",
          "relPath": "plots/kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "310.8 KB",
          "displayUrl": "benchmark/reference_results/plots/kcl_verification_9a99adfa.png"
        },
        {
          "name": "large_signal_transient.png",
          "relPath": "plots/large_signal_transient.png",
          "domain": "overview",
          "format": "png",
          "size": "261.1 KB",
          "displayUrl": "benchmark/reference_results/plots/large_signal_transient_d41850d1.png"
        },
        {
          "name": "noise_components.png",
          "relPath": "plots/noise_components.png",
          "domain": "noise",
          "format": "png",
          "size": "283.6 KB",
          "displayUrl": "benchmark/reference_results/plots/noise_components_d2a1aff6.png"
        },
        {
          "name": "noise_vs_temperature.png",
          "relPath": "plots/noise_vs_temperature.png",
          "domain": "noise",
          "format": "png",
          "size": "135.6 KB",
          "displayUrl": "benchmark/reference_results/plots/noise_vs_temperature_2dc5b178.png"
        },
        {
          "name": "nqs_effects.png",
          "relPath": "plots/nqs_effects.png",
          "domain": "overview",
          "format": "png",
          "size": "387.6 KB",
          "displayUrl": "benchmark/reference_results/plots/nqs_effects_dd0638f7.png"
        },
        {
          "name": "power_dissipation.png",
          "relPath": "plots/power_dissipation.png",
          "domain": "overview",
          "format": "png",
          "size": "123.3 KB",
          "displayUrl": "benchmark/reference_results/plots/power_dissipation_c61c1c94.png"
        },
        {
          "name": "quasi_static.png",
          "relPath": "plots/quasi_static.png",
          "domain": "overview",
          "format": "png",
          "size": "291.2 KB",
          "displayUrl": "benchmark/reference_results/plots/quasi_static_0aabed45.png"
        },
        {
          "name": "quasi_static_iv.png",
          "relPath": "plots/quasi_static_iv.png",
          "domain": "dc",
          "format": "png",
          "size": "128.0 KB",
          "displayUrl": "benchmark/reference_results/plots/quasi_static_iv_1c03fffe.png"
        },
        {
          "name": "shot_noise.png",
          "relPath": "plots/shot_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "210.2 KB",
          "displayUrl": "benchmark/reference_results/plots/shot_noise_97f69a58.png"
        },
        {
          "name": "sparameter_analysis.png",
          "relPath": "plots/sparameter_analysis.png",
          "domain": "ac",
          "format": "png",
          "size": "460.4 KB",
          "displayUrl": "benchmark/reference_results/plots/sparameter_analysis_ea6bfba2.png"
        },
        {
          "name": "switching_response.png",
          "relPath": "plots/switching_response.png",
          "domain": "transient",
          "format": "png",
          "size": "333.8 KB",
          "displayUrl": "benchmark/reference_results/plots/switching_response_d9430ed0.png"
        },
        {
          "name": "temperature_analysis.png",
          "relPath": "plots/temperature_analysis.png",
          "domain": "overview",
          "format": "png",
          "size": "268.4 KB",
          "displayUrl": "benchmark/reference_results/plots/temperature_analysis_8afe0802.png"
        },
        {
          "name": "thermal_noise.png",
          "relPath": "plots/thermal_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "210.9 KB",
          "displayUrl": "benchmark/reference_results/plots/thermal_noise_84c213c5.png"
        },
        {
          "name": "thermal_noise_vds_comparison.png",
          "relPath": "plots/thermal_noise_vds_comparison.png",
          "domain": "noise",
          "format": "png",
          "size": "282.5 KB",
          "displayUrl": "benchmark/reference_results/plots/thermal_noise_vds_comparison_5a42555d.png"
        },
        {
          "name": "total_charge.png",
          "relPath": "plots/total_charge.png",
          "domain": "overview",
          "format": "png",
          "size": "186.8 KB",
          "displayUrl": "benchmark/reference_results/plots/total_charge_39be7199.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "15.5 KB",
          "hash": "6dfe1254",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\n\nGenerated on: 2025-05-13 15:15:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Temperature Dependence](#temperature-dependence)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties](#physical-properties)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n   - [Transient Simulations for Power Dissipation](#transient-simulations-for-power-dissipation)\n   - [Quasi-Static Analysis](#quasi-static-analysis)\n   - [Charge Conservation Tests](#charge-conservation-tests)\n5. [AC Analysis](#5-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [High-Frequency Analysis](#high-frequency-analysis)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n   - [Temperature Dependence](#temperature-dependence-1)\n   - [Detailed Noise Characteristics](#detailed-noise-characteristics)\n7. [Geometry and Layout Analysis](#7-geometry-and-layout-analysis)\n   - [Geometry Dependence](#geometry-dependence)\n   - [Layout Effects](#layout-effects)\n\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n- Sections marked \"In Progress\" have not been implemented yet\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] DC circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/dc_circuit.cir\n- [<span style='color: green'>✓</span>] Transient circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/transient_circuit.cir\n- [<span style='color: green'>✓</span>] Noise circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/noise_circuit.cir\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-42\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [IV Characteristics](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | Range: 0.00V to 1.20V, -1.79e-02A to 2.87e-08A |\n| [Temperature Analysis](#temperature-dependence) | <span style='color: green'>✓</span> | Temp Coef: 0.000015 /°C |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 2.934e-05A, Rise Time: 0.1ps |\n| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 10.7ps |\n| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 25.0ps |\n| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -1.718433e-05W/°C |\n| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed |\n| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: 0.000000% |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Capacitance-Voltage](#small-signal-analysis) | <span style='color: green'>✓</span> | Range: 7.08fF to 13.98fF |\n| [Charge Conservation](#small-signal-analysis) | <span style='color: green'>✓</span> | Error: 3.8477522766233967e-07% |\n| [S-Parameter](#high-frequency-analysis) | <span style='color: green'>✓</span> | Frequency: 1.0MHz to 1.0GHz |\n| [Non-Quasi-Static](#high-frequency-analysis) | <span style='color: green'>✓</span> | Phase Shift: -176.581 |\n\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |\n| [Temperature Dependence](#temperature-dependence-1) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |\n| [Bias Dependence](#detailed-noise-characteristics) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range (0-5V)\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range (0-5V)\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -1.79e-02A to 2.87e-08A\n- [<span style='color: green'>✓</span>] Log scale measurements are valid (2+ decades)\n  - Decades: 8.71\n- [<span style='color: green'>✓</span>] Linear scale measurements are valid\n  - Points: 432\n  - Range: 0.00V to 0.35V\n- [<span style='color: green'>✓</span>] Multi-terminal current analysis is valid\n  - KCL Error: 6.39e-12A\n\n<img src='plots/iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n### Temperature Dependence\n- [<span style='color: green'>✓</span>] Temperature sweep is performed (-40°C to 150°C)\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -1.793e-02A to 2.870e-08A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n  - Temperature Coefficient: 1.48e-05A/°C\n\n<img src='plots/temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n*Temperature analysis showing current variation*\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy conservation verified\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device efficiency analyzed\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Power measurements complete\n- [<span style='color: green'>✓</span>] Temperature coefficient calculated\n  - Value: 8.34e-04/°C\n\n<img src='plots/kcl_verification.png' alt='KCL Verification' width='400'/>\n\n*KCL verification showing current balance*\n\n### Physical Properties\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n### Large-Signal Transient\n- [<span style='color: green'>✓</span>] Time-domain transient analysis completed\n  - Maximum Drain Current: 2.934381e-05A\n  - Gate Voltage Rise Time: 0.1ps\n\n<img src='plots/large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>\n\n*Large-signal transient analysis showing voltages and current response*\n\n### Switching Simulations\n- [<span style='color: green'>✓</span>] Inverter switching behavior analyzed\n  - Propagation Delay: 10.7ps\n  - Maximum Switching Power: 5.659051e-03W\n  - Average Switching Power: 1.470466e-03W\n\n<img src='plots/switching_response.png' alt='Switching Response' width='400'/>\n\n*Inverter switching analysis showing input/output voltages and power*\n\n### Delay Effect Simulations\n- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed\n  - Stage 1 Delay: 13.7ps\n  - Stage 2 Delay: 6.1ps\n  - Stage 3 Delay: 5.1ps\n  - Total Chain Delay: 25.0ps\n\n<img src='plots/delay_effect.png' alt='Delay Effect Analysis' width='400'/>\n\n*Delay effect analysis showing signal propagation through inverter chain*\n\n### Transient Simulations for Power Dissipation\n- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed\n  - Maximum Power at 27°C: 5.659051e-03W\n  - Maximum Power at 100°C: 4.404595e-03W\n  - Average Power at 27°C: 1.470466e-03W\n  - Average Power at 100°C: 1.017077e-03W\n  - Power Temperature Coefficient: -1.718433e-05W/°C\n\n<img src='plots/power_dissipation.png' alt='Power Dissipation' width='400'/>\n\n*Power dissipation analysis at different temperatures*\n\n<img src='plots/energy_consumption.png' alt='Energy Consumption' width='400'/>\n\n*Energy consumption analysis at different temperatures*\n\n### Quasi-Static Analysis\n- [<span style='color: green'>✓</span>] Quasi-static behavior analyzed\n  - Performed quasi-static transient analysis with slower rise/fall times\n  - Analyzed relationship between gate voltage and drain current\n\n<img src='plots/quasi_static.png' alt='Quasi-Static Analysis' width='400'/>\n\n*Quasi-static time-domain behavior analysis*\n\n<img src='plots/quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>\n\n*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*\n\n### Charge Conservation Tests\n- [<span style='color: green'>✓</span>] Charge conservation analyzed\n  - Total Charge Variation: 3.184928e-18C\n  - Mean Total Charge: 3.718811e-19C\n  - Charge Conservation Error: 0.000000%\n\n<img src='plots/charge_conservation.png' alt='Charge Conservation Analysis' width='400'/>\n\n*Terminal currents and charges analysis*\n\n<img src='plots/total_charge.png' alt='Total Charge' width='400'/>\n\n*Total charge conservation analysis*\n\n## 5. AC Analysis\n### Small-Signal Analysis\n- [<span style='color: green'>✓</span>] AC small-signal simulations completed\n  - Range: 7.08fF to 13.98fF\n- [<span style='color: green'>✓</span>] Capacitance-voltage (C-V) measurements analyzed\n  - Max Value at: 1.20V\n- [<span style='color: green'>✓</span>] Charge conservation tests completed\n  - Conservation Error: 3.8477522766233967e-07%\n\n<img src='plots/cv_characteristics.png' alt='CV Characteristics' width='400'/>\n\n*CV characteristics showing gate capacitance variation with gate voltage*\n\n<img src='plots/cv_components.png' alt='CV Components' width='400'/>\n\n*Capacitance components (Cgb, Cgs, Cgd) variation with gate voltage*\n\n### High-Frequency Analysis\n- [<span style='color: green'>✓</span>] High-frequency AC simulations completed\n  - Frequency Range: 1.0MHz to 1.0GHz\n- [<span style='color: green'>✓</span>] S-parameter analysis completed\n  - S11: -2dB to -1dB\n  - S21: -26dB to -22dB\n- [<span style='color: green'>✓</span>] RF simulations completed\n  - Isolation: >-10dB\n- [<span style='color: green'>✓</span>] Non-quasi-static effects analyzed\n  - Max Phase Shift: -176.581\n\n<img src='plots/sparameter_analysis.png' alt='S-Parameter Analysis' width='400'/>\n\n*S-Parameter analysis showing frequency response characteristics*\n\n<img src='plots/nqs_effects.png' alt='Non-Quasi-Static Effects' width='400'/>\n\n*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*\n\n\n## 6. Noise Analysis\n### Thermal Noise Analysis\n\n<img src='plots/thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>\n\n*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*\n\n#### Flicker Noise Analysis\n\n<img src='plots/flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>\n\n*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*\n\n#### Shot Noise Analysis\n\n<img src='plots/shot_noise.png' alt='Shot Noise Analysis' width='400'/>\n\n*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*\n\n#### Temperature Dependence\n\n<img src='plots/noise_vs_temperature.png' alt='Noise vs Temperature' width='400'/>\n\n*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*\n\n### Detailed Noise Characteristics\n- [<span style='color: green'>✓</span>] Thermal noise analysis completed\n  - Max Noise: 1.00e+09 V²/Hz\n  - Min Noise: 2.16e-15 V²/Hz\n  - Avg Noise: 2.54e+07 V²/Hz\n  - Noise Floor: 2.65e+07 V²/Hz\n  - Frequency Range: 1.00e+00 to 1.00e+09 Hz\n\n#### Thermal Noise Results at Different Bias Points\n\n| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |\n|----------------|-------------------|-------------------|-------------------|--------------------|\n| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n\n- [<span style='color: green'>✓</span>] Flicker (1/f) noise analysis completed\n  - Coefficient (K): 4.68e-08\n  - Exponent (γ): 0.5075 (ideally -1.0 for pure 1/f noise)\n  - Correlation (R²): 0.8265\n  - Corner Frequency: 1.12e+00 Hz\n\n- [<span style='color: green'>✓</span>] Shot noise analysis completed\n  - Shot Noise Level: 3.79e-09 V²/Hz\n  - Standard Deviation: 5.56e-09 V²/Hz\n  - Variation Coefficient: 1.4676\n\n- [<span style='color: green'>✓</span>] Temperature dependence analysis completed\n  - Temperature Coefficient: 2.77e-11 V²/Hz/°C\n  - Temperature-Noise Correlation: None\n  - Temperature Range: -40.0°C to 150.0°C\n\n## 7. Geometry and Layout Analysis\n### Geometry Dependence\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Monte Carlo simulations for geometry variations: *In Progress*\n- <span style='color: gray'>✗</span> Layout-dependent effect (LDE) simulations: *In Progress*\n\n### Layout Effects\n- <span style='color: gray'>✗</span> Layout-dependent simulations: *In Progress*\n- <span style='color: gray'>✗</span> Stress effect simulations: *In Progress*\n- <span style='color: gray'>✗</span> Proximity effect simulations: *In Progress*\n- <span style='color: gray'>✗</span> Parasitic extraction: *In Progress*\n- <span style='color: gray'>✗</span> RC extraction simulations: *In Progress*\n",
            "simulator": "ngspice",
            "simulatorVersion": "42",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "IV Characteristics",
                "status": "pass",
                "detail": "Range: 0.00V to 1.20V, -1.79e-02A to 2.87e-08A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Coef: 0.000015 /°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W"
              },
              {
                "testId": "transient_4",
                "domain": "transient",
                "name": "Large-Signal Transient",
                "status": "pass",
                "detail": "Max Current: 2.934e-05A, Rise Time: 0.1ps"
              },
              {
                "testId": "transient_5",
                "domain": "transient",
                "name": "Switching Simulations",
                "status": "pass",
                "detail": "Propagation Delay: 10.7ps"
              },
              {
                "testId": "transient_6",
                "domain": "transient",
                "name": "Delay Effect",
                "status": "pass",
                "detail": "Total Chain Delay: 25.0ps"
              },
              {
                "testId": "transient_7",
                "domain": "transient",
                "name": "Power Dissipation",
                "status": "pass",
                "detail": "Temp Coeff: -1.718433e-05W/°C"
              },
              {
                "testId": "transient_8",
                "domain": "transient",
                "name": "Quasi-Static Analysis",
                "status": "pass",
                "detail": "I-V characteristics analyzed"
              },
              {
                "testId": "transient_9",
                "domain": "transient",
                "name": "Charge Conservation",
                "status": "pass",
                "detail": "Error: 0.000000%"
              },
              {
                "testId": "ac_10",
                "domain": "ac",
                "name": "Capacitance-Voltage",
                "status": "pass",
                "detail": "Range: 7.08fF to 13.98fF"
              },
              {
                "testId": "ac_11",
                "domain": "ac",
                "name": "Charge Conservation",
                "status": "pass",
                "detail": "Error: 3.8477522766233967e-07%"
              },
              {
                "testId": "ac_12",
                "domain": "ac",
                "name": "S-Parameter",
                "status": "pass",
                "detail": "Frequency: 1.0MHz to 1.0GHz"
              },
              {
                "testId": "ac_13",
                "domain": "ac",
                "name": "Non-Quasi-Static",
                "status": "pass",
                "detail": "Phase Shift: -176.581"
              },
              {
                "testId": "noise_14",
                "domain": "noise",
                "name": "Thermal Noise",
                "status": "pass",
                "detail": "Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz"
              },
              {
                "testId": "noise_15",
                "domain": "noise",
                "name": "Flicker (1/f) Noise",
                "status": "pass",
                "detail": "Exponent: 0.5075, Corner Freq: 1.12e+00 Hz"
              },
              {
                "testId": "noise_16",
                "domain": "noise",
                "name": "Shot Noise",
                "status": "pass",
                "detail": "Level: 3.79e-09 V²/Hz, Variation: 1.4676"
              },
              {
                "testId": "noise_17",
                "domain": "noise",
                "name": "Temperature Dependence",
                "status": "pass",
                "detail": "Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C"
              },
              {
                "testId": "noise_18",
                "domain": "noise",
                "name": "Bias Dependence",
                "status": "pass",
                "detail": "Analyzed at 6 bias points"
              },
              {
                "testId": "setup_19",
                "domain": "overview",
                "name": "DC circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_20",
                "domain": "overview",
                "name": "Transient circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_21",
                "domain": "overview",
                "name": "Noise circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_22",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_23",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results": {
      "runId": "results",
      "status": "completed",
      "pdkId": "results",
      "modelId": "results",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results",
        "suiteName": "results",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "36",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2025-06-12 17:29:42\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /mnt/d/proj/spice_model_benchmark/netlists/dc_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/transient_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/noise_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/ac_circuit.cir\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-36\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.79e-02A to 2.87e-08A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -1.53e-02A to 2.71e-08A, IG: -3.73e-07A to 1.34e-08A, IS: 1.01e-39A to 1.53e-02A, IB: -1.42e-38A to 3.30e-07A, KCL Error: 0.00%, Power: 0.00e+00W to 1.84e-02W, Temp: -40°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000015 /°C, IDS: -1.793e-02A to 2.870e-08A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: green'>✓</span> | Gate capacitance range: 7.08fF to 13.98fF |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: green'>✓</span> | S11 range: -2dB to -1dB, S21 range: -26dB to -22dB |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: green'>✓</span> | Max phase shift: 179.997 |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: green'>✓</span> | Total charge error: 0.0 |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 2.934e-05A, Rise Time: 0.1ps |\n| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 10.6ps, Power: 5.659e-03W (max), 1.485e-03W (avg) |\n| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 24.9ps |\n| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -3.050468e-05W/°C |\n| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed: None |\n| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: None |\n\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |\n| [Temperature Dependence](#temperature-dependence) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |\n| [Bias Dependence](#bias-dependence) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |\n\n## 3. AC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -1.79e-02A to 2.87e-08A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -1.53e-02A to 2.71e-08A\n  - IG: -3.73e-07A to 1.34e-08A\n  - IS: 1.01e-39A to 1.53e-02A\n  - IB: -1.42e-38A to 3.30e-07A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: 0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -1.793e-02A to 2.870e-08A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n### Large-Signal Transient\n- [<span style='color: green'>✓</span>] Large Signal Transient Verified\n  - Maximum Drain Current: 2.934367e-05A\n  - Gate Voltage Rise Time: 0.1ps\n\n*Large-signal transient analysis showing voltages and current response*\n\n<img src='plots/trans_large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>\n\n### Switching Simulations\n- [<span style='color: green'>✓</span>] Propagation Delay Verified\n  - Propagation Delay: 10.6ps\n\n  - Maximum Switching Power: 5.659051e-03W\n\n  - Average Switching Power: 1.485173e-03W\n\n*Inverter switching analysis showing input/output voltages and power*\n\n<img src='plots/trans_switching_response.png' alt='Switching Response' width='400'/>\n\n### Delay Effect Simulations\n- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed\n  - Stage 1 Delay: 13.7ps\n\n  - Stage 2 Delay: 6.1ps\n\n  - Stage 3 Delay: 5.1ps\n\n  - Total Delay: 24.9ps\n\n*Delay effect analysis showing signal propagation through inverter chain*\n\n<img src='plots/trans_delay_effect.png' alt='Delay Effect Analysis' width='400'/>\n\n### Transient Simulations for Power Dissipation\n- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed\n  - Maximum Power at 27°C: 9.361712e-03W\n\n  - Maximum Power at 100°C: 7.134870e-03W\n\n  - Average Power at 27°C: 1.538944e-03W\n\n  - Average Power at 100°C: 1.056623e-03W\n\n  - Power Temperature Coefficient: -3.050468e-05W/°C\n\n*Power dissipation analysis at different temperatures*\n\n<img src='plots/trans_power_dissipation.png' alt='Power Dissipation' width='400'/>\n\n*Energy consumption analysis at different temperatures*\n\n<img src='plots/trans_energy_consumption.png' alt='Energy Consumption' width='400'/>\n\n### Quasi-Static Analysis\n- [<span style='color: green'>✓</span>] Charge conservation analyzed\n*Quasi-static time-domain behavior analysis*\n\n<img src='plots/trans_quasi_static.png' alt='Quasi-Static Analysis' width='400'/>\n\n*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*\n\n<img src='plots/trans_quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>\n\n### Charge Conservation Tests\n- [<span style='color: red'>✗</span>] Charge Conservation verification failed\n  - Data not available or failed to read\n\n\n## 5. AC Analysis\n### Small-Signal Analysis\n- [<span style='color: green'>✓</span>] AC small-signal simulations verified\n  - Gate capacitance range: 7.08fF to 13.98fF\n  - Frequency range: 1.00e+06Hz to 1.00e+09Hz\n  - Max capacitance at: 0.00V\n\n*CV characteristics showing gate capacitance variation with gate voltage*\n\n<img src='plots/ac_cv_characteristics.png' alt='CV Characteristics' width='400'/>\n\nCapacitance components (Cgb, Cgs, Cgd) variation with gate voltage*\n\n<img src='plots/ac_cv_components.png' alt='CV Components' width='400'/>\n\n### S-Parameter Analysis\n- [<span style='color: green'>✓</span>] High-frequency AC simulations verified\n  - Frequency range: 1.0MHz to 1.0GHz\n- [<span style='color: green'>✓</span>] S-parameter analysis verified\n  - S11 range: -2dB to -1dB\n  - S21 range: -26dB to -22dB\n  - S12 range: -40dB to -32dB\n  - S22 range: -5dB to -3dB\n- [<span style='color: green'>✓</span>] RF simulations verified\n  - Isolation: >-10dB\n\n*S-Parameter analysis showing frequency response characteristics*\n\n<img src='plots/ac_cv_sparameter_analysis.png' alt='S-Parameters' width='400'/>\n\n### Non-Quasi-Static Effects Analysis\n- [<span style='color: green'>✓</span>] NQS effects verified\n  - Maximum phase shift: 179.997\n  - Frequency range: 10.0MHz to 10.0GHz\n\n*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*\n\n<img src='plots/ac_cv_nqs_effects.png' alt='NQS Effects' width='400'/>\n\n### Charge Conservation Analysis\n- [<span style='color: red'>✗</span>] Charge conservation verification failed\n  - Data not available or failed to read\n\n## 6. Noise Analysis\n### Thermal Noise Analysis\n- [<span style='color: green'>✓</span>] Thermal noise analysis completed\n  - Max Noise: 1.00e+09 V²/Hz\n  - Min Noise: 2.16e-15 V²/Hz\n  - Avg Noise: 2.54e+07 V²/Hz\n  - Noise Floor: 2.65e+07 V²/Hz\n  - Frequency Range: 0.0MHz to 1.0GHz\n\n*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*\n\n<img src='plots/noise_thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>\n\n### Flicker Noise Analysis\n- [<span style='color: green'>✓</span>] Flicker noise analysis completed\n  - Coefficient (K): 4.68e-08\n  - Exponent (γ): 5.07e-01 (ideally -1.0 for pure 1/f noise)\n  - Correlation (R²): 0.8265\n  - Corner Frequency: 1.12e+00 Hz\n\n*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*\n\n<img src='plots/noise_flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>\n\n### Short Noise Analysis\n- [<span style='color: green'>✓</span>] Short noise analysis completed\n  - Shot Noise Level: 3.79e-09 V²/Hz\n  - Standard Deviation: 5.56e-09 V²/Hz\n  - Variation Coefficient: 1.4676\n\n*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*\n\n<img src='plots/noise_shot_noise.png' alt='Shot Noise Analysis' width='400'/>\n\n### Temperature Dependence\n- [<span style='color: green'>✓</span>] Short noise analysis completed\n  - Temperature Coefficient: 2.77e-11 V²/Hz/°C\n  - Temperature-Noise Correlation: None\n  - Temperature Range: -40.0°C to 150.0°C\n\n*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*\n\n<img src='plots/noise_vs_temperature.png' alt='Shot Noise Analysis' width='400'/>\n\n### Bias Dependence\n- [<span style='color: green'>✓</span>] Bias Dependance analysis completed\n*Thermal Noise Results at Different Bias Points*\n\n| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |\n|----------------|-------------------|-------------------|-------------------|--------------------|\n| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n\n",
        "simulator": "ngspice",
        "simulatorVersion": "36",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.79e-02A to 2.87e-08A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -1.53e-02A to 2.71e-08A, IG: -3.73e-07A to 1.34e-08A, IS: 1.01e-39A to 1.53e-02A, IB: -1.42e-38A to 3.30e-07A, KCL Error: 0.00%, Power: 0.00e+00W to 1.84e-02W, Temp: -40°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000015 /°C, IDS: -1.793e-02A to 2.870e-08A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "ac_5",
          "domain": "ac",
          "name": "Small Signal Analysis",
          "status": "pass",
          "detail": "Gate capacitance range: 7.08fF to 13.98fF"
        },
        {
          "testId": "ac_6",
          "domain": "ac",
          "name": "S-Parameter Analysis",
          "status": "pass",
          "detail": "S11 range: -2dB to -1dB, S21 range: -26dB to -22dB"
        },
        {
          "testId": "ac_7",
          "domain": "ac",
          "name": "Non-Quasi-Static (NQS) Effects Analysis",
          "status": "pass",
          "detail": "Max phase shift: 179.997"
        },
        {
          "testId": "ac_8",
          "domain": "ac",
          "name": "Charge Conservation Analysis",
          "status": "pass",
          "detail": "Total charge error: 0.0"
        },
        {
          "testId": "transient_9",
          "domain": "transient",
          "name": "Large-Signal Transient",
          "status": "pass",
          "detail": "Max Current: 2.934e-05A, Rise Time: 0.1ps"
        },
        {
          "testId": "transient_10",
          "domain": "transient",
          "name": "Switching Simulations",
          "status": "pass",
          "detail": "Propagation Delay: 10.6ps, Power: 5.659e-03W (max), 1.485e-03W (avg)"
        },
        {
          "testId": "transient_11",
          "domain": "transient",
          "name": "Delay Effect",
          "status": "pass",
          "detail": "Total Chain Delay: 24.9ps"
        },
        {
          "testId": "transient_12",
          "domain": "transient",
          "name": "Power Dissipation",
          "status": "pass",
          "detail": "Temp Coeff: -3.050468e-05W/°C"
        },
        {
          "testId": "transient_13",
          "domain": "transient",
          "name": "Quasi-Static Analysis",
          "status": "pass",
          "detail": "I-V characteristics analyzed: None"
        },
        {
          "testId": "transient_14",
          "domain": "transient",
          "name": "Charge Conservation",
          "status": "pass",
          "detail": "Error: None"
        },
        {
          "testId": "noise_15",
          "domain": "noise",
          "name": "Thermal Noise",
          "status": "pass",
          "detail": "Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz"
        },
        {
          "testId": "noise_16",
          "domain": "noise",
          "name": "Flicker (1/f) Noise",
          "status": "pass",
          "detail": "Exponent: 0.5075, Corner Freq: 1.12e+00 Hz"
        },
        {
          "testId": "noise_17",
          "domain": "noise",
          "name": "Shot Noise",
          "status": "pass",
          "detail": "Level: 3.79e-09 V²/Hz, Variation: 1.4676"
        },
        {
          "testId": "noise_18",
          "domain": "noise",
          "name": "Temperature Dependence",
          "status": "pass",
          "detail": "Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C"
        },
        {
          "testId": "noise_19",
          "domain": "noise",
          "name": "Bias Dependence",
          "status": "pass",
          "detail": "Analyzed at 6 bias points"
        },
        {
          "testId": "setup_20",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_21",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_22",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "548 B",
          "hash": "09f8b80d",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/bias_point_data_09f8b80d.json",
          "rawUrl": "benchmark/results/data/bias_point_data_09f8b80d.txt",
          "metadata": {}
        },
        {
          "name": "charge_conservation.txt",
          "relPath": "data/charge_conservation.txt",
          "domain": "overview",
          "format": "txt",
          "size": "130.4 KB",
          "hash": "4775c9e0",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 5542,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/charge_conservation_4775c9e0.json",
          "rawUrl": "benchmark/results/data/charge_conservation_4775c9e0.txt",
          "metadata": {}
        },
        {
          "name": "cv_data.txt",
          "relPath": "data/cv_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "3.7 KB",
          "hash": "5eec3676",
          "columns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/cv_data_5eec3676.json",
          "rawUrl": "benchmark/results/data/cv_data_5eec3676.txt",
          "metadata": {}
        },
        {
          "name": "flicker_noise.txt",
          "relPath": "data/flicker_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "403fb109",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/flicker_noise_403fb109.json",
          "rawUrl": "benchmark/results/data/flicker_noise_403fb109.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "99e090ce",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/iv_data_-40_99e090ce.json",
          "rawUrl": "benchmark/results/data/iv_data_-40_99e090ce.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "cfca6f39",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/iv_data_0_cfca6f39.json",
          "rawUrl": "benchmark/results/data/iv_data_0_cfca6f39.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "c68c9ff4",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/iv_data_100_c68c9ff4.json",
          "rawUrl": "benchmark/results/data/iv_data_100_c68c9ff4.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "c2440f01",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/iv_data_150_c2440f01.json",
          "rawUrl": "benchmark/results/data/iv_data_150_c2440f01.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "3a52fb59",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/iv_data_25_3a52fb59.json",
          "rawUrl": "benchmark/results/data/iv_data_25_3a52fb59.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "106.8 KB",
          "hash": "9eaaa012",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/iv_data_50_9eaaa012.json",
          "rawUrl": "benchmark/results/data/iv_data_50_9eaaa012.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp-40.txt",
          "relPath": "data/noise_temp-40.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "9a9f6b9a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/noise_temp-40_9a9f6b9a.json",
          "rawUrl": "benchmark/results/data/noise_temp-40_9a9f6b9a.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp0.txt",
          "relPath": "data/noise_temp0.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "9a9f6b9a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/noise_temp0_9a9f6b9a.json",
          "rawUrl": "benchmark/results/data/noise_temp0_9a9f6b9a.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp100.txt",
          "relPath": "data/noise_temp100.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "9a9f6b9a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/noise_temp100_9a9f6b9a.json",
          "rawUrl": "benchmark/results/data/noise_temp100_9a9f6b9a.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp150.txt",
          "relPath": "data/noise_temp150.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "9a9f6b9a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/noise_temp150_9a9f6b9a.json",
          "rawUrl": "benchmark/results/data/noise_temp150_9a9f6b9a.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp27.txt",
          "relPath": "data/noise_temp27.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "9a9f6b9a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/noise_temp27_9a9f6b9a.json",
          "rawUrl": "benchmark/results/data/noise_temp27_9a9f6b9a.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp50.txt",
          "relPath": "data/noise_temp50.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "9a9f6b9a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/noise_temp50_9a9f6b9a.json",
          "rawUrl": "benchmark/results/data/noise_temp50_9a9f6b9a.txt",
          "metadata": {}
        },
        {
          "name": "nqs_effects.txt",
          "relPath": "data/nqs_effects.txt",
          "domain": "ac",
          "format": "txt",
          "size": "180 B",
          "hash": "849ea1c6",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "rowCount": 4,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/nqs_effects_849ea1c6.json",
          "rawUrl": "benchmark/results/data/nqs_effects_849ea1c6.txt",
          "metadata": {}
        },
        {
          "name": "shot_noise.txt",
          "relPath": "data/shot_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "ff9297a1",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/shot_noise_ff9297a1.json",
          "rawUrl": "benchmark/results/data/shot_noise_ff9297a1.txt",
          "metadata": {}
        },
        {
          "name": "sparams_data.txt",
          "relPath": "data/sparams_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "286 B",
          "hash": "9c16f21a",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "rowCount": 4,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/sparams_data_9c16f21a.json",
          "rawUrl": "benchmark/results/data/sparams_data_9c16f21a.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "95707826",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds0.3_95707826.json",
          "rawUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds0.3_95707826.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "95707826",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds0.6_95707826.json",
          "rawUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds0.6_95707826.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.9.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.9.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "95707826",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds0.9_95707826.json",
          "rawUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds0.9_95707826.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds1.2.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds1.2.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "95707826",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds1.2_95707826.json",
          "rawUrl": "benchmark/results/data/thermal_noise_vgs0.3_vds1.2_95707826.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "95707826",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/thermal_noise_vgs0.6_vds0.3_95707826.json",
          "rawUrl": "benchmark/results/data/thermal_noise_vgs0.6_vds0.3_95707826.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.2 KB",
          "hash": "95707826",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/thermal_noise_vgs0.6_vds0.6_95707826.json",
          "rawUrl": "benchmark/results/data/thermal_noise_vgs0.6_vds0.6_95707826.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "5831.4 KB",
          "hash": "17450092",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "ig_charge",
            "id_charge",
            "is_charge",
            "ib_charge",
            "i_total",
            "qg_approx",
            "qd_approx",
            "qs_approx",
            "qb_approx",
            "q_total"
          ],
          "rowCount": 28570,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "ig_charge",
            "id_charge",
            "is_charge",
            "ib_charge",
            "i_total",
            "qg_approx",
            "qd_approx",
            "qs_approx",
            "qb_approx",
            "q_total"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_charge_17450092.json",
          "rawUrl": "benchmark/results/data/tran_charge_17450092.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2738.9 KB",
          "hash": "3d708e7c",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 28913,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_delay_3d708e7c.json",
          "rawUrl": "benchmark/results/data/tran_delay_3d708e7c.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3581.1 KB",
          "hash": "dbca968d",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 28426,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_large_signal_dbca968d.json",
          "rawUrl": "benchmark/results/data/tran_large_signal_dbca968d.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2696.3 KB",
          "hash": "f4a668c3",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 28463,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_power_100C_f4a668c3.json",
          "rawUrl": "benchmark/results/data/tran_power_100C_f4a668c3.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2760.5 KB",
          "hash": "974837aa",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 29141,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_power_27C_974837aa.json",
          "rawUrl": "benchmark/results/data/tran_power_27C_974837aa.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "8149.1 KB",
          "hash": "813857ea",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "id_qs"
          ],
          "rowCount": 103020,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "id_qs"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_quasi_static_813857ea.json",
          "rawUrl": "benchmark/results/data/tran_quasi_static_813857ea.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2271.9 KB",
          "hash": "bbb3423f",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 28720,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_switching_bbb3423f.json",
          "rawUrl": "benchmark/results/data/tran_switching_bbb3423f.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1374.3 KB",
          "hash": "4c541e08",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 28720,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results/data/tran_switching_power_4c541e08.json",
          "rawUrl": "benchmark/results/data/tran_switching_power_4c541e08.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "ac_charge_conservation.png",
          "relPath": "plots/ac_charge_conservation.png",
          "domain": "ac",
          "format": "png",
          "size": "138.4 KB",
          "displayUrl": "benchmark/results/plots/ac_charge_conservation_09581243.png"
        },
        {
          "name": "ac_cv_characteristics.png",
          "relPath": "plots/ac_cv_characteristics.png",
          "domain": "ac",
          "format": "png",
          "size": "155.1 KB",
          "displayUrl": "benchmark/results/plots/ac_cv_characteristics_54ad29bc.png"
        },
        {
          "name": "ac_cv_components.png",
          "relPath": "plots/ac_cv_components.png",
          "domain": "ac",
          "format": "png",
          "size": "240.5 KB",
          "displayUrl": "benchmark/results/plots/ac_cv_components_b0763246.png"
        },
        {
          "name": "ac_cv_nqs_effects.png",
          "relPath": "plots/ac_cv_nqs_effects.png",
          "domain": "ac",
          "format": "png",
          "size": "387.6 KB",
          "displayUrl": "benchmark/results/plots/ac_cv_nqs_effects_dd0638f7.png"
        },
        {
          "name": "ac_cv_sparameter_analysis.png",
          "relPath": "plots/ac_cv_sparameter_analysis.png",
          "domain": "ac",
          "format": "png",
          "size": "460.4 KB",
          "displayUrl": "benchmark/results/plots/ac_cv_sparameter_analysis_ea6bfba2.png"
        },
        {
          "name": "ac_v_multifreq_characteristics.png",
          "relPath": "plots/ac_v_multifreq_characteristics.png",
          "domain": "ac",
          "format": "png",
          "size": "232.2 KB",
          "displayUrl": "benchmark/results/plots/ac_v_multifreq_characteristics_1a753823.png"
        },
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "1230.2 KB",
          "displayUrl": "benchmark/results/plots/dc_iv_characteristics_44e599f9.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "310.8 KB",
          "displayUrl": "benchmark/results/plots/dc_kcl_verification_9a99adfa.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "268.4 KB",
          "displayUrl": "benchmark/results/plots/dc_temperature_analysis_8afe0802.png"
        },
        {
          "name": "noise_components.png",
          "relPath": "plots/noise_components.png",
          "domain": "noise",
          "format": "png",
          "size": "283.6 KB",
          "displayUrl": "benchmark/results/plots/noise_components_d2a1aff6.png"
        },
        {
          "name": "noise_flicker_noise.png",
          "relPath": "plots/noise_flicker_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "210.3 KB",
          "displayUrl": "benchmark/results/plots/noise_flicker_noise_8992dd34.png"
        },
        {
          "name": "noise_shot_noise.png",
          "relPath": "plots/noise_shot_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "210.2 KB",
          "displayUrl": "benchmark/results/plots/noise_shot_noise_97f69a58.png"
        },
        {
          "name": "noise_thermal_noise.png",
          "relPath": "plots/noise_thermal_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "210.9 KB",
          "displayUrl": "benchmark/results/plots/noise_thermal_noise_84c213c5.png"
        },
        {
          "name": "noise_thermal_noise_vds_comparison.png",
          "relPath": "plots/noise_thermal_noise_vds_comparison.png",
          "domain": "noise",
          "format": "png",
          "size": "282.5 KB",
          "displayUrl": "benchmark/results/plots/noise_thermal_noise_vds_comparison_5a42555d.png"
        },
        {
          "name": "noise_vs_temperature.png",
          "relPath": "plots/noise_vs_temperature.png",
          "domain": "noise",
          "format": "png",
          "size": "135.6 KB",
          "displayUrl": "benchmark/results/plots/noise_vs_temperature_2dc5b178.png"
        },
        {
          "name": "trans_delay_effect.png",
          "relPath": "plots/trans_delay_effect.png",
          "domain": "transient",
          "format": "png",
          "size": "144.7 KB",
          "displayUrl": "benchmark/results/plots/trans_delay_effect_bbf71e09.png"
        },
        {
          "name": "trans_energy_consumption.png",
          "relPath": "plots/trans_energy_consumption.png",
          "domain": "transient",
          "format": "png",
          "size": "137.2 KB",
          "displayUrl": "benchmark/results/plots/trans_energy_consumption_fb86deaa.png"
        },
        {
          "name": "trans_large_signal_transient.png",
          "relPath": "plots/trans_large_signal_transient.png",
          "domain": "transient",
          "format": "png",
          "size": "261.5 KB",
          "displayUrl": "benchmark/results/plots/trans_large_signal_transient_a8870071.png"
        },
        {
          "name": "trans_power_dissipation.png",
          "relPath": "plots/trans_power_dissipation.png",
          "domain": "transient",
          "format": "png",
          "size": "118.0 KB",
          "displayUrl": "benchmark/results/plots/trans_power_dissipation_831114e8.png"
        },
        {
          "name": "trans_quasi_static_iv.png",
          "relPath": "plots/trans_quasi_static_iv.png",
          "domain": "dc",
          "format": "png",
          "size": "128.0 KB",
          "displayUrl": "benchmark/results/plots/trans_quasi_static_iv_3b19fc32.png"
        },
        {
          "name": "trans_quasi_static_time.png",
          "relPath": "plots/trans_quasi_static_time.png",
          "domain": "transient",
          "format": "png",
          "size": "290.8 KB",
          "displayUrl": "benchmark/results/plots/trans_quasi_static_time_3ea43e41.png"
        },
        {
          "name": "trans_switching_response.png",
          "relPath": "plots/trans_switching_response.png",
          "domain": "transient",
          "format": "png",
          "size": "333.2 KB",
          "displayUrl": "benchmark/results/plots/trans_switching_response_bad3ed2b.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "14.5 KB",
          "hash": "5ca678f8",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2025-06-12 17:29:42\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /mnt/d/proj/spice_model_benchmark/netlists/dc_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/transient_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/noise_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/ac_circuit.cir\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-36\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.79e-02A to 2.87e-08A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -1.53e-02A to 2.71e-08A, IG: -3.73e-07A to 1.34e-08A, IS: 1.01e-39A to 1.53e-02A, IB: -1.42e-38A to 3.30e-07A, KCL Error: 0.00%, Power: 0.00e+00W to 1.84e-02W, Temp: -40°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000015 /°C, IDS: -1.793e-02A to 2.870e-08A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: green'>✓</span> | Gate capacitance range: 7.08fF to 13.98fF |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: green'>✓</span> | S11 range: -2dB to -1dB, S21 range: -26dB to -22dB |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: green'>✓</span> | Max phase shift: 179.997 |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: green'>✓</span> | Total charge error: 0.0 |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 2.934e-05A, Rise Time: 0.1ps |\n| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 10.6ps, Power: 5.659e-03W (max), 1.485e-03W (avg) |\n| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 24.9ps |\n| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -3.050468e-05W/°C |\n| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed: None |\n| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: None |\n\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |\n| [Temperature Dependence](#temperature-dependence) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |\n| [Bias Dependence](#bias-dependence) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |\n\n## 3. AC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -1.79e-02A to 2.87e-08A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -1.53e-02A to 2.71e-08A\n  - IG: -3.73e-07A to 1.34e-08A\n  - IS: 1.01e-39A to 1.53e-02A\n  - IB: -1.42e-38A to 3.30e-07A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: 0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -1.793e-02A to 2.870e-08A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n### Large-Signal Transient\n- [<span style='color: green'>✓</span>] Large Signal Transient Verified\n  - Maximum Drain Current: 2.934367e-05A\n  - Gate Voltage Rise Time: 0.1ps\n\n*Large-signal transient analysis showing voltages and current response*\n\n<img src='plots/trans_large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>\n\n### Switching Simulations\n- [<span style='color: green'>✓</span>] Propagation Delay Verified\n  - Propagation Delay: 10.6ps\n\n  - Maximum Switching Power: 5.659051e-03W\n\n  - Average Switching Power: 1.485173e-03W\n\n*Inverter switching analysis showing input/output voltages and power*\n\n<img src='plots/trans_switching_response.png' alt='Switching Response' width='400'/>\n\n### Delay Effect Simulations\n- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed\n  - Stage 1 Delay: 13.7ps\n\n  - Stage 2 Delay: 6.1ps\n\n  - Stage 3 Delay: 5.1ps\n\n  - Total Delay: 24.9ps\n\n*Delay effect analysis showing signal propagation through inverter chain*\n\n<img src='plots/trans_delay_effect.png' alt='Delay Effect Analysis' width='400'/>\n\n### Transient Simulations for Power Dissipation\n- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed\n  - Maximum Power at 27°C: 9.361712e-03W\n\n  - Maximum Power at 100°C: 7.134870e-03W\n\n  - Average Power at 27°C: 1.538944e-03W\n\n  - Average Power at 100°C: 1.056623e-03W\n\n  - Power Temperature Coefficient: -3.050468e-05W/°C\n\n*Power dissipation analysis at different temperatures*\n\n<img src='plots/trans_power_dissipation.png' alt='Power Dissipation' width='400'/>\n\n*Energy consumption analysis at different temperatures*\n\n<img src='plots/trans_energy_consumption.png' alt='Energy Consumption' width='400'/>\n\n### Quasi-Static Analysis\n- [<span style='color: green'>✓</span>] Charge conservation analyzed\n*Quasi-static time-domain behavior analysis*\n\n<img src='plots/trans_quasi_static.png' alt='Quasi-Static Analysis' width='400'/>\n\n*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*\n\n<img src='plots/trans_quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>\n\n### Charge Conservation Tests\n- [<span style='color: red'>✗</span>] Charge Conservation verification failed\n  - Data not available or failed to read\n\n\n## 5. AC Analysis\n### Small-Signal Analysis\n- [<span style='color: green'>✓</span>] AC small-signal simulations verified\n  - Gate capacitance range: 7.08fF to 13.98fF\n  - Frequency range: 1.00e+06Hz to 1.00e+09Hz\n  - Max capacitance at: 0.00V\n\n*CV characteristics showing gate capacitance variation with gate voltage*\n\n<img src='plots/ac_cv_characteristics.png' alt='CV Characteristics' width='400'/>\n\nCapacitance components (Cgb, Cgs, Cgd) variation with gate voltage*\n\n<img src='plots/ac_cv_components.png' alt='CV Components' width='400'/>\n\n### S-Parameter Analysis\n- [<span style='color: green'>✓</span>] High-frequency AC simulations verified\n  - Frequency range: 1.0MHz to 1.0GHz\n- [<span style='color: green'>✓</span>] S-parameter analysis verified\n  - S11 range: -2dB to -1dB\n  - S21 range: -26dB to -22dB\n  - S12 range: -40dB to -32dB\n  - S22 range: -5dB to -3dB\n- [<span style='color: green'>✓</span>] RF simulations verified\n  - Isolation: >-10dB\n\n*S-Parameter analysis showing frequency response characteristics*\n\n<img src='plots/ac_cv_sparameter_analysis.png' alt='S-Parameters' width='400'/>\n\n### Non-Quasi-Static Effects Analysis\n- [<span style='color: green'>✓</span>] NQS effects verified\n  - Maximum phase shift: 179.997\n  - Frequency range: 10.0MHz to 10.0GHz\n\n*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*\n\n<img src='plots/ac_cv_nqs_effects.png' alt='NQS Effects' width='400'/>\n\n### Charge Conservation Analysis\n- [<span style='color: red'>✗</span>] Charge conservation verification failed\n  - Data not available or failed to read\n\n## 6. Noise Analysis\n### Thermal Noise Analysis\n- [<span style='color: green'>✓</span>] Thermal noise analysis completed\n  - Max Noise: 1.00e+09 V²/Hz\n  - Min Noise: 2.16e-15 V²/Hz\n  - Avg Noise: 2.54e+07 V²/Hz\n  - Noise Floor: 2.65e+07 V²/Hz\n  - Frequency Range: 0.0MHz to 1.0GHz\n\n*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*\n\n<img src='plots/noise_thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>\n\n### Flicker Noise Analysis\n- [<span style='color: green'>✓</span>] Flicker noise analysis completed\n  - Coefficient (K): 4.68e-08\n  - Exponent (γ): 5.07e-01 (ideally -1.0 for pure 1/f noise)\n  - Correlation (R²): 0.8265\n  - Corner Frequency: 1.12e+00 Hz\n\n*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*\n\n<img src='plots/noise_flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>\n\n### Short Noise Analysis\n- [<span style='color: green'>✓</span>] Short noise analysis completed\n  - Shot Noise Level: 3.79e-09 V²/Hz\n  - Standard Deviation: 5.56e-09 V²/Hz\n  - Variation Coefficient: 1.4676\n\n*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*\n\n<img src='plots/noise_shot_noise.png' alt='Shot Noise Analysis' width='400'/>\n\n### Temperature Dependence\n- [<span style='color: green'>✓</span>] Short noise analysis completed\n  - Temperature Coefficient: 2.77e-11 V²/Hz/°C\n  - Temperature-Noise Correlation: None\n  - Temperature Range: -40.0°C to 150.0°C\n\n*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*\n\n<img src='plots/noise_vs_temperature.png' alt='Shot Noise Analysis' width='400'/>\n\n### Bias Dependence\n- [<span style='color: green'>✓</span>] Bias Dependance analysis completed\n*Thermal Noise Results at Different Bias Points*\n\n| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |\n|----------------|-------------------|-------------------|-------------------|--------------------|\n| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n\n",
            "simulator": "ngspice",
            "simulatorVersion": "36",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.79e-02A to 2.87e-08A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -1.53e-02A to 2.71e-08A, IG: -3.73e-07A to 1.34e-08A, IS: 1.01e-39A to 1.53e-02A, IB: -1.42e-38A to 3.30e-07A, KCL Error: 0.00%, Power: 0.00e+00W to 1.84e-02W, Temp: -40°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000015 /°C, IDS: -1.793e-02A to 2.870e-08A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "ac_5",
                "domain": "ac",
                "name": "Small Signal Analysis",
                "status": "pass",
                "detail": "Gate capacitance range: 7.08fF to 13.98fF"
              },
              {
                "testId": "ac_6",
                "domain": "ac",
                "name": "S-Parameter Analysis",
                "status": "pass",
                "detail": "S11 range: -2dB to -1dB, S21 range: -26dB to -22dB"
              },
              {
                "testId": "ac_7",
                "domain": "ac",
                "name": "Non-Quasi-Static (NQS) Effects Analysis",
                "status": "pass",
                "detail": "Max phase shift: 179.997"
              },
              {
                "testId": "ac_8",
                "domain": "ac",
                "name": "Charge Conservation Analysis",
                "status": "pass",
                "detail": "Total charge error: 0.0"
              },
              {
                "testId": "transient_9",
                "domain": "transient",
                "name": "Large-Signal Transient",
                "status": "pass",
                "detail": "Max Current: 2.934e-05A, Rise Time: 0.1ps"
              },
              {
                "testId": "transient_10",
                "domain": "transient",
                "name": "Switching Simulations",
                "status": "pass",
                "detail": "Propagation Delay: 10.6ps, Power: 5.659e-03W (max), 1.485e-03W (avg)"
              },
              {
                "testId": "transient_11",
                "domain": "transient",
                "name": "Delay Effect",
                "status": "pass",
                "detail": "Total Chain Delay: 24.9ps"
              },
              {
                "testId": "transient_12",
                "domain": "transient",
                "name": "Power Dissipation",
                "status": "pass",
                "detail": "Temp Coeff: -3.050468e-05W/°C"
              },
              {
                "testId": "transient_13",
                "domain": "transient",
                "name": "Quasi-Static Analysis",
                "status": "pass",
                "detail": "I-V characteristics analyzed: None"
              },
              {
                "testId": "transient_14",
                "domain": "transient",
                "name": "Charge Conservation",
                "status": "pass",
                "detail": "Error: None"
              },
              {
                "testId": "noise_15",
                "domain": "noise",
                "name": "Thermal Noise",
                "status": "pass",
                "detail": "Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz"
              },
              {
                "testId": "noise_16",
                "domain": "noise",
                "name": "Flicker (1/f) Noise",
                "status": "pass",
                "detail": "Exponent: 0.5075, Corner Freq: 1.12e+00 Hz"
              },
              {
                "testId": "noise_17",
                "domain": "noise",
                "name": "Shot Noise",
                "status": "pass",
                "detail": "Level: 3.79e-09 V²/Hz, Variation: 1.4676"
              },
              {
                "testId": "noise_18",
                "domain": "noise",
                "name": "Temperature Dependence",
                "status": "pass",
                "detail": "Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C"
              },
              {
                "testId": "noise_19",
                "domain": "noise",
                "name": "Bias Dependence",
                "status": "pass",
                "detail": "Analyzed at 6 bias points"
              },
              {
                "testId": "setup_20",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_21",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_22",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_final": {
      "runId": "results_final",
      "status": "failed",
      "pdkId": "results_final",
      "modelId": "results_final",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_final",
        "suiteName": "results_final",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-20 19:04:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: red'>✗</span> | Data not available |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Temperature Dependence](#temperature-dependence) | <span style='color: red'>✗</span> | Data not available |\n| [Bias Dependence](#detailed-noise-characteristics) | <span style='color: red'>✗</span> | Data not available |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 5. AC Analysis\n- [<span style='color: red'>✗</span>] AC simulations failed\n  - Data not available or failed to read\n## 6. Noise Analysis\n### Thermal Noise Analysis\n- [<span style='color: red'>✗</span>] Thermal Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Flicker Noise Analysis\n- [<span style='color: red'>✗</span>] Flicker Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Short Noise Analysis\n- [<span style='color: red'>✗</span>] Short Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Temperature Dependence\n- [<span style='color: red'>✗</span>] Temperature Dependence verification failed\n  - Data not available or failed to read\n\n### Bias Dependence\n- [<span style='color: red'>✗</span>] Bias Dependence verification failed\n  - Data not available or failed to read\n\n",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "fail"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "ac_5",
          "domain": "ac",
          "name": "Small Signal Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "ac_6",
          "domain": "ac",
          "name": "S-Parameter Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "ac_7",
          "domain": "ac",
          "name": "Non-Quasi-Static (NQS) Effects Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "ac_8",
          "domain": "ac",
          "name": "Charge Conservation Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "noise_9",
          "domain": "noise",
          "name": "Thermal Noise",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "noise_10",
          "domain": "noise",
          "name": "Flicker (1/f) Noise",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "noise_11",
          "domain": "noise",
          "name": "Shot Noise",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "noise_12",
          "domain": "noise",
          "name": "Temperature Dependence",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "noise_13",
          "domain": "noise",
          "name": "Bias Dependence",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "setup_14",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_15",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_16",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_final/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "charge_conservation.txt",
          "relPath": "data/charge_conservation.txt",
          "domain": "overview",
          "format": "txt",
          "size": "8.0 KB",
          "hash": "cc7abb71",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5"
          ],
          "rowCount": 79,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "8.3416666667e-03",
              "2.5025000000e-02",
              "5.8391666667e-02",
              "1.1321590936e-01",
              "1.5314989694e-01",
              "2.1400064730e-01",
              "3.2591961884e-01",
              "5.4975756192e-01",
              "7.7487878096e-01",
              "8.8743939048e-01",
              "9.4371969524e-01",
              "1.0000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_final/data/charge_conservation_cc7abb71.json",
          "rawUrl": "benchmark/results_final/data/charge_conservation_cc7abb71.txt",
          "metadata": {}
        },
        {
          "name": "cmatrix_data.txt",
          "relPath": "data/cmatrix_data.txt",
          "domain": "overview",
          "format": "txt",
          "size": "3.6 KB",
          "hash": "7d5b755e",
          "columns": [
            "Vg",
            "Cgg",
            "Cdg",
            "Csg",
            "Cbg",
            "Cgd",
            "Cdd",
            "Csd",
            "Cbd",
            "Cgs",
            "Cds",
            "Css",
            "Cbs",
            "Cgb",
            "Cdb",
            "Csb",
            "Cbb"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg",
            "Cdg",
            "Csg",
            "Cbg",
            "Cgd",
            "Cdd",
            "Csd",
            "Cbd",
            "Cgs",
            "Cds",
            "Css",
            "Cbs",
            "Cgb",
            "Cdb",
            "Csb",
            "Cbb"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/cmatrix_data_7d5b755e.json",
          "rawUrl": "benchmark/results_final/data/cmatrix_data_7d5b755e.txt",
          "metadata": {}
        },
        {
          "name": "cv_data.txt",
          "relPath": "data/cv_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "4.2 KB",
          "hash": "8bf2d832",
          "columns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/cv_data_8bf2d832.json",
          "rawUrl": "benchmark/results_final/data/cv_data_8bf2d832.txt",
          "metadata": {}
        },
        {
          "name": "flicker_noise.txt",
          "relPath": "data/flicker_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "8.7 KB",
          "hash": "d290ca5e",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 370,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/flicker_noise_d290ca5e.json",
          "rawUrl": "benchmark/results_final/data/flicker_noise_d290ca5e.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_final/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_final/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_final/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_final/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_final/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_final/data/iv_data_50_e5573004.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp-40.txt",
          "relPath": "data/noise_temp-40.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "77aa7486",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/noise_temp-40_77aa7486.json",
          "rawUrl": "benchmark/results_final/data/noise_temp-40_77aa7486.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp0.txt",
          "relPath": "data/noise_temp0.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/noise_temp0_9a38821b.json",
          "rawUrl": "benchmark/results_final/data/noise_temp0_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp100.txt",
          "relPath": "data/noise_temp100.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "47813deb",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/noise_temp100_47813deb.json",
          "rawUrl": "benchmark/results_final/data/noise_temp100_47813deb.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp150.txt",
          "relPath": "data/noise_temp150.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/noise_temp150_9a38821b.json",
          "rawUrl": "benchmark/results_final/data/noise_temp150_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp27.txt",
          "relPath": "data/noise_temp27.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/noise_temp27_9a38821b.json",
          "rawUrl": "benchmark/results_final/data/noise_temp27_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp50.txt",
          "relPath": "data/noise_temp50.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/noise_temp50_9a38821b.json",
          "rawUrl": "benchmark/results_final/data/noise_temp50_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "nqs_effects.txt",
          "relPath": "data/nqs_effects.txt",
          "domain": "ac",
          "format": "txt",
          "size": "776 B",
          "hash": "df623f77",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "rowCount": 13,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/nqs_effects_df623f77.json",
          "rawUrl": "benchmark/results_final/data/nqs_effects_df623f77.txt",
          "metadata": {}
        },
        {
          "name": "shot_noise.txt",
          "relPath": "data/shot_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/shot_noise_9a38821b.json",
          "rawUrl": "benchmark/results_final/data/shot_noise_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "sparams_data.txt",
          "relPath": "data/sparams_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "1.3 KB",
          "hash": "449cc3b5",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "rowCount": 17,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/sparams_data_449cc3b5.json",
          "rawUrl": "benchmark/results_final/data/sparams_data_449cc3b5.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "4b75b043",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds0.3_4b75b043.json",
          "rawUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds0.3_4b75b043.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "75f8ec90",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds0.6_75f8ec90.json",
          "rawUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds0.6_75f8ec90.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.9.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.9.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "cec16926",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds0.9_cec16926.json",
          "rawUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds0.9_cec16926.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds1.2.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds1.2.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "22d5f94a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds1.2_22d5f94a.json",
          "rawUrl": "benchmark/results_final/data/thermal_noise_vgs0.3_vds1.2_22d5f94a.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "4e671b31",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/thermal_noise_vgs0.6_vds0.3_4e671b31.json",
          "rawUrl": "benchmark/results_final/data/thermal_noise_vgs0.6_vds0.3_4e671b31.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/thermal_noise_vgs0.6_vds0.6_9a38821b.json",
          "rawUrl": "benchmark/results_final/data/thermal_noise_vgs0.6_vds0.6_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2703.7 KB",
          "hash": "a1cadb7a",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_charge_a1cadb7a.json",
          "rawUrl": "benchmark/results_final/data/tran_charge_a1cadb7a.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2289.1 KB",
          "hash": "959f58c2",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_delay_959f58c2.json",
          "rawUrl": "benchmark/results_final/data/tran_delay_959f58c2.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3084.3 KB",
          "hash": "fa9f40e4",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 22736,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_large_signal_fa9f40e4.json",
          "rawUrl": "benchmark/results_final/data/tran_large_signal_fa9f40e4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2203.9 KB",
          "hash": "4e0c8c0b",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 21867,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_power_100C_4e0c8c0b.json",
          "rawUrl": "benchmark/results_final/data/tran_power_100C_4e0c8c0b.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2288.3 KB",
          "hash": "7cf6895a",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_power_27C_7cf6895a.json",
          "rawUrl": "benchmark/results_final/data/tran_power_27C_7cf6895a.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "9606.7 KB",
          "hash": "3df4a2e3",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "rowCount": 113072,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_quasi_static_3df4a2e3.json",
          "rawUrl": "benchmark/results_final/data/tran_quasi_static_3df4a2e3.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1927.8 KB",
          "hash": "c3c721fb",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_switching_c3c721fb.json",
          "rawUrl": "benchmark/results_final/data/tran_switching_c3c721fb.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1155.8 KB",
          "hash": "a92cd0f5",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_final/data/tran_switching_power_a92cd0f5.json",
          "rawUrl": "benchmark/results_final/data/tran_switching_power_a92cd0f5.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "ac_cv_characteristics.png",
          "relPath": "plots/ac_cv_characteristics.png",
          "domain": "ac",
          "format": "png",
          "size": "68.4 KB",
          "displayUrl": "benchmark/results_final/plots/ac_cv_characteristics_2f26bb98.png"
        },
        {
          "name": "ac_cv_components.png",
          "relPath": "plots/ac_cv_components.png",
          "domain": "ac",
          "format": "png",
          "size": "151.6 KB",
          "displayUrl": "benchmark/results_final/plots/ac_cv_components_692bda28.png"
        },
        {
          "name": "ac_cv_nqs_effects.png",
          "relPath": "plots/ac_cv_nqs_effects.png",
          "domain": "ac",
          "format": "png",
          "size": "148.5 KB",
          "displayUrl": "benchmark/results_final/plots/ac_cv_nqs_effects_86538c54.png"
        },
        {
          "name": "ac_cv_sparameter_analysis.png",
          "relPath": "plots/ac_cv_sparameter_analysis.png",
          "domain": "ac",
          "format": "png",
          "size": "147.6 KB",
          "displayUrl": "benchmark/results_final/plots/ac_cv_sparameter_analysis_f5f9deb6.png"
        },
        {
          "name": "ac_v_multifreq_characteristics.png",
          "relPath": "plots/ac_v_multifreq_characteristics.png",
          "domain": "ac",
          "format": "png",
          "size": "101.1 KB",
          "displayUrl": "benchmark/results_final/plots/ac_v_multifreq_characteristics_5c48e8a5.png"
        },
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "396.6 KB",
          "displayUrl": "benchmark/results_final/plots/dc_iv_characteristics_24e9b83e.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "132.6 KB",
          "displayUrl": "benchmark/results_final/plots/dc_kcl_verification_3e27897c.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "110.8 KB",
          "displayUrl": "benchmark/results_final/plots/dc_temperature_analysis_f15e5dc8.png"
        },
        {
          "name": "thermal_noise.png",
          "relPath": "plots/thermal_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "67.7 KB",
          "displayUrl": "benchmark/results_final/plots/thermal_noise_01d4dd8b.png"
        },
        {
          "name": "trans_delay_effect.png",
          "relPath": "plots/trans_delay_effect.png",
          "domain": "transient",
          "format": "png",
          "size": "63.2 KB",
          "displayUrl": "benchmark/results_final/plots/trans_delay_effect_46e5bfba.png"
        },
        {
          "name": "trans_large_signal_transient.png",
          "relPath": "plots/trans_large_signal_transient.png",
          "domain": "transient",
          "format": "png",
          "size": "108.9 KB",
          "displayUrl": "benchmark/results_final/plots/trans_large_signal_transient_de4ca9fb.png"
        },
        {
          "name": "trans_quasi_static_iv.png",
          "relPath": "plots/trans_quasi_static_iv.png",
          "domain": "dc",
          "format": "png",
          "size": "52.7 KB",
          "displayUrl": "benchmark/results_final/plots/trans_quasi_static_iv_bebae249.png"
        },
        {
          "name": "trans_quasi_static_time.png",
          "relPath": "plots/trans_quasi_static_time.png",
          "domain": "transient",
          "format": "png",
          "size": "117.9 KB",
          "displayUrl": "benchmark/results_final/plots/trans_quasi_static_time_aeeba7e5.png"
        },
        {
          "name": "trans_switching_response.png",
          "relPath": "plots/trans_switching_response.png",
          "domain": "transient",
          "format": "png",
          "size": "112.1 KB",
          "displayUrl": "benchmark/results_final/plots/trans_switching_response_95782e13.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "7.9 KB",
          "hash": "6b5ccba0",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-20 19:04:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: red'>✗</span> | Data not available |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Temperature Dependence](#temperature-dependence) | <span style='color: red'>✗</span> | Data not available |\n| [Bias Dependence](#detailed-noise-characteristics) | <span style='color: red'>✗</span> | Data not available |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 5. AC Analysis\n- [<span style='color: red'>✗</span>] AC simulations failed\n  - Data not available or failed to read\n## 6. Noise Analysis\n### Thermal Noise Analysis\n- [<span style='color: red'>✗</span>] Thermal Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Flicker Noise Analysis\n- [<span style='color: red'>✗</span>] Flicker Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Short Noise Analysis\n- [<span style='color: red'>✗</span>] Short Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Temperature Dependence\n- [<span style='color: red'>✗</span>] Temperature Dependence verification failed\n  - Data not available or failed to read\n\n### Bias Dependence\n- [<span style='color: red'>✗</span>] Bias Dependence verification failed\n  - Data not available or failed to read\n\n",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "fail",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "ac_5",
                "domain": "ac",
                "name": "Small Signal Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_6",
                "domain": "ac",
                "name": "S-Parameter Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_7",
                "domain": "ac",
                "name": "Non-Quasi-Static (NQS) Effects Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_8",
                "domain": "ac",
                "name": "Charge Conservation Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_9",
                "domain": "noise",
                "name": "Thermal Noise",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_10",
                "domain": "noise",
                "name": "Flicker (1/f) Noise",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_11",
                "domain": "noise",
                "name": "Shot Noise",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_12",
                "domain": "noise",
                "name": "Temperature Dependence",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_13",
                "domain": "noise",
                "name": "Bias Dependence",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "setup_14",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_15",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_16",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre_raw/ac/frequencySweep.ac",
          "format": ".ac",
          "size": "23.0 KB",
          "hash": "3a4e45ce",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/ac/logFile",
          "format": "unknown",
          "size": "842 B",
          "hash": "08fe1279",
          "kind": "other"
        },
        {
          "name": "timeSweep.tran.tran",
          "relPath": "spectre_raw/ac/timeSweep.tran.tran",
          "format": ".tran",
          "size": "772.8 KB",
          "hash": "447d1da3",
          "kind": "other"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre_raw/ac_nqs/frequencySweep.ac",
          "format": ".ac",
          "size": "7.8 KB",
          "hash": "5f1c9e3f",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/ac_nqs/logFile",
          "format": "unknown",
          "size": "679 B",
          "hash": "8efe777b",
          "kind": "other"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre_raw/ac_sp/frequencySweep.ac",
          "format": ".ac",
          "size": "7.8 KB",
          "hash": "deef3972",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/ac_sp/logFile",
          "format": "unknown",
          "size": "678 B",
          "hash": "ea8d1c06",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "0ba2fa9f",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "7ebc2dde",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "617d3405",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "519b076d",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "0776aae1",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "b5d2997a",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "cde5cfbf",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "6664b353",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "d7d0dc7c",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "b7c389f6",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "e65960be",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "1bf1c3db",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "414587c3",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "5562286f",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "02635ffc",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "e696eabc",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "517a5374",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c6273031",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "69149cf7",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4d8459a1",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b4eca285",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "cbda3ab6",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "cc8bf825",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "8a89ae41",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "a4617a72",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d434ecf2",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "2a585203",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5f0038a1",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "93bd294d",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "373c8553",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "6fb48010",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "4639ca70",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8993f394",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e0b8499e",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4dd56ad1",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3e4f66e4",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "37a4fb60",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "bf5f349c",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "08506a5d",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "c44877a8",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "865e6907",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "6cdf4516",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3506fe81",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a34aa141",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "ef81fff8",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c3a7171d",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "fea62d94",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "2bf9454d",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "6f0aca33",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d56f3356",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "73ea80ca",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "ee79a810",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "e67978cb",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "0199f1ae",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "6b325265",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "343744d3",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "49cfdfdc",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "82eddfb2",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5ff61d22",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "704da2f3",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "68b1e07d",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "eb86715e",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "9963987e",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "edf83dff",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "6e2064de",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise/noise1.noise",
          "format": ".noise",
          "size": "686.9 KB",
          "hash": "628f1a6b",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_t-40/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "900cda18",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_t-40/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "550bc8d2",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_t100/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "9b94f543",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_t100/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "315d2836",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_vgs0.3_vds0.3/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "795c836e",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_vgs0.3_vds0.3/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "49de1bbf",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_vgs0.3_vds0.6/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "3a479659",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_vgs0.3_vds0.6/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "6ad06e87",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_vgs0.3_vds0.9/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "3a479659",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_vgs0.3_vds0.9/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "ba1e0c4d",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_vgs0.3_vds1.2/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "4e0bfcb5",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_vgs0.3_vds1.2/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "98535543",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise_vgs0.6_vds0.3/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "8ffaf0c5",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise_vgs0.6_vds0.3/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "e2e5599b",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/transient/logFile",
          "format": "unknown",
          "size": "2.3 KB",
          "hash": "bf3f0c24",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100-000_tran_pwr_100.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_100-000_tran_pwr_100.tran.tran",
          "format": ".tran",
          "size": "51628.0 KB",
          "hash": "0662a8f8",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100_tran_pwr_100.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_100_tran_pwr_100.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "cfea4d0e",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27-000_tran_pwr_27.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_27-000_tran_pwr_27.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "03dd37c4",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27_tran_pwr_27.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_27_tran_pwr_27.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "cc2a8857",
          "kind": "other"
        },
        {
          "name": "tran_charge.tran.tran",
          "relPath": "spectre_raw/transient/tran_charge.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "389ca85b",
          "kind": "other"
        },
        {
          "name": "tran_delay.tran.tran",
          "relPath": "spectre_raw/transient/tran_delay.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "86688b11",
          "kind": "other"
        },
        {
          "name": "tran_ls.tran.tran",
          "relPath": "spectre_raw/transient/tran_ls.tran.tran",
          "format": ".tran",
          "size": "53681.1 KB",
          "hash": "65494e7f",
          "kind": "other"
        },
        {
          "name": "tran_qs.tran.tran",
          "relPath": "spectre_raw/transient/tran_qs.tran.tran",
          "format": ".tran",
          "size": "266953.9 KB",
          "hash": "f227ef3c",
          "kind": "other"
        },
        {
          "name": "tran_sw.tran.tran",
          "relPath": "spectre_raw/transient/tran_sw.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "d9463cab",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_hspice_test": {
      "runId": "results_hspice_test",
      "status": "partial",
      "pdkId": "results_hspice_test",
      "modelId": "results_hspice_test",
      "modelPath": "netlists/hspice_bias.sp",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_hspice_test",
        "suiteName": "results_hspice_test",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "unknown",
      "simulatorVersion": "",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "",
        "simulator": "unknown",
        "simulatorVersion": "",
        "overallStatus": "unavailable"
      },
      "verificationTests": [],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "285 B",
          "hash": "2a1dcbd1",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_hspice_test/data/bias_point_data_2a1dcbd1.json",
          "rawUrl": "benchmark/results_hspice_test/data/bias_point_data_2a1dcbd1.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "76.7 KB",
          "hash": "08540c05",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.000000e+00",
              "2.000000e+02",
              "4.000000e+02",
              "6.000000e+02",
              "8.000000e+02",
              "1.000000e+00",
              "1.200000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_hspice_test/data/iv_data_-40_08540c05.json",
          "rawUrl": "benchmark/results_hspice_test/data/iv_data_-40_08540c05.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "76.7 KB",
          "hash": "757ee63e",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.000000e+00",
              "2.000000e+02",
              "4.000000e+02",
              "6.000000e+02",
              "8.000000e+02",
              "1.000000e+00",
              "1.200000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_hspice_test/data/iv_data_0_757ee63e.json",
          "rawUrl": "benchmark/results_hspice_test/data/iv_data_0_757ee63e.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "76.7 KB",
          "hash": "f81f6142",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.000000e+00",
              "2.000000e+02",
              "4.000000e+02",
              "6.000000e+02",
              "8.000000e+02",
              "1.000000e+00",
              "1.200000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_hspice_test/data/iv_data_100_f81f6142.json",
          "rawUrl": "benchmark/results_hspice_test/data/iv_data_100_f81f6142.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "76.7 KB",
          "hash": "a1514df7",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.000000e+00",
              "2.000000e+02",
              "4.000000e+02",
              "6.000000e+02",
              "8.000000e+02",
              "1.000000e+00",
              "1.200000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_hspice_test/data/iv_data_150_a1514df7.json",
          "rawUrl": "benchmark/results_hspice_test/data/iv_data_150_a1514df7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "76.7 KB",
          "hash": "fe1f8476",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.000000e+00",
              "2.000000e+02",
              "4.000000e+02",
              "6.000000e+02",
              "8.000000e+02",
              "1.000000e+00",
              "1.200000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_hspice_test/data/iv_data_25_fe1f8476.json",
          "rawUrl": "benchmark/results_hspice_test/data/iv_data_25_fe1f8476.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "76.7 KB",
          "hash": "f7a255ce",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.000000e+00",
              "2.000000e+02",
              "4.000000e+02",
              "6.000000e+02",
              "8.000000e+02",
              "1.000000e+00",
              "1.200000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_hspice_test/data/iv_data_50_f7a255ce.json",
          "rawUrl": "benchmark/results_hspice_test/data/iv_data_50_f7a255ce.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [],
      "otherArtifacts": [
        {
          "name": "hspice_bias.sp",
          "relPath": "netlists/hspice_bias.sp",
          "size": "998 B",
          "hash": "40417b68",
          "kind": "netlist"
        },
        {
          "name": "hspice_dc.sp",
          "relPath": "netlists/hspice_dc.sp",
          "size": "542 B",
          "hash": "90b140ce",
          "kind": "netlist"
        },
        {
          "name": "bias.ic0",
          "relPath": "netlists/bias.ic0",
          "format": ".ic0",
          "size": "606 B",
          "hash": "079d8bd3",
          "kind": "other"
        },
        {
          "name": "bias.ic1",
          "relPath": "netlists/bias.ic1",
          "format": ".ic1",
          "size": "584 B",
          "hash": "9602aead",
          "kind": "other"
        },
        {
          "name": "bias.ic2",
          "relPath": "netlists/bias.ic2",
          "format": ".ic2",
          "size": "584 B",
          "hash": "bb0f1af9",
          "kind": "other"
        },
        {
          "name": "bias.ic3",
          "relPath": "netlists/bias.ic3",
          "format": ".ic3",
          "size": "584 B",
          "hash": "b01bbb2d",
          "kind": "other"
        },
        {
          "name": "bias.ic4",
          "relPath": "netlists/bias.ic4",
          "format": ".ic4",
          "size": "584 B",
          "hash": "e3e0b13a",
          "kind": "other"
        },
        {
          "name": "bias.ic5",
          "relPath": "netlists/bias.ic5",
          "format": ".ic5",
          "size": "584 B",
          "hash": "4e70710e",
          "kind": "other"
        },
        {
          "name": "bias.ic6",
          "relPath": "netlists/bias.ic6",
          "format": ".ic6",
          "size": "584 B",
          "hash": "0c23681c",
          "kind": "other"
        },
        {
          "name": "bias.ic7",
          "relPath": "netlists/bias.ic7",
          "format": ".ic7",
          "size": "584 B",
          "hash": "bfe14ce9",
          "kind": "other"
        },
        {
          "name": "bias.ic8",
          "relPath": "netlists/bias.ic8",
          "format": ".ic8",
          "size": "584 B",
          "hash": "f5024841",
          "kind": "other"
        },
        {
          "name": "bias.lis",
          "relPath": "netlists/bias.lis",
          "format": ".lis",
          "size": "28.1 KB",
          "hash": "b374743c",
          "kind": "other"
        },
        {
          "name": "bias.st0",
          "relPath": "netlists/bias.st0",
          "format": ".st0",
          "size": "8.4 KB",
          "hash": "592e361b",
          "kind": "other"
        },
        {
          "name": "dc.lis",
          "relPath": "netlists/dc.lis",
          "format": ".lis",
          "size": "303.7 KB",
          "hash": "8e55430b",
          "kind": "other"
        },
        {
          "name": "dc.st0",
          "relPath": "netlists/dc.st0",
          "format": ".st0",
          "size": "12.3 KB",
          "hash": "8fecd21b",
          "kind": "other"
        },
        {
          "name": "dc.sw.grp",
          "relPath": "netlists/dc.sw.grp",
          "format": ".grp",
          "size": "20.8 KB",
          "hash": "4fef27ba",
          "kind": "other"
        },
        {
          "name": "dc.sw0",
          "relPath": "netlists/dc.sw0",
          "format": ".sw0",
          "size": "37.3 KB",
          "hash": "0a12e981",
          "kind": "other"
        },
        {
          "name": "dc.sw1",
          "relPath": "netlists/dc.sw1",
          "format": ".sw1",
          "size": "37.3 KB",
          "hash": "fb71d3c7",
          "kind": "other"
        },
        {
          "name": "dc.sw2",
          "relPath": "netlists/dc.sw2",
          "format": ".sw2",
          "size": "37.3 KB",
          "hash": "0ef40a4a",
          "kind": "other"
        },
        {
          "name": "dc.sw3",
          "relPath": "netlists/dc.sw3",
          "format": ".sw3",
          "size": "37.3 KB",
          "hash": "66f290c1",
          "kind": "other"
        },
        {
          "name": "dc.sw4",
          "relPath": "netlists/dc.sw4",
          "format": ".sw4",
          "size": "37.3 KB",
          "hash": "49df15d0",
          "kind": "other"
        },
        {
          "name": "dc.sw5",
          "relPath": "netlists/dc.sw5",
          "format": ".sw5",
          "size": "37.3 KB",
          "hash": "80b986a6",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_all4": {
      "runId": "results_spectre_all4",
      "status": "failed",
      "pdkId": "results_spectre_all4",
      "modelId": "results_spectre_all4",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_all4",
        "suiteName": "results_spectre_all4",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:53:29\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: red'>✗</span> | Data not available |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Noise simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 5. AC Analysis\n- [<span style='color: red'>✗</span>] AC simulations failed\n  - Data not available or failed to read\n## 6. Noise Analysis\n- [<span style='color: red'>✗</span>] Noise simulations failed\n  - Data not available or failed to read",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "fail"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "ac_5",
          "domain": "ac",
          "name": "Small Signal Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "ac_6",
          "domain": "ac",
          "name": "S-Parameter Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "ac_7",
          "domain": "ac",
          "name": "Non-Quasi-Static (NQS) Effects Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "ac_8",
          "domain": "ac",
          "name": "Charge Conservation Analysis",
          "status": "fail",
          "detail": "Data not available"
        },
        {
          "testId": "setup_9",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_10",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_11",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_all4/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "charge_conservation.txt",
          "relPath": "data/charge_conservation.txt",
          "domain": "overview",
          "format": "txt",
          "size": "8.0 KB",
          "hash": "cc7abb71",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5"
          ],
          "rowCount": 79,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "8.3416666667e-03",
              "2.5025000000e-02",
              "5.8391666667e-02",
              "1.1321590936e-01",
              "1.5314989694e-01",
              "2.1400064730e-01",
              "3.2591961884e-01",
              "5.4975756192e-01",
              "7.7487878096e-01",
              "8.8743939048e-01",
              "9.4371969524e-01",
              "1.0000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_all4/data/charge_conservation_cc7abb71.json",
          "rawUrl": "benchmark/results_spectre_all4/data/charge_conservation_cc7abb71.txt",
          "metadata": {}
        },
        {
          "name": "cmatrix_data.txt",
          "relPath": "data/cmatrix_data.txt",
          "domain": "overview",
          "format": "txt",
          "size": "3.6 KB",
          "hash": "7d5b755e",
          "columns": [
            "Vg",
            "Cgg",
            "Cdg",
            "Csg",
            "Cbg",
            "Cgd",
            "Cdd",
            "Csd",
            "Cbd",
            "Cgs",
            "Cds",
            "Css",
            "Cbs",
            "Cgb",
            "Cdb",
            "Csb",
            "Cbb"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg",
            "Cdg",
            "Csg",
            "Cbg",
            "Cgd",
            "Cdd",
            "Csd",
            "Cbd",
            "Cgs",
            "Cds",
            "Css",
            "Cbs",
            "Cgb",
            "Cdb",
            "Csb",
            "Cbb"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/cmatrix_data_7d5b755e.json",
          "rawUrl": "benchmark/results_spectre_all4/data/cmatrix_data_7d5b755e.txt",
          "metadata": {}
        },
        {
          "name": "cv_data.txt",
          "relPath": "data/cv_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "4.2 KB",
          "hash": "8bf2d832",
          "columns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/cv_data_8bf2d832.json",
          "rawUrl": "benchmark/results_spectre_all4/data/cv_data_8bf2d832.txt",
          "metadata": {}
        },
        {
          "name": "flicker_noise.txt",
          "relPath": "data/flicker_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/flicker_noise_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/flicker_noise_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_spectre_all4/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_spectre_all4/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_spectre_all4/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_spectre_all4/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_spectre_all4/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_spectre_all4/data/iv_data_50_e5573004.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp-40.txt",
          "relPath": "data/noise_temp-40.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/noise_temp-40_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/noise_temp-40_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp0.txt",
          "relPath": "data/noise_temp0.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/noise_temp0_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/noise_temp0_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp100.txt",
          "relPath": "data/noise_temp100.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/noise_temp100_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/noise_temp100_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp150.txt",
          "relPath": "data/noise_temp150.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/noise_temp150_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/noise_temp150_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp27.txt",
          "relPath": "data/noise_temp27.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/noise_temp27_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/noise_temp27_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp50.txt",
          "relPath": "data/noise_temp50.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/noise_temp50_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/noise_temp50_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "nqs_effects.txt",
          "relPath": "data/nqs_effects.txt",
          "domain": "ac",
          "format": "txt",
          "size": "163 B",
          "hash": "a241d275",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "rowCount": 4,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/nqs_effects_a241d275.json",
          "rawUrl": "benchmark/results_spectre_all4/data/nqs_effects_a241d275.txt",
          "metadata": {}
        },
        {
          "name": "shot_noise.txt",
          "relPath": "data/shot_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/shot_noise_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/shot_noise_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "sparams_data.txt",
          "relPath": "data/sparams_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "218 B",
          "hash": "de7f9010",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "rowCount": 4,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/sparams_data_de7f9010.json",
          "rawUrl": "benchmark/results_spectre_all4/data/sparams_data_de7f9010.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds0.3_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds0.3_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.6.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds0.6_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds0.6_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.9.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds0.9.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds0.9_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds0.9_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds1.2.txt",
          "relPath": "data/thermal_noise_vgs0.3_vds1.2.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds1.2_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.3_vds1.2_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.3.txt",
          "relPath": "data/thermal_noise_vgs0.6_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "0 B",
          "hash": "d41d8cd9",
          "columns": null,
          "rowCount": 0,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.6_vds0.3_d41d8cd9.txt",
          "rawUrl": "benchmark/results_spectre_all4/data/thermal_noise_vgs0.6_vds0.3_d41d8cd9.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2703.7 KB",
          "hash": "a1cadb7a",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_charge_a1cadb7a.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_charge_a1cadb7a.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2289.1 KB",
          "hash": "959f58c2",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_delay_959f58c2.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_delay_959f58c2.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3084.3 KB",
          "hash": "fa9f40e4",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 22736,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_large_signal_fa9f40e4.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_large_signal_fa9f40e4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2203.9 KB",
          "hash": "4e0c8c0b",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 21867,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_power_100C_4e0c8c0b.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_power_100C_4e0c8c0b.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2288.3 KB",
          "hash": "7cf6895a",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_power_27C_7cf6895a.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_power_27C_7cf6895a.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "9606.7 KB",
          "hash": "3df4a2e3",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "rowCount": 113072,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_quasi_static_3df4a2e3.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_quasi_static_3df4a2e3.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1927.8 KB",
          "hash": "c3c721fb",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_switching_c3c721fb.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_switching_c3c721fb.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1155.8 KB",
          "hash": "a92cd0f5",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_all4/data/tran_switching_power_a92cd0f5.json",
          "rawUrl": "benchmark/results_spectre_all4/data/tran_switching_power_a92cd0f5.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "396.6 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/dc_iv_characteristics_24e9b83e.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "132.6 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/dc_kcl_verification_3e27897c.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "110.8 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/dc_temperature_analysis_f15e5dc8.png"
        },
        {
          "name": "trans_delay_effect.png",
          "relPath": "plots/trans_delay_effect.png",
          "domain": "transient",
          "format": "png",
          "size": "63.2 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/trans_delay_effect_46e5bfba.png"
        },
        {
          "name": "trans_large_signal_transient.png",
          "relPath": "plots/trans_large_signal_transient.png",
          "domain": "transient",
          "format": "png",
          "size": "108.9 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/trans_large_signal_transient_de4ca9fb.png"
        },
        {
          "name": "trans_quasi_static_iv.png",
          "relPath": "plots/trans_quasi_static_iv.png",
          "domain": "dc",
          "format": "png",
          "size": "52.7 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/trans_quasi_static_iv_bebae249.png"
        },
        {
          "name": "trans_quasi_static_time.png",
          "relPath": "plots/trans_quasi_static_time.png",
          "domain": "transient",
          "format": "png",
          "size": "117.9 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/trans_quasi_static_time_aeeba7e5.png"
        },
        {
          "name": "trans_switching_response.png",
          "relPath": "plots/trans_switching_response.png",
          "domain": "transient",
          "format": "png",
          "size": "112.1 KB",
          "displayUrl": "benchmark/results_spectre_all4/plots/trans_switching_response_95782e13.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "6.9 KB",
          "hash": "11248f39",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:53:29\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: red'>✗</span> | Data not available |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Noise simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 5. AC Analysis\n- [<span style='color: red'>✗</span>] AC simulations failed\n  - Data not available or failed to read\n## 6. Noise Analysis\n- [<span style='color: red'>✗</span>] Noise simulations failed\n  - Data not available or failed to read",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "fail",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "ac_5",
                "domain": "ac",
                "name": "Small Signal Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_6",
                "domain": "ac",
                "name": "S-Parameter Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_7",
                "domain": "ac",
                "name": "Non-Quasi-Static (NQS) Effects Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_8",
                "domain": "ac",
                "name": "Charge Conservation Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "setup_9",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_10",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_11",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre_raw/ac/frequencySweep.ac",
          "format": ".ac",
          "size": "23.0 KB",
          "hash": "78781ff4",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/ac/logFile",
          "format": "unknown",
          "size": "842 B",
          "hash": "3bf85ccd",
          "kind": "other"
        },
        {
          "name": "timeSweep.tran.tran",
          "relPath": "spectre_raw/ac/timeSweep.tran.tran",
          "format": ".tran",
          "size": "772.8 KB",
          "hash": "27f82f96",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "23e2202a",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "7231182b",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "f33e7eac",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "e559e4bc",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "0af5f822",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "3cb745e4",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "3def2e1a",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "7a0d6d91",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "a46fe3fa",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "97c67b3b",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "0c8770d9",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "7511392a",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "5f1ed03f",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "f05eaab9",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "1a5ac192",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "d87a78c0",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "da25aaa5",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "481909b8",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1909bcad",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "833a9f89",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "20bca79b",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c3174a40",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "7bf183e9",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "541ab569",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "345580f3",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "ef9f0d3f",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "27771eb0",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "61cf6be5",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "47697ebc",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d8372a91",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "39486aed",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "23e7b3fa",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "41113464",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "23864cd7",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "e291924b",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "f35b8f26",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c823e00e",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "671d1576",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "c0d76186",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "739ab463",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "cc19b869",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "949123a5",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d56230e2",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c9a9dedb",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a3df15d2",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "105f0c4f",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "a4e4f773",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "68dcaf22",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "aa5ad16a",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "fd5cc514",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5ba0e453",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "00808418",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "008fb4c5",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1213798f",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "d16e9c14",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "8e909bf1",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "0fc55ddb",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "f90a2908",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "19fc7d03",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "520016e7",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "be630062",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "6a3f2e89",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "bde52b63",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "9d66237f",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/noise/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "4de3fe8b",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre_raw/noise/noise1.noise",
          "format": ".noise",
          "size": "686.9 KB",
          "hash": "56a99611",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/transient/logFile",
          "format": "unknown",
          "size": "2.3 KB",
          "hash": "200fce08",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100-000_tran_pwr_100.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_100-000_tran_pwr_100.tran.tran",
          "format": ".tran",
          "size": "51628.0 KB",
          "hash": "ec323eb0",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100_tran_pwr_100.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_100_tran_pwr_100.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "c065f1ea",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27-000_tran_pwr_27.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_27-000_tran_pwr_27.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "cd1bbbbb",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27_tran_pwr_27.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_27_tran_pwr_27.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "8d4bc7b6",
          "kind": "other"
        },
        {
          "name": "tran_charge.tran.tran",
          "relPath": "spectre_raw/transient/tran_charge.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "23437865",
          "kind": "other"
        },
        {
          "name": "tran_delay.tran.tran",
          "relPath": "spectre_raw/transient/tran_delay.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "8d411a78",
          "kind": "other"
        },
        {
          "name": "tran_ls.tran.tran",
          "relPath": "spectre_raw/transient/tran_ls.tran.tran",
          "format": ".tran",
          "size": "53681.1 KB",
          "hash": "c4286c47",
          "kind": "other"
        },
        {
          "name": "tran_qs.tran.tran",
          "relPath": "spectre_raw/transient/tran_qs.tran.tran",
          "format": ".tran",
          "size": "266953.9 KB",
          "hash": "25aaeca5",
          "kind": "other"
        },
        {
          "name": "tran_sw.tran.tran",
          "relPath": "spectre_raw/transient/tran_sw.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "69f8343a",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_dc": {
      "runId": "results_spectre_dc",
      "status": "completed",
      "pdkId": "results_spectre_dc",
      "modelId": "results_spectre_dc",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_dc",
        "suiteName": "results_spectre_dc",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "46+",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 12:45:58\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-46+\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: red'>✗</span>] IV data is Missing\n\n### Bias Point Analysis\n- [<span style='color: red'>✗</span>] Bias data is Missing\n\n### Temperature Analysis\n- [<span style='color: red'>✗</span>] Temperature data is Missing\n\n### Thermodynamic Analysis\n- [<span style='color: red'>✗</span>] Thermodynamic data is Missing\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n",
        "simulator": "ngspice",
        "simulatorVersion": "46+",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "setup_1",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_2",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_3",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_dc/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "6543d0ed",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc/data/iv_data_-40_6543d0ed.json",
          "rawUrl": "benchmark/results_spectre_dc/data/iv_data_-40_6543d0ed.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "c1c7f459",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc/data/iv_data_0_c1c7f459.json",
          "rawUrl": "benchmark/results_spectre_dc/data/iv_data_0_c1c7f459.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "83ba5814",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc/data/iv_data_100_83ba5814.json",
          "rawUrl": "benchmark/results_spectre_dc/data/iv_data_100_83ba5814.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "defec710",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc/data/iv_data_150_defec710.json",
          "rawUrl": "benchmark/results_spectre_dc/data/iv_data_150_defec710.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "83f45b00",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc/data/iv_data_25_83f45b00.json",
          "rawUrl": "benchmark/results_spectre_dc/data/iv_data_25_83f45b00.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "84415916",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc/data/iv_data_50_84415916.json",
          "rawUrl": "benchmark/results_spectre_dc/data/iv_data_50_84415916.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "2.1 KB",
          "hash": "e5ed943a",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 12:45:58\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-46+\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: red'>✗</span>] IV data is Missing\n\n### Bias Point Analysis\n- [<span style='color: red'>✗</span>] Bias data is Missing\n\n### Temperature Analysis\n- [<span style='color: red'>✗</span>] Temperature data is Missing\n\n### Thermodynamic Analysis\n- [<span style='color: red'>✗</span>] Thermodynamic data is Missing\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n",
            "simulator": "ngspice",
            "simulatorVersion": "46+",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "setup_1",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_2",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_3",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "ff42ece8",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "f008007b",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "74c99737",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "ad085cd1",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "0344f7f8",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "768500e8",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "628097ba",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "6ac6858e",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "57c44217",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "26e683c8",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "748a724e",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "9327d8a3",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "1a83f6ce",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "e73a6617",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "52a5f87a",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c9b5f063",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "4e46aa4c",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "bc7c180e",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3c3e7d68",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8858ef4c",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "eaccbfb9",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4766b786",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "ba9ccba1",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "a2e89478",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "2ba15944",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "5238c56e",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "eb5ee612",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "97723ad4",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a0dcb7c3",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4d128727",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "288f07d4",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "b713ee56",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "fe8eacd6",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "054d0e57",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "0a633c43",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "80f60662",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1b14bcd8",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c6b8adcd",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "71895203",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "fc6553bb",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "4ddaa9d1",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8fc2846d",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8152db66",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "01a708cb",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "41fe6929",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "edbfd10f",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "1c2049b7",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "79f45b53",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "ab62fa5f",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "435da7ec",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a8bd7680",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a6bd837d",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "0d7c0ed0",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "29fdfa9f",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "b09665ca",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "be1bd0f6",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "7fa6e2fd",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "83c15d7f",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a7ccf32d",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a371c358",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a265c606",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "849316c2",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "12818a4b",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "ebaad499",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_dc2": {
      "runId": "results_spectre_dc2",
      "status": "completed",
      "pdkId": "results_spectre_dc2",
      "modelId": "results_spectre_dc2",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_dc2",
        "suiteName": "results_spectre_dc2",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 14:51:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: red'>✗</span>] IV data is Missing\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: red'>✗</span>] Temperature data is Missing\n\n### Thermodynamic Analysis\n- [<span style='color: red'>✗</span>] Thermodynamic data is Missing\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "setup_2",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_3",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_4",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc2/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "6543d0ed",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc2/data/iv_data_-40_6543d0ed.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/iv_data_-40_6543d0ed.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "c1c7f459",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc2/data/iv_data_0_c1c7f459.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/iv_data_0_c1c7f459.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "83ba5814",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc2/data/iv_data_100_83ba5814.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/iv_data_100_83ba5814.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "defec710",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc2/data/iv_data_150_defec710.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/iv_data_150_defec710.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "83f45b00",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc2/data/iv_data_25_83f45b00.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/iv_data_25_83f45b00.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "100.3 KB",
          "hash": "84415916",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "rowCount": 847,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "2.0000000000e-01",
              "4.0000000000e-01",
              "6.0000000000e-01",
              "8.0000000000e-01",
              "1.0000000000e+00",
              "1.2000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_dc2/data/iv_data_50_84415916.json",
          "rawUrl": "benchmark/results_spectre_dc2/data/iv_data_50_84415916.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "2.9 KB",
          "hash": "54bc3e37",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 14:51:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: red'>✗</span>] IV data is Missing\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: red'>✗</span>] Temperature data is Missing\n\n### Thermodynamic Analysis\n- [<span style='color: red'>✗</span>] Thermodynamic data is Missing\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "setup_2",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_3",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_4",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "b06dfc6e",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "a7db04ff",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "86dc1820",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "f2604204",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "db5adac1",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "3a4cf04d",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "50a47015",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "5d04850a",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "82cc8fc6",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "320fb0a5",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "2f62bded",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "2bbae6a6",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "db54ee37",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "92608ab6",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "61348b99",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "a7006cc4",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "fba54c85",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e0d87dd9",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b02a3b1d",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "41a66d90",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "27d0a2f3",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "7bd41c46",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "56218955",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "90788bb5",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8f0f98f7",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "50ac4b64",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "100707c3",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "287b3db0",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "da45fd3f",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "21d7e91d",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "fb20b895",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "bc61f03f",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "da9be8ba",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8d989df5",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "af17ae37",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "86abe2d4",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c8eec445",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8be1f12e",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "5b15913e",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "cd01b260",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e22375a7",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "922ce236",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "53b3526d",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "53f21f96",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "984de876",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b76ee409",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "dabed82c",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "17e69865",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "57583ece",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "91e1d798",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b9ddb420",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "53b87b30",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "83e75088",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "14d1acac",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "70cb5af7",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "b2b24e80",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e44b2b4c",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "3cb7c285",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "db28fb8c",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "89d0b7d0",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a74e87c3",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "77a259bd",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "3176be94",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "e08dd69f",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_dc3": {
      "runId": "results_spectre_dc3",
      "status": "completed",
      "pdkId": "results_spectre_dc3",
      "modelId": "results_spectre_dc3",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_dc3",
        "suiteName": "results_spectre_dc3",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 14:53:12\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "setup_5",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_6",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_7",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_dc3/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_spectre_dc3/data/iv_data_50_e5573004.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "396.6 KB",
          "displayUrl": "benchmark/results_spectre_dc3/plots/dc_iv_characteristics_24e9b83e.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "132.6 KB",
          "displayUrl": "benchmark/results_spectre_dc3/plots/dc_kcl_verification_3e27897c.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "110.8 KB",
          "displayUrl": "benchmark/results_spectre_dc3/plots/dc_temperature_analysis_f15e5dc8.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "4.7 KB",
          "hash": "e5771e0b",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 14:53:12\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "setup_5",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_6",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_7",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "2936be4b",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "056e26af",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "d1fd5ba9",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "5d90d50d",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "5d25533e",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "aca57a02",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "24b31839",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "d153ad88",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "1611e236",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "2fcbca47",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "2df84344",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "88dfb01d",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "eab40769",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "2e36c752",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "583f0ed0",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "2131dd2a",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "29c6324f",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c3b5fc07",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "cce8c67b",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "15482881",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "7868034c",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "bd5034e4",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "1698cf73",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "4603ed4b",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d8a97b67",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "fcb0ba40",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3f347d97",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c6aa7900",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "abdaac1b",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "fc93d6f0",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "b4140aef",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "fe52f3ee",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "7d410cc9",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "ae9da134",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "465b3603",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c43ddada",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "fc85bc5c",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "0baaea94",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "cb5d579c",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "63aedfb6",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e14f3a21",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e9210782",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "86e437de",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "7fc4d6b7",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "44ab4330",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "906913a8",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "08a2949d",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "2890058c",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "40c9b218",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "83c2c690",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "45ce6691",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "fcb8d64e",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3a763176",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a5ca7cc9",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "c85c5f1f",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "7f96b785",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d9a7dc35",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e1bf3c07",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "ada9c82b",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4da09107",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "310e8ec5",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8536f05a",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "648f58d5",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "b671653b",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_final": {
      "runId": "results_spectre_final",
      "status": "completed",
      "pdkId": "results_spectre_final",
      "modelId": "results_spectre_final",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_final",
        "suiteName": "results_spectre_final",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:17:09\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "setup_5",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_6",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_7",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_final/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_spectre_final/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_spectre_final/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_spectre_final/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_spectre_final/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_spectre_final/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_spectre_final/data/iv_data_50_e5573004.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2703.7 KB",
          "hash": "a1cadb7a",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_charge_a1cadb7a.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_charge_a1cadb7a.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2289.1 KB",
          "hash": "959f58c2",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_delay_959f58c2.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_delay_959f58c2.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3084.3 KB",
          "hash": "fa9f40e4",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 22736,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_large_signal_fa9f40e4.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_large_signal_fa9f40e4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2203.9 KB",
          "hash": "4e0c8c0b",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 21867,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_power_100C_4e0c8c0b.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_power_100C_4e0c8c0b.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2288.3 KB",
          "hash": "7cf6895a",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_power_27C_7cf6895a.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_power_27C_7cf6895a.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "9606.7 KB",
          "hash": "3df4a2e3",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "rowCount": 113072,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_quasi_static_3df4a2e3.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_quasi_static_3df4a2e3.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1927.8 KB",
          "hash": "c3c721fb",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_switching_c3c721fb.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_switching_c3c721fb.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1155.8 KB",
          "hash": "a92cd0f5",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final/data/tran_switching_power_a92cd0f5.json",
          "rawUrl": "benchmark/results_spectre_final/data/tran_switching_power_a92cd0f5.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "396.6 KB",
          "displayUrl": "benchmark/results_spectre_final/plots/dc_iv_characteristics_24e9b83e.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "132.6 KB",
          "displayUrl": "benchmark/results_spectre_final/plots/dc_kcl_verification_3e27897c.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "110.8 KB",
          "displayUrl": "benchmark/results_spectre_final/plots/dc_temperature_analysis_f15e5dc8.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "5.3 KB",
          "hash": "5393c463",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:17:09\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "setup_5",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_6",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_7",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "0b3737cd",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "53194ef3",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "78e73ede",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "3adf8d41",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "ccd07675",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "a3369bd2",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "e15f8ad3",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "445a0fd7",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "ea421b28",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "e774fa4b",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "5e0de891",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "6d350007",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "03606033",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "9849f90b",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "69cec729",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "6689c6fc",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "03130f8e",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "92501370",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1be7d44d",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c5d05878",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5835a3e2",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a4bdd3ba",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "024116d2",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "5da783ea",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d3704531",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "006f00c1",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "f17077a2",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d028500c",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "9deb4f9a",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "6b20464d",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "80e1075c",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "2e778d24",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8395a19a",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "bb147033",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "2d4b6919",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d24fde0c",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5be2504a",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "11ddbde0",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "0d11416d",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "ee62ac1f",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "32fe684a",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "37e02b60",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "9b16f190",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "be32caaa",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "136fed74",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1fd57708",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "530a0755",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "ea0ab830",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "67f2d74e",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d8552fb5",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "65fc0a2a",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "6da9af3e",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8ed4e9a3",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d92123ec",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "192b316c",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "bb613280",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "b305e42b",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "1edbcec3",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5beb468a",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b5d01267",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "360a774f",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3b1f90c7",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "00674099",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "d3452b0e",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/transient/logFile",
          "format": "unknown",
          "size": "2.3 KB",
          "hash": "2192d387",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100-000_tran_pwr_100.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_100-000_tran_pwr_100.tran.tran",
          "format": ".tran",
          "size": "51628.0 KB",
          "hash": "75e044c2",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100_tran_pwr_100.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_100_tran_pwr_100.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "405b1648",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27-000_tran_pwr_27.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_27-000_tran_pwr_27.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "1ac6a303",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27_tran_pwr_27.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_27_tran_pwr_27.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "471b812c",
          "kind": "other"
        },
        {
          "name": "tran_charge.tran.tran",
          "relPath": "spectre_raw/transient/tran_charge.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "282dd5b0",
          "kind": "other"
        },
        {
          "name": "tran_delay.tran.tran",
          "relPath": "spectre_raw/transient/tran_delay.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "b4638d05",
          "kind": "other"
        },
        {
          "name": "tran_ls.tran.tran",
          "relPath": "spectre_raw/transient/tran_ls.tran.tran",
          "format": ".tran",
          "size": "53681.1 KB",
          "hash": "b4724a38",
          "kind": "other"
        },
        {
          "name": "tran_qs.tran.tran",
          "relPath": "spectre_raw/transient/tran_qs.tran.tran",
          "format": ".tran",
          "size": "266953.9 KB",
          "hash": "64c6569a",
          "kind": "other"
        },
        {
          "name": "tran_sw.tran.tran",
          "relPath": "spectre_raw/transient/tran_sw.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "fd0d2744",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_final2": {
      "runId": "results_spectre_final2",
      "status": "completed",
      "pdkId": "results_spectre_final2",
      "modelId": "results_spectre_final2",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_final2",
        "suiteName": "results_spectre_final2",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:28:15\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "setup_5",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_6",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_7",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_final2/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_spectre_final2/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_spectre_final2/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_spectre_final2/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_spectre_final2/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_spectre_final2/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_spectre_final2/data/iv_data_50_e5573004.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2703.7 KB",
          "hash": "a1cadb7a",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_charge_a1cadb7a.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_charge_a1cadb7a.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2289.1 KB",
          "hash": "959f58c2",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_delay_959f58c2.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_delay_959f58c2.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3084.3 KB",
          "hash": "fa9f40e4",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 22736,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_large_signal_fa9f40e4.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_large_signal_fa9f40e4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2203.9 KB",
          "hash": "4e0c8c0b",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 21867,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_power_100C_4e0c8c0b.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_power_100C_4e0c8c0b.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2288.3 KB",
          "hash": "7cf6895a",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_power_27C_7cf6895a.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_power_27C_7cf6895a.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "9606.7 KB",
          "hash": "3df4a2e3",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "rowCount": 113072,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_quasi_static_3df4a2e3.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_quasi_static_3df4a2e3.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1927.8 KB",
          "hash": "c3c721fb",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_switching_c3c721fb.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_switching_c3c721fb.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1155.8 KB",
          "hash": "a92cd0f5",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_final2/data/tran_switching_power_a92cd0f5.json",
          "rawUrl": "benchmark/results_spectre_final2/data/tran_switching_power_a92cd0f5.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "396.6 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/dc_iv_characteristics_24e9b83e.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "132.6 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/dc_kcl_verification_3e27897c.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "110.8 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/dc_temperature_analysis_f15e5dc8.png"
        },
        {
          "name": "trans_delay_effect.png",
          "relPath": "plots/trans_delay_effect.png",
          "domain": "transient",
          "format": "png",
          "size": "63.2 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/trans_delay_effect_46e5bfba.png"
        },
        {
          "name": "trans_large_signal_transient.png",
          "relPath": "plots/trans_large_signal_transient.png",
          "domain": "transient",
          "format": "png",
          "size": "108.9 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/trans_large_signal_transient_de4ca9fb.png"
        },
        {
          "name": "trans_quasi_static_iv.png",
          "relPath": "plots/trans_quasi_static_iv.png",
          "domain": "dc",
          "format": "png",
          "size": "52.7 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/trans_quasi_static_iv_bebae249.png"
        },
        {
          "name": "trans_quasi_static_time.png",
          "relPath": "plots/trans_quasi_static_time.png",
          "domain": "transient",
          "format": "png",
          "size": "117.9 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/trans_quasi_static_time_aeeba7e5.png"
        },
        {
          "name": "trans_switching_response.png",
          "relPath": "plots/trans_switching_response.png",
          "domain": "transient",
          "format": "png",
          "size": "112.1 KB",
          "displayUrl": "benchmark/results_spectre_final2/plots/trans_switching_response_95782e13.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "5.3 KB",
          "hash": "f69f42c4",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:28:15\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "setup_5",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_6",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_7",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "85603ff3",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "ed7fba46",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "8b8e1c69",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "322c1016",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "76e5afb7",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "677ced68",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "5de6c4f4",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "3f8b1949",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "6ee75c7b",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "73535e5f",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "35a80b87",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "c8a353a4",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "a712470c",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "17d9570f",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "d4a551ca",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "66332572",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "79206e65",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "806f4f83",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "49f47344",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "40b21ccd",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3432c645",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1c2c7b4c",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "db2a35ab",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "cf31b417",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c2170626",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "377befcf",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "ce891309",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4c1caf49",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a367c622",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5f54129b",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "88028db1",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "7a58043f",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "335ec732",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "cf22896d",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "60e9e7cb",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "76379b03",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a0f832d1",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "a5995e04",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "ce692584",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "ec8b8f8f",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "10e3a29b",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c1538a53",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "7203ae32",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "301db622",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "311070e3",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c77ab5cb",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "1e6b5f83",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "247f409a",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "85a1d958",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "2618addc",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "63876463",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3a4709f5",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "76568a45",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "f594acd3",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "bae2fefb",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "141740d8",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c5b4ce4d",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "9168954e",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "21a3166b",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "27f73e02",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "6227cd62",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "092f573e",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "04761aad",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "455e4ae0",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/transient/logFile",
          "format": "unknown",
          "size": "2.3 KB",
          "hash": "5d6aee96",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100-000_tran_pwr_100.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_100-000_tran_pwr_100.tran.tran",
          "format": ".tran",
          "size": "51628.0 KB",
          "hash": "d144ee69",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100_tran_pwr_100.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_100_tran_pwr_100.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "82ae1f1f",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27-000_tran_pwr_27.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_27-000_tran_pwr_27.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "87381484",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27_tran_pwr_27.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_27_tran_pwr_27.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "9bbc0d4e",
          "kind": "other"
        },
        {
          "name": "tran_charge.tran.tran",
          "relPath": "spectre_raw/transient/tran_charge.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "48bde38b",
          "kind": "other"
        },
        {
          "name": "tran_delay.tran.tran",
          "relPath": "spectre_raw/transient/tran_delay.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "d96ed06f",
          "kind": "other"
        },
        {
          "name": "tran_ls.tran.tran",
          "relPath": "spectre_raw/transient/tran_ls.tran.tran",
          "format": ".tran",
          "size": "53681.1 KB",
          "hash": "2def8710",
          "kind": "other"
        },
        {
          "name": "tran_qs.tran.tran",
          "relPath": "spectre_raw/transient/tran_qs.tran.tran",
          "format": ".tran",
          "size": "266953.9 KB",
          "hash": "88992851",
          "kind": "other"
        },
        {
          "name": "tran_sw.tran.tran",
          "relPath": "spectre_raw/transient/tran_sw.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "e08e8df1",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    },
    "results_spectre_full": {
      "runId": "results_spectre_full",
      "status": "completed",
      "pdkId": "results_spectre_full",
      "modelId": "results_spectre_full",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "netlistSuite": {
        "suiteId": "results_spectre_full",
        "suiteName": "results_spectre_full",
        "dcCircuit": "",
        "acCircuit": "",
        "transientCircuit": "",
        "noiseCircuit": ""
      },
      "modes": [],
      "simulator": "ngspice",
      "simulatorVersion": "Spectre",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:10:44\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read",
        "simulator": "ngspice",
        "simulatorVersion": "Spectre",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "DC Operating Point Analysis",
          "status": "pass",
          "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Bias Point Analysis",
          "status": "pass",
          "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "Temperature Analysis",
          "status": "pass",
          "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Thermodynamic Analysis",
          "status": "pass",
          "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
        },
        {
          "testId": "setup_5",
          "domain": "overview",
          "name": "Circuit file exists and is readable",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_6",
          "domain": "overview",
          "name": "ngspice is properly installed",
          "status": "pass",
          "detail": ""
        },
        {
          "testId": "setup_7",
          "domain": "overview",
          "name": "Simulation runs without errors",
          "status": "pass",
          "detail": ""
        }
      ],
      "dataArtifacts": [
        {
          "name": "bias_point_data.txt",
          "relPath": "data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_full/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_50_e5573004.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2703.7 KB",
          "hash": "a1cadb7a",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_charge_a1cadb7a.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_charge_a1cadb7a.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2289.1 KB",
          "hash": "959f58c2",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_delay_959f58c2.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_delay_959f58c2.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3084.3 KB",
          "hash": "fa9f40e4",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 22736,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_large_signal_fa9f40e4.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_large_signal_fa9f40e4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2203.9 KB",
          "hash": "4e0c8c0b",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 21867,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_power_100C_4e0c8c0b.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_power_100C_4e0c8c0b.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2288.3 KB",
          "hash": "7cf6895a",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_power_27C_7cf6895a.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_power_27C_7cf6895a.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "9606.7 KB",
          "hash": "3df4a2e3",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "rowCount": 113072,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_quasi_static_3df4a2e3.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_quasi_static_3df4a2e3.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1927.8 KB",
          "hash": "c3c721fb",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_switching_c3c721fb.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_switching_c3c721fb.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1155.8 KB",
          "hash": "a92cd0f5",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_switching_power_a92cd0f5.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_switching_power_a92cd0f5.txt",
          "metadata": {}
        },
        {
          "name": "bias_point_data.txt",
          "relPath": "spectre/data/bias_point_data.txt",
          "domain": "dc",
          "format": "txt",
          "size": "1007 B",
          "hash": "ce3f8cb3",
          "columns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "rowCount": 9,
          "numericColumns": [
            "v(drain_bias)",
            "v(gate_bias)",
            "id_bias",
            "ig_bias",
            "is_bias",
            "ib_bias"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/bias_point_data_ce3f8cb3.json",
          "rawUrl": "benchmark/results_spectre_full/data/bias_point_data_ce3f8cb3.txt",
          "metadata": {}
        },
        {
          "name": "charge_conservation.txt",
          "relPath": "spectre/data/charge_conservation.txt",
          "domain": "overview",
          "format": "txt",
          "size": "8.0 KB",
          "hash": "cc7abb71",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5"
          ],
          "rowCount": 79,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5"
          ],
          "groups": {
            "byColumn": "col_1",
            "uniqueValues": [
              "0.0000000000e+00",
              "8.3416666667e-03",
              "2.5025000000e-02",
              "5.8391666667e-02",
              "1.1321590936e-01",
              "1.5314989694e-01",
              "2.1400064730e-01",
              "3.2591961884e-01",
              "5.4975756192e-01",
              "7.7487878096e-01",
              "8.8743939048e-01",
              "9.4371969524e-01",
              "1.0000000000e+00"
            ]
          },
          "fetchUrl": "benchmark/results_spectre_full/data/charge_conservation_cc7abb71.json",
          "rawUrl": "benchmark/results_spectre_full/data/charge_conservation_cc7abb71.txt",
          "metadata": {}
        },
        {
          "name": "cmatrix_data.txt",
          "relPath": "spectre/data/cmatrix_data.txt",
          "domain": "overview",
          "format": "txt",
          "size": "3.6 KB",
          "hash": "7d5b755e",
          "columns": [
            "Vg",
            "Cgg",
            "Cdg",
            "Csg",
            "Cbg",
            "Cgd",
            "Cdd",
            "Csd",
            "Cbd",
            "Cgs",
            "Cds",
            "Css",
            "Cbs",
            "Cgb",
            "Cdb",
            "Csb",
            "Cbb"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg",
            "Cdg",
            "Csg",
            "Cbg",
            "Cgd",
            "Cdd",
            "Csd",
            "Cbd",
            "Cgs",
            "Cds",
            "Css",
            "Cbs",
            "Cgb",
            "Cdb",
            "Csb",
            "Cbb"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/cmatrix_data_7d5b755e.json",
          "rawUrl": "benchmark/results_spectre_full/data/cmatrix_data_7d5b755e.txt",
          "metadata": {}
        },
        {
          "name": "cv_data.txt",
          "relPath": "spectre/data/cv_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "4.2 KB",
          "hash": "8bf2d832",
          "columns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "rowCount": 41,
          "numericColumns": [
            "Vg",
            "Cgg_1kHz",
            "Cgg_10kHz",
            "Cgg_100kHz",
            "Cgg_1MHz",
            "Cgb_1MHz",
            "Cgs_1MHz",
            "Cgd_1MHz"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/cv_data_8bf2d832.json",
          "rawUrl": "benchmark/results_spectre_full/data/cv_data_8bf2d832.txt",
          "metadata": {}
        },
        {
          "name": "flicker_noise.txt",
          "relPath": "spectre/data/flicker_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "8.7 KB",
          "hash": "d290ca5e",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 370,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/flicker_noise_d290ca5e.json",
          "rawUrl": "benchmark/results_spectre_full/data/flicker_noise_d290ca5e.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_-40.txt",
          "relPath": "spectre/data/iv_data_-40.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "2669ef25",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_-40_2669ef25.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_-40_2669ef25.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_0.txt",
          "relPath": "spectre/data/iv_data_0.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "f57dfd43",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_0_f57dfd43.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_0_f57dfd43.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_100.txt",
          "relPath": "spectre/data/iv_data_100.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "db60b2f7",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_100_db60b2f7.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_100_db60b2f7.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_150.txt",
          "relPath": "spectre/data/iv_data_150.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "8f75e8e8",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_150_8f75e8e8.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_150_8f75e8e8.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_25.txt",
          "relPath": "spectre/data/iv_data_25.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "b488b1a0",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_25_b488b1a0.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_25_b488b1a0.txt",
          "metadata": {}
        },
        {
          "name": "iv_data_50.txt",
          "relPath": "spectre/data/iv_data_50.txt",
          "domain": "overview",
          "format": "txt",
          "size": "121.1 KB",
          "hash": "e5573004",
          "columns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "rowCount": 847,
          "numericColumns": [
            "v-sweep",
            "v(drain_iv)",
            "v(gate_iv)",
            "id",
            "is",
            "ib",
            "ig",
            "kcl"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/iv_data_50_e5573004.json",
          "rawUrl": "benchmark/results_spectre_full/data/iv_data_50_e5573004.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp-40.txt",
          "relPath": "spectre/data/noise_temp-40.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "77aa7486",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/noise_temp-40_77aa7486.json",
          "rawUrl": "benchmark/results_spectre_full/data/noise_temp-40_77aa7486.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp0.txt",
          "relPath": "spectre/data/noise_temp0.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/noise_temp0_9a38821b.json",
          "rawUrl": "benchmark/results_spectre_full/data/noise_temp0_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp100.txt",
          "relPath": "spectre/data/noise_temp100.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "47813deb",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/noise_temp100_47813deb.json",
          "rawUrl": "benchmark/results_spectre_full/data/noise_temp100_47813deb.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp150.txt",
          "relPath": "spectre/data/noise_temp150.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/noise_temp150_9a38821b.json",
          "rawUrl": "benchmark/results_spectre_full/data/noise_temp150_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp27.txt",
          "relPath": "spectre/data/noise_temp27.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/noise_temp27_9a38821b.json",
          "rawUrl": "benchmark/results_spectre_full/data/noise_temp27_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "noise_temp50.txt",
          "relPath": "spectre/data/noise_temp50.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/noise_temp50_9a38821b.json",
          "rawUrl": "benchmark/results_spectre_full/data/noise_temp50_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "nqs_effects.txt",
          "relPath": "spectre/data/nqs_effects.txt",
          "domain": "ac",
          "format": "txt",
          "size": "106 B",
          "hash": "f0cb80e8",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "rowCount": 1,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/nqs_effects_f0cb80e8.json",
          "rawUrl": "benchmark/results_spectre_full/data/nqs_effects_f0cb80e8.txt",
          "metadata": {}
        },
        {
          "name": "shot_noise.txt",
          "relPath": "spectre/data/shot_noise.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/shot_noise_9a38821b.json",
          "rawUrl": "benchmark/results_spectre_full/data/shot_noise_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "sparams_data.txt",
          "relPath": "spectre/data/sparams_data.txt",
          "domain": "ac",
          "format": "txt",
          "size": "131 B",
          "hash": "1f3950a5",
          "columns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "rowCount": 1,
          "numericColumns": [
            "col_0",
            "col_1",
            "col_2",
            "col_3",
            "col_4",
            "col_5",
            "col_6",
            "col_7",
            "col_8"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/sparams_data_1f3950a5.json",
          "rawUrl": "benchmark/results_spectre_full/data/sparams_data_1f3950a5.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.3.txt",
          "relPath": "spectre/data/thermal_noise_vgs0.3_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "4b75b043",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds0.3_4b75b043.json",
          "rawUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds0.3_4b75b043.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.6.txt",
          "relPath": "spectre/data/thermal_noise_vgs0.3_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "75f8ec90",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds0.6_75f8ec90.json",
          "rawUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds0.6_75f8ec90.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds0.9.txt",
          "relPath": "spectre/data/thermal_noise_vgs0.3_vds0.9.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "cec16926",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds0.9_cec16926.json",
          "rawUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds0.9_cec16926.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.3_vds1.2.txt",
          "relPath": "spectre/data/thermal_noise_vgs0.3_vds1.2.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "22d5f94a",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds1.2_22d5f94a.json",
          "rawUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.3_vds1.2_22d5f94a.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.3.txt",
          "relPath": "spectre/data/thermal_noise_vgs0.6_vds0.3.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "4e671b31",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.6_vds0.3_4e671b31.json",
          "rawUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.6_vds0.3_4e671b31.txt",
          "metadata": {}
        },
        {
          "name": "thermal_noise_vgs0.6_vds0.6.txt",
          "relPath": "spectre/data/thermal_noise_vgs0.6_vds0.6.txt",
          "domain": "noise",
          "format": "txt",
          "size": "13.0 KB",
          "hash": "9a38821b",
          "columns": [
            "Flags:",
            "real"
          ],
          "rowCount": 550,
          "numericColumns": [
            "Flags:"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.6_vds0.6_9a38821b.json",
          "rawUrl": "benchmark/results_spectre_full/data/thermal_noise_vgs0.6_vds0.6_9a38821b.txt",
          "metadata": {}
        },
        {
          "name": "tran_charge.txt",
          "relPath": "spectre/data/tran_charge.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2703.7 KB",
          "hash": "a1cadb7a",
          "columns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(gate_charge)",
            "i(Vg_charge)",
            "i(Vd_charge)",
            "i(Vs_charge)",
            "i(Vb_charge)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_charge_a1cadb7a.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_charge_a1cadb7a.txt",
          "metadata": {}
        },
        {
          "name": "tran_delay.txt",
          "relPath": "spectre/data/tran_delay.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2289.1 KB",
          "hash": "959f58c2",
          "columns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_delay)",
            "v(mid1_delay)",
            "v(mid2_delay)",
            "v(out_delay)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_delay_959f58c2.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_delay_959f58c2.txt",
          "metadata": {}
        },
        {
          "name": "tran_large_signal.txt",
          "relPath": "spectre/data/tran_large_signal.txt",
          "domain": "transient",
          "format": "txt",
          "size": "3084.3 KB",
          "hash": "fa9f40e4",
          "columns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "rowCount": 22736,
          "numericColumns": [
            "time",
            "time",
            "v(gate_tran)",
            "v(drain_tran)",
            "i(Vds_tran)",
            "i(Vgs_tran)",
            "i(Vs_tran)",
            "i(Vb_tran)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_large_signal_fa9f40e4.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_large_signal_fa9f40e4.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_100C.txt",
          "relPath": "spectre/data/tran_power_100C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2203.9 KB",
          "hash": "4e0c8c0b",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 21867,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_power_100C_4e0c8c0b.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_power_100C_4e0c8c0b.txt",
          "metadata": {}
        },
        {
          "name": "tran_power_27C.txt",
          "relPath": "spectre/data/tran_power_27C.txt",
          "domain": "transient",
          "format": "txt",
          "size": "2288.3 KB",
          "hash": "7cf6895a",
          "columns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_power)",
            "v(out_power)",
            "power_diss",
            "energy"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_power_27C_7cf6895a.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_power_27C_7cf6895a.txt",
          "metadata": {}
        },
        {
          "name": "tran_quasi_static.txt",
          "relPath": "spectre/data/tran_quasi_static.txt",
          "domain": "transient",
          "format": "txt",
          "size": "9606.7 KB",
          "hash": "3df4a2e3",
          "columns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "rowCount": 113072,
          "numericColumns": [
            "time",
            "time",
            "v(gate_qs)",
            "v(drain_qs)",
            "i(Vds_qs)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_quasi_static_3df4a2e3.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_quasi_static_3df4a2e3.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching.txt",
          "relPath": "spectre/data/tran_switching.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1927.8 KB",
          "hash": "c3c721fb",
          "columns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "v(in_inv)",
            "v(out_inv)",
            "i(Vdd_inv)"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_switching_c3c721fb.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_switching_c3c721fb.txt",
          "metadata": {}
        },
        {
          "name": "tran_switching_power.txt",
          "relPath": "spectre/data/tran_switching_power.txt",
          "domain": "transient",
          "format": "txt",
          "size": "1155.8 KB",
          "hash": "a92cd0f5",
          "columns": [
            "time",
            "time",
            "power_switching"
          ],
          "rowCount": 22708,
          "numericColumns": [
            "time",
            "time",
            "power_switching"
          ],
          "groups": null,
          "fetchUrl": "benchmark/results_spectre_full/data/tran_switching_power_a92cd0f5.json",
          "rawUrl": "benchmark/results_spectre_full/data/tran_switching_power_a92cd0f5.txt",
          "metadata": {}
        }
      ],
      "plotArtifacts": [
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "396.6 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/dc_iv_characteristics_24e9b83e.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "132.6 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/dc_kcl_verification_3e27897c.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "110.8 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/dc_temperature_analysis_f15e5dc8.png"
        },
        {
          "name": "ac_cv_characteristics.png",
          "relPath": "spectre/plots/ac_cv_characteristics.png",
          "domain": "ac",
          "format": "png",
          "size": "155.2 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/ac_cv_characteristics_e48224e1.png"
        },
        {
          "name": "ac_cv_components.png",
          "relPath": "spectre/plots/ac_cv_components.png",
          "domain": "ac",
          "format": "png",
          "size": "330.3 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/ac_cv_components_052bf8da.png"
        },
        {
          "name": "ac_v_multifreq_characteristics.png",
          "relPath": "spectre/plots/ac_v_multifreq_characteristics.png",
          "domain": "ac",
          "format": "png",
          "size": "232.1 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/ac_v_multifreq_characteristics_d8d8160b.png"
        },
        {
          "name": "dc_iv_characteristics.png",
          "relPath": "spectre/plots/dc_iv_characteristics.png",
          "domain": "dc",
          "format": "png",
          "size": "874.5 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/dc_iv_characteristics_3b301118.png"
        },
        {
          "name": "dc_kcl_verification.png",
          "relPath": "spectre/plots/dc_kcl_verification.png",
          "domain": "dc",
          "format": "png",
          "size": "311.4 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/dc_kcl_verification_5f2a74f1.png"
        },
        {
          "name": "dc_temperature_analysis.png",
          "relPath": "spectre/plots/dc_temperature_analysis.png",
          "domain": "dc",
          "format": "png",
          "size": "275.9 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/dc_temperature_analysis_947e180f.png"
        },
        {
          "name": "thermal_noise.png",
          "relPath": "spectre/plots/thermal_noise.png",
          "domain": "noise",
          "format": "png",
          "size": "167.1 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/thermal_noise_d2c39ff7.png"
        },
        {
          "name": "trans_delay_effect.png",
          "relPath": "spectre/plots/trans_delay_effect.png",
          "domain": "transient",
          "format": "png",
          "size": "143.3 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/trans_delay_effect_16e5e5e5.png"
        },
        {
          "name": "trans_large_signal_transient.png",
          "relPath": "spectre/plots/trans_large_signal_transient.png",
          "domain": "transient",
          "format": "png",
          "size": "258.1 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/trans_large_signal_transient_3d6f38c0.png"
        },
        {
          "name": "trans_quasi_static_iv.png",
          "relPath": "spectre/plots/trans_quasi_static_iv.png",
          "domain": "dc",
          "format": "png",
          "size": "127.1 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/trans_quasi_static_iv_64817765.png"
        },
        {
          "name": "trans_quasi_static_time.png",
          "relPath": "spectre/plots/trans_quasi_static_time.png",
          "domain": "transient",
          "format": "png",
          "size": "290.7 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/trans_quasi_static_time_e84d5e24.png"
        },
        {
          "name": "trans_switching_response.png",
          "relPath": "spectre/plots/trans_switching_response.png",
          "domain": "transient",
          "format": "png",
          "size": "271.5 KB",
          "displayUrl": "benchmark/results_spectre_full/plots/trans_switching_response_5c86b4ca.png"
        }
      ],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "5.3 KB",
          "hash": "f4b50705",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-19 15:10:44\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "setup_5",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_6",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_7",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "REPORT.md",
          "relPath": "spectre/REPORT.md",
          "size": "7.9 KB",
          "hash": "bba05068",
          "report": {
            "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2026-07-21 14:39:19\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /home/duhaochen/spice_model_benchmark/netlists/spectre/dc_circuit.scs\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: Spectre 24.1\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: red'>✗</span> | Data not available |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: red'>✗</span> | Data not available |\n| [Temperature Dependence](#temperature-dependence) | <span style='color: red'>✗</span> | Data not available |\n| [Bias Dependence](#detailed-noise-characteristics) | <span style='color: red'>✗</span> | Data not available |\n\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -2.87e-08A to 1.79e-02A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -2.71e-08A to -0.00e+00A\n  - IG: -0.00e+00A to 1.34e-07A\n  - IS: -2.71e-08A to -0.00e+00A\n  - IB: -8.00e-08A to -0.00e+00A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: -0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -2.870e-08A to 1.793e-02A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n- [<span style='color: red'>✗</span>] Transient simulations failed\n  - Data not available or failed to read\n## 5. AC Analysis\n- [<span style='color: red'>✗</span>] AC simulations failed\n  - Data not available or failed to read\n## 6. Noise Analysis\n### Thermal Noise Analysis\n- [<span style='color: red'>✗</span>] Thermal Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Flicker Noise Analysis\n- [<span style='color: red'>✗</span>] Flicker Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Short Noise Analysis\n- [<span style='color: red'>✗</span>] Short Noise Analysis verification failed\n  - Data not available or failed to read\n\n### Temperature Dependence\n- [<span style='color: red'>✗</span>] Temperature Dependence verification failed\n  - Data not available or failed to read\n\n### Bias Dependence\n- [<span style='color: red'>✗</span>] Bias Dependence verification failed\n  - Data not available or failed to read\n\n",
            "simulator": "ngspice",
            "simulatorVersion": "Spectre",
            "overallStatus": "fail",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "DC Operating Point Analysis",
                "status": "pass",
                "detail": "VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -2.87e-08A to 1.79e-02A"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Bias Point Analysis",
                "status": "pass",
                "detail": "Points: 9 VDS points, 9 VGS points, Currents: IDS: -2.71e-08A to -0.00e+00A, IG: -0.00e+00A to 1.34e-07A, IS: -2.71e-08A to -0.00e+00A, IB: -8.00e-08A to -0.00e+00A, KCL Error: 0.00%, Power: 0.00e+00W to 0.00e+00W, Temp: -40.0°C"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "Temperature Analysis",
                "status": "pass",
                "detail": "Temp Points: [-40, 0, 25, 50, 100, 150], TC: -0.000015 /°C, IDS: -2.870e-08A to 1.793e-02A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Thermodynamic Analysis",
                "status": "pass",
                "detail": "Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C"
              },
              {
                "testId": "ac_5",
                "domain": "ac",
                "name": "Small Signal Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_6",
                "domain": "ac",
                "name": "S-Parameter Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_7",
                "domain": "ac",
                "name": "Non-Quasi-Static (NQS) Effects Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "ac_8",
                "domain": "ac",
                "name": "Charge Conservation Analysis",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_9",
                "domain": "noise",
                "name": "Thermal Noise",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_10",
                "domain": "noise",
                "name": "Flicker (1/f) Noise",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_11",
                "domain": "noise",
                "name": "Shot Noise",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_12",
                "domain": "noise",
                "name": "Temperature Dependence",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "noise_13",
                "domain": "noise",
                "name": "Bias Dependence",
                "status": "fail",
                "detail": "Data not available"
              },
              {
                "testId": "setup_14",
                "domain": "overview",
                "name": "Circuit file exists and is readable",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_15",
                "domain": "overview",
                "name": "ngspice is properly installed",
                "status": "pass",
                "detail": ""
              },
              {
                "testId": "setup_16",
                "domain": "overview",
                "name": "Simulation runs without errors",
                "status": "pass",
                "detail": ""
              }
            ]
          },
          "kind": "report"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre/spectre_raw/ac/frequencySweep.ac",
          "format": ".ac",
          "size": "23.0 KB",
          "hash": "0127e845",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/ac/logFile",
          "format": "unknown",
          "size": "842 B",
          "hash": "cbdb6ae4",
          "kind": "other"
        },
        {
          "name": "timeSweep.tran.tran",
          "relPath": "spectre/spectre_raw/ac/timeSweep.tran.tran",
          "format": ".tran",
          "size": "772.8 KB",
          "hash": "a7e35e08",
          "kind": "other"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre/spectre_raw/ac_nqs/frequencySweep.ac",
          "format": ".ac",
          "size": "7.8 KB",
          "hash": "4521e4f4",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/ac_nqs/logFile",
          "format": "unknown",
          "size": "679 B",
          "hash": "c1078552",
          "kind": "other"
        },
        {
          "name": "frequencySweep.ac",
          "relPath": "spectre/spectre_raw/ac_sp/frequencySweep.ac",
          "format": ".ac",
          "size": "7.8 KB",
          "hash": "f822161c",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/ac_sp/logFile",
          "format": "unknown",
          "size": "678 B",
          "hash": "afa2b999",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "310be756",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "63aa3cb3",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "4042ff3a",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "7d5f4fcd",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "62fdb4c7",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "493db552",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "8b13547d",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "60e7ed1c",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "67b34a47",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "6faeb0ed",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "bf10a006",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "096b06ea",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "1fb9bd3f",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "30660768",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "309317da",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "932aa0af",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "127d9609",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "1f1fd5a6",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "9e07fa75",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "61f640b4",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1eb0054b",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "f5b4090f",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "55942571",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "c4800f11",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e1ce99db",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "e4a78d9a",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "df91c620",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5fd67a3f",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8a48afc4",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "3b02f013",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "3392689e",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "4c9801af",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "9cf5fe8f",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "85b22b92",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c27e4c9d",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "05a5d49a",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "cb15c61b",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "2c08ce9f",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "f1d4033e",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "d2877f3b",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "808c4675",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "3493d296",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1e6e5237",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4fe64c1f",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "5aaee9ff",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "770c73c4",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "41ad5bae",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "db509734",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "461a785b",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "1fa5dbdc",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b88a42af",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "47916adf",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "71ff6f89",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "bc799668",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "207200cf",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "b2f28807",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8fb13b53",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "aa1541aa",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "0b41dc48",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "dd47d2ab",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "1e7b2777",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "18ca30dd",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "107b71dd",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre/spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "a2cdadb8",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "82f3a6de",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise/noise1.noise",
          "format": ".noise",
          "size": "686.9 KB",
          "hash": "05063fec",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_t-40/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "aafadda9",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_t-40/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "97cf7a3a",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_t100/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "33da469f",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_t100/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "41079c2a",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds0.3/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "c38d12e0",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds0.3/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "1782b010",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds0.6/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "5b17621c",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds0.6/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "0697c762",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds0.9/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "4eadbea0",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds0.9/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "58e1734c",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds1.2/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "4be47491",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_vgs0.3_vds1.2/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "b463a0e4",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/noise_vgs0.6_vds0.3/logFile",
          "format": "unknown",
          "size": "664 B",
          "hash": "aafadda9",
          "kind": "other"
        },
        {
          "name": "noise1.noise",
          "relPath": "spectre/spectre_raw/noise_vgs0.6_vds0.3/noise1.noise",
          "format": ".noise",
          "size": "107.5 KB",
          "hash": "db43c38a",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre/spectre_raw/transient/logFile",
          "format": "unknown",
          "size": "2.3 KB",
          "hash": "849fefa0",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100-000_tran_pwr_100.tran.tran",
          "relPath": "spectre/spectre_raw/transient/sw_pwr_100-000_tran_pwr_100.tran.tran",
          "format": ".tran",
          "size": "51628.0 KB",
          "hash": "17ea9807",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100_tran_pwr_100.sweep",
          "relPath": "spectre/spectre_raw/transient/sw_pwr_100_tran_pwr_100.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "d69f4f95",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27-000_tran_pwr_27.tran.tran",
          "relPath": "spectre/spectre_raw/transient/sw_pwr_27-000_tran_pwr_27.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "900996e2",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27_tran_pwr_27.sweep",
          "relPath": "spectre/spectre_raw/transient/sw_pwr_27_tran_pwr_27.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "a29df211",
          "kind": "other"
        },
        {
          "name": "tran_charge.tran.tran",
          "relPath": "spectre/spectre_raw/transient/tran_charge.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "569ed2af",
          "kind": "other"
        },
        {
          "name": "tran_delay.tran.tran",
          "relPath": "spectre/spectre_raw/transient/tran_delay.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "e6c074c3",
          "kind": "other"
        },
        {
          "name": "tran_ls.tran.tran",
          "relPath": "spectre/spectre_raw/transient/tran_ls.tran.tran",
          "format": ".tran",
          "size": "53681.1 KB",
          "hash": "181bd325",
          "kind": "other"
        },
        {
          "name": "tran_qs.tran.tran",
          "relPath": "spectre/spectre_raw/transient/tran_qs.tran.tran",
          "format": ".tran",
          "size": "266953.9 KB",
          "hash": "30115ac9",
          "kind": "other"
        },
        {
          "name": "tran_sw.tran.tran",
          "relPath": "spectre/spectre_raw/transient/tran_sw.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "b2ed0768",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/dc/logFile",
          "format": "unknown",
          "size": "18.4 KB",
          "hash": "455e08fe",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "f9db84e8",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "ec432d94",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "604991ca",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-000_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "44a7a353",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "96012f4d",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "7896f4cc",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "53e4fcbe",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-001_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "85252b43",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-000_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "13a7cbac",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-001_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "29783450",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias-002_dc_bias.dc",
          "format": ".dc",
          "size": "3.3 KB",
          "hash": "ab0667db",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias-002_sw_vgs_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "4456def5",
          "kind": "other"
        },
        {
          "name": "sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias-000_sw_vds_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.7 KB",
          "hash": "87cd268a",
          "kind": "other"
        },
        {
          "name": "sw_bias_dc_bias.sweep",
          "relPath": "spectre_raw/dc/sw_bias_dc_bias.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "18dba95d",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "88ac819a",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "cb1867f8",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "deaf2e9e",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4686e442",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "25fd78b7",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "8bd97dd5",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "b43728da",
          "kind": "other"
        },
        {
          "name": "sw_temp-000_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-000_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "e90ad79d",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "c3326c82",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "ab1d5f1d",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "00ce75ce",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "98d61443",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4d8bf189",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "f12c35a0",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "04089f24",
          "kind": "other"
        },
        {
          "name": "sw_temp-001_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-001_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "9aab94c1",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "9ffcd8f8",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "c9fb9717",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "8558fc19",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "96896d7a",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "861bb7cf",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d29da9f5",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "06a2b4d6",
          "kind": "other"
        },
        {
          "name": "sw_temp-002_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-002_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "d1ac7cb5",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "a5bf085f",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "da64e4bf",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "d5d48cfe",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d438bb9d",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "68769233",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "23de71bd",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "6b72cf30",
          "kind": "other"
        },
        {
          "name": "sw_temp-003_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-003_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "0421c043",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "82331481",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "05ae1c99",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "0b1db054",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "fbc4d89a",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "6299e41b",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "d6cb0519",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "4e38fb2a",
          "kind": "other"
        },
        {
          "name": "sw_temp-004_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-004_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "ce307022",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-000_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-000_dc_iv.dc",
          "format": ".dc",
          "size": "69.0 KB",
          "hash": "8e8b87b0",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-001_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-001_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "332d63a8",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-002_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-002_dc_iv.dc",
          "format": ".dc",
          "size": "69.1 KB",
          "hash": "eb63f35b",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-003_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-003_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "ab8ff8d3",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-004_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-004_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "58fd76ea",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-005_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-005_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "04ec5d03",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs-006_dc_iv.dc",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs-006_dc_iv.dc",
          "format": ".dc",
          "size": "69.2 KB",
          "hash": "c240d1e0",
          "kind": "other"
        },
        {
          "name": "sw_temp-005_sw_vgs_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp-005_sw_vgs_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.9 KB",
          "hash": "be5d23e1",
          "kind": "other"
        },
        {
          "name": "sw_temp_dc_iv.sweep",
          "relPath": "spectre_raw/dc/sw_temp_dc_iv.sweep",
          "format": ".sweep",
          "size": "1.8 KB",
          "hash": "1a1e5ac8",
          "kind": "other"
        },
        {
          "name": "logFile",
          "relPath": "spectre_raw/transient/logFile",
          "format": "unknown",
          "size": "2.3 KB",
          "hash": "1cccee80",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100-000_tran_pwr_100.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_100-000_tran_pwr_100.tran.tran",
          "format": ".tran",
          "size": "51628.0 KB",
          "hash": "63bc76a4",
          "kind": "other"
        },
        {
          "name": "sw_pwr_100_tran_pwr_100.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_100_tran_pwr_100.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "365eca68",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27-000_tran_pwr_27.tran.tran",
          "relPath": "spectre_raw/transient/sw_pwr_27-000_tran_pwr_27.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "2dee7998",
          "kind": "other"
        },
        {
          "name": "sw_pwr_27_tran_pwr_27.sweep",
          "relPath": "spectre_raw/transient/sw_pwr_27_tran_pwr_27.sweep",
          "format": ".sweep",
          "size": "1.6 KB",
          "hash": "9c1de9bd",
          "kind": "other"
        },
        {
          "name": "tran_charge.tran.tran",
          "relPath": "spectre_raw/transient/tran_charge.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "903e8f92",
          "kind": "other"
        },
        {
          "name": "tran_delay.tran.tran",
          "relPath": "spectre_raw/transient/tran_delay.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "896df45a",
          "kind": "other"
        },
        {
          "name": "tran_ls.tran.tran",
          "relPath": "spectre_raw/transient/tran_ls.tran.tran",
          "format": ".tran",
          "size": "53681.1 KB",
          "hash": "3d0b8410",
          "kind": "other"
        },
        {
          "name": "tran_qs.tran.tran",
          "relPath": "spectre_raw/transient/tran_qs.tran.tran",
          "format": ".tran",
          "size": "266953.9 KB",
          "hash": "d303f998",
          "kind": "other"
        },
        {
          "name": "tran_sw.tran.tran",
          "relPath": "spectre_raw/transient/tran_sw.tran.tran",
          "format": ".tran",
          "size": "53615.0 KB",
          "hash": "4aed74e4",
          "kind": "other"
        }
      ],
      "reportPath": "REPORT.md"
    }
  },
  "modelIds": [
    "reference_results",
    "results",
    "results_final",
    "results_hspice_test",
    "results_spectre_all4",
    "results_spectre_dc",
    "results_spectre_dc2",
    "results_spectre_dc3",
    "results_spectre_final",
    "results_spectre_final2",
    "results_spectre_full"
  ],
  "models": {
    "reference_results": {
      "modelId": "reference_results",
      "modelName": "reference_results",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results": {
      "modelId": "results",
      "modelName": "results",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_final": {
      "modelId": "results_final",
      "modelName": "results_final",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_hspice_test": {
      "modelId": "results_hspice_test",
      "modelName": "results_hspice_test",
      "modelPath": "netlists/hspice_bias.sp",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_all4": {
      "modelId": "results_spectre_all4",
      "modelName": "results_spectre_all4",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_dc": {
      "modelId": "results_spectre_dc",
      "modelName": "results_spectre_dc",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_dc2": {
      "modelId": "results_spectre_dc2",
      "modelName": "results_spectre_dc2",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_dc3": {
      "modelId": "results_spectre_dc3",
      "modelName": "results_spectre_dc3",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_final": {
      "modelId": "results_spectre_final",
      "modelName": "results_spectre_final",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_final2": {
      "modelId": "results_spectre_final2",
      "modelName": "results_spectre_final2",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    },
    "results_spectre_full": {
      "modelId": "results_spectre_full",
      "modelName": "results_spectre_full",
      "modelPath": "",
      "modelFormat": "ngspice",
      "deviceName": "",
      "deviceType": ""
    }
  },
  "suiteIds": [
    "reference_results",
    "results",
    "results_final",
    "results_hspice_test",
    "results_spectre_all4",
    "results_spectre_dc",
    "results_spectre_dc2",
    "results_spectre_dc3",
    "results_spectre_final",
    "results_spectre_final2",
    "results_spectre_full"
  ],
  "netlistSuites": {
    "reference_results": {
      "suiteId": "reference_results",
      "suiteName": "reference_results",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results": {
      "suiteId": "results",
      "suiteName": "results",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_final": {
      "suiteId": "results_final",
      "suiteName": "results_final",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_hspice_test": {
      "suiteId": "results_hspice_test",
      "suiteName": "results_hspice_test",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_all4": {
      "suiteId": "results_spectre_all4",
      "suiteName": "results_spectre_all4",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_dc": {
      "suiteId": "results_spectre_dc",
      "suiteName": "results_spectre_dc",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_dc2": {
      "suiteId": "results_spectre_dc2",
      "suiteName": "results_spectre_dc2",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_dc3": {
      "suiteId": "results_spectre_dc3",
      "suiteName": "results_spectre_dc3",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_final": {
      "suiteId": "results_spectre_final",
      "suiteName": "results_spectre_final",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_final2": {
      "suiteId": "results_spectre_final2",
      "suiteName": "results_spectre_final2",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    },
    "results_spectre_full": {
      "suiteId": "results_spectre_full",
      "suiteName": "results_spectre_full",
      "dcCircuit": "",
      "acCircuit": "",
      "transientCircuit": "",
      "noiseCircuit": ""
    }
  },
  "modelFormats": [
    "ngspice",
    "hspice",
    "spectre"
  ],
  "availableModels": 67
};
export const SOURCE_INVENTORY = {"dataFiles":240,"plotFiles":96,"reportFiles":11,"logFiles":0,"netlistFiles":2,"otherFiles":707,"totalArtifacts":1056};
