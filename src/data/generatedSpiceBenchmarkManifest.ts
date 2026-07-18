// Auto-generated — 2026-07-18T09:27:21.546Z
// Runs: 2, Models: 2, Suites: 2
import type { SpiceBenchmarkManifest } from "./SpiceBenchmarkTypes";
export const SPICE_BENCHMARK_MANIFEST: SpiceBenchmarkManifest = {
  "generatedAt": "2026-07-18T09:27:21.544Z",
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
      "simulatorVersion": "unknown",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\n\nGenerated on: 2025-05-13 15:15:35\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Temperature Dependence](#temperature-dependence)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties](#physical-properties)\n4. [Transient Analysis](#4-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n   - [Transient Simulations for Power Dissipation](#transient-simulations-for-power-dissipation)\n   - [Quasi-Static Analysis](#quasi-static-analysis)\n   - [Charge Conservation Tests](#charge-conservation-tests)\n5. [AC Analysis](#5-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [High-Frequency Analysis](#high-frequency-analysis)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n   - [Temperature Dependence](#temperature-dependence-1)\n   - [Detailed Noise Characteristics](#detailed-noise-characteristics)\n7. [Geometry and Layout Analysis](#7-geometry-and-layout-analysis)\n   - [Geometry Dependence](#geometry-dependence)\n   - [Layout Effects](#layout-effects)\n\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n- Sections marked \"In Progress\" have not been implemented yet\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] DC circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/dc_circuit.cir\n- [<span style='color: green'>✓</span>] Transient circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/transient_circuit.cir\n- [<span style='color: green'>✓</span>] Noise circuit file exists and is readable\n  - Path: /home/yongfu/proj/spice_model_benchmark/netlists/noise_circuit.cir\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-42\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [IV Characteristics](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | Range: 0.00V to 1.20V, -1.79e-02A to 2.87e-08A |\n| [Temperature Analysis](#temperature-dependence) | <span style='color: green'>✓</span> | Temp Coef: 0.000015 /°C |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 2.934e-05A, Rise Time: 0.1ps |\n| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 10.7ps |\n| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 25.0ps |\n| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -1.718433e-05W/°C |\n| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed |\n| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: 0.000000% |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Capacitance-Voltage](#small-signal-analysis) | <span style='color: green'>✓</span> | Range: 7.08fF to 13.98fF |\n| [Charge Conservation](#small-signal-analysis) | <span style='color: green'>✓</span> | Error: 3.8477522766233967e-07% |\n| [S-Parameter](#high-frequency-analysis) | <span style='color: green'>✓</span> | Frequency: 1.0MHz to 1.0GHz |\n| [Non-Quasi-Static](#high-frequency-analysis) | <span style='color: green'>✓</span> | Phase Shift: -176.581 |\n\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |\n| [Temperature Dependence](#temperature-dependence-1) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |\n| [Bias Dependence](#detailed-noise-characteristics) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |\n## 3. DC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range (0-5V)\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range (0-5V)\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -1.79e-02A to 2.87e-08A\n- [<span style='color: green'>✓</span>] Log scale measurements are valid (2+ decades)\n  - Decades: 8.71\n- [<span style='color: green'>✓</span>] Linear scale measurements are valid\n  - Points: 432\n  - Range: 0.00V to 0.35V\n- [<span style='color: green'>✓</span>] Multi-terminal current analysis is valid\n  - KCL Error: 6.39e-12A\n\n<img src='plots/iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n### Temperature Dependence\n- [<span style='color: green'>✓</span>] Temperature sweep is performed (-40°C to 150°C)\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -1.793e-02A to 2.870e-08A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n  - Temperature Coefficient: 1.48e-05A/°C\n\n<img src='plots/temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n*Temperature analysis showing current variation*\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy conservation verified\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device efficiency analyzed\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Power measurements complete\n- [<span style='color: green'>✓</span>] Temperature coefficient calculated\n  - Value: 8.34e-04/°C\n\n<img src='plots/kcl_verification.png' alt='KCL Verification' width='400'/>\n\n*KCL verification showing current balance*\n\n### Physical Properties\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n### Large-Signal Transient\n- [<span style='color: green'>✓</span>] Time-domain transient analysis completed\n  - Maximum Drain Current: 2.934381e-05A\n  - Gate Voltage Rise Time: 0.1ps\n\n<img src='plots/large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>\n\n*Large-signal transient analysis showing voltages and current response*\n\n### Switching Simulations\n- [<span style='color: green'>✓</span>] Inverter switching behavior analyzed\n  - Propagation Delay: 10.7ps\n  - Maximum Switching Power: 5.659051e-03W\n  - Average Switching Power: 1.470466e-03W\n\n<img src='plots/switching_response.png' alt='Switching Response' width='400'/>\n\n*Inverter switching analysis showing input/output voltages and power*\n\n### Delay Effect Simulations\n- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed\n  - Stage 1 Delay: 13.7ps\n  - Stage 2 Delay: 6.1ps\n  - Stage 3 Delay: 5.1ps\n  - Total Chain Delay: 25.0ps\n\n<img src='plots/delay_effect.png' alt='Delay Effect Analysis' width='400'/>\n\n*Delay effect analysis showing signal propagation through inverter chain*\n\n### Transient Simulations for Power Dissipation\n- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed\n  - Maximum Power at 27°C: 5.659051e-03W\n  - Maximum Power at 100°C: 4.404595e-03W\n  - Average Power at 27°C: 1.470466e-03W\n  - Average Power at 100°C: 1.017077e-03W\n  - Power Temperature Coefficient: -1.718433e-05W/°C\n\n<img src='plots/power_dissipation.png' alt='Power Dissipation' width='400'/>\n\n*Power dissipation analysis at different temperatures*\n\n<img src='plots/energy_consumption.png' alt='Energy Consumption' width='400'/>\n\n*Energy consumption analysis at different temperatures*\n\n### Quasi-Static Analysis\n- [<span style='color: green'>✓</span>] Quasi-static behavior analyzed\n  - Performed quasi-static transient analysis with slower rise/fall times\n  - Analyzed relationship between gate voltage and drain current\n\n<img src='plots/quasi_static.png' alt='Quasi-Static Analysis' width='400'/>\n\n*Quasi-static time-domain behavior analysis*\n\n<img src='plots/quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>\n\n*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*\n\n### Charge Conservation Tests\n- [<span style='color: green'>✓</span>] Charge conservation analyzed\n  - Total Charge Variation: 3.184928e-18C\n  - Mean Total Charge: 3.718811e-19C\n  - Charge Conservation Error: 0.000000%\n\n<img src='plots/charge_conservation.png' alt='Charge Conservation Analysis' width='400'/>\n\n*Terminal currents and charges analysis*\n\n<img src='plots/total_charge.png' alt='Total Charge' width='400'/>\n\n*Total charge conservation analysis*\n\n## 5. AC Analysis\n### Small-Signal Analysis\n- [<span style='color: green'>✓</span>] AC small-signal simulations completed\n  - Range: 7.08fF to 13.98fF\n- [<span style='color: green'>✓</span>] Capacitance-voltage (C-V) measurements analyzed\n  - Max Value at: 1.20V\n- [<span style='color: green'>✓</span>] Charge conservation tests completed\n  - Conservation Error: 3.8477522766233967e-07%\n\n<img src='plots/cv_characteristics.png' alt='CV Characteristics' width='400'/>\n\n*CV characteristics showing gate capacitance variation with gate voltage*\n\n<img src='plots/cv_components.png' alt='CV Components' width='400'/>\n\n*Capacitance components (Cgb, Cgs, Cgd) variation with gate voltage*\n\n### High-Frequency Analysis\n- [<span style='color: green'>✓</span>] High-frequency AC simulations completed\n  - Frequency Range: 1.0MHz to 1.0GHz\n- [<span style='color: green'>✓</span>] S-parameter analysis completed\n  - S11: -2dB to -1dB\n  - S21: -26dB to -22dB\n- [<span style='color: green'>✓</span>] RF simulations completed\n  - Isolation: >-10dB\n- [<span style='color: green'>✓</span>] Non-quasi-static effects analyzed\n  - Max Phase Shift: -176.581\n\n<img src='plots/sparameter_analysis.png' alt='S-Parameter Analysis' width='400'/>\n\n*S-Parameter analysis showing frequency response characteristics*\n\n<img src='plots/nqs_effects.png' alt='Non-Quasi-Static Effects' width='400'/>\n\n*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*\n\n\n## 6. Noise Analysis\n### Thermal Noise Analysis\n\n<img src='plots/thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>\n\n*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*\n\n#### Flicker Noise Analysis\n\n<img src='plots/flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>\n\n*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*\n\n#### Shot Noise Analysis\n\n<img src='plots/shot_noise.png' alt='Shot Noise Analysis' width='400'/>\n\n*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*\n\n#### Temperature Dependence\n\n<img src='plots/noise_vs_temperature.png' alt='Noise vs Temperature' width='400'/>\n\n*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*\n\n### Detailed Noise Characteristics\n- [<span style='color: green'>✓</span>] Thermal noise analysis completed\n  - Max Noise: 1.00e+09 V²/Hz\n  - Min Noise: 2.16e-15 V²/Hz\n  - Avg Noise: 2.54e+07 V²/Hz\n  - Noise Floor: 2.65e+07 V²/Hz\n  - Frequency Range: 1.00e+00 to 1.00e+09 Hz\n\n#### Thermal Noise Results at Different Bias Points\n\n| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |\n|----------------|-------------------|-------------------|-------------------|--------------------|\n| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n\n- [<span style='color: green'>✓</span>] Flicker (1/f) noise analysis completed\n  - Coefficient (K): 4.68e-08\n  - Exponent (γ): 0.5075 (ideally -1.0 for pure 1/f noise)\n  - Correlation (R²): 0.8265\n  - Corner Frequency: 1.12e+00 Hz\n\n- [<span style='color: green'>✓</span>] Shot noise analysis completed\n  - Shot Noise Level: 3.79e-09 V²/Hz\n  - Standard Deviation: 5.56e-09 V²/Hz\n  - Variation Coefficient: 1.4676\n\n- [<span style='color: green'>✓</span>] Temperature dependence analysis completed\n  - Temperature Coefficient: 2.77e-11 V²/Hz/°C\n  - Temperature-Noise Correlation: None\n  - Temperature Range: -40.0°C to 150.0°C\n\n## 7. Geometry and Layout Analysis\n### Geometry Dependence\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Monte Carlo simulations for geometry variations: *In Progress*\n- <span style='color: gray'>✗</span> Layout-dependent effect (LDE) simulations: *In Progress*\n\n### Layout Effects\n- <span style='color: gray'>✗</span> Layout-dependent simulations: *In Progress*\n- <span style='color: gray'>✗</span> Stress effect simulations: *In Progress*\n- <span style='color: gray'>✗</span> Proximity effect simulations: *In Progress*\n- <span style='color: gray'>✗</span> Parasitic extraction: *In Progress*\n- <span style='color: gray'>✗</span> RC extraction simulations: *In Progress*\n",
        "simulator": "ngspice",
        "simulatorVersion": "unknown",
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
            "simulatorVersion": "unknown",
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
      "simulatorVersion": "unknown",
      "generatedAt": "",
      "commitSha": "",
      "metadataSource": "inferred",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# MOSFET Simulation Verification Report\nGenerated on: 2025-06-12 17:29:42\n\n## Table of Contents\n1. [Simulation Setup and Execution](#1-simulation-setup-and-execution)\n2. [Summary](#2-summary)\n   - [DC Analysis Summary](#dc-analysis-summary)\n   - [AC Analysis Summary](#ac-analysis-summary)\n   - [Transient Analysis Summary](#transient-analysis-summary)\n   - [Noise Analysis Summary](#noise-analysis-summary)\n3. [DC Analysis](#3-dc-analysis)\n   - [DC Operating Point Analysis](#dc-operating-point-analysis)\n   - [Bias Point Analysis](#bias-point-analysis)\n   - [Temperature Analysis](#temperature-analysis)\n   - [Thermodynamic Analysis](#thermodynamic-analysis)\n   - [Physical Properties Analysis](#physical-properties-analysis)\n4. [AC Analysis](#4-ac-analysis)\n   - [Small-Signal Analysis](#small-signal-analysis)\n   - [S-Parameter Analysis](#s-parameter-analysis)\n   - [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis)\n   - [Charge Conservation Analysis](#charge-conservation-analysis)\n5. [Transient Analysis](#5-transient-analysis)\n   - [Large-Signal Transient](#large-signal-transient)\n   - [Switching Simulations](#switching-simulations)\n   - [Delay Effect Simulations](#delay-effect-simulations)\n6. [Noise Analysis](#6-noise-analysis)\n   - [Thermal Noise Analysis](#thermal-noise-analysis)\n   - [Flicker Noise Analysis](#flicker-noise-analysis)\n   - [Shot Noise Analysis](#shot-noise-analysis)\n\n## Notes\n- This report is automatically generated based on mosfet_simulation.py\n- Items are marked with <span style='color: green'>✓</span> for success and <span style='color: red'>✗</span> for failure\n- Any deviations from expected behavior should be documented\n\n## 1. Simulation Setup and Execution\n- [<span style='color: green'>✓</span>] Circuit file exists and is readable\n  - Path: /mnt/d/proj/spice_model_benchmark/netlists/dc_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/transient_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/noise_circuit.cir, /mnt/d/proj/spice_model_benchmark/netlists/ac_circuit.cir\n- [<span style='color: green'>✓</span>] ngspice is properly installed\n  - Version: ngspice-36\n- [<span style='color: green'>✓</span>] Simulation runs without errors\n\n## 2. Summary\n### DC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [DC Operating Point Analysis](#dc-operating-point-analysis) | <span style='color: green'>✓</span> | VDS: 0.00V to 1.20V, VGS: 0.00V to 1.20V, IDS: -1.79e-02A to 2.87e-08A |\n| [Bias Point Analysis](#bias-point-analysis) | <span style='color: green'>✓</span> | Points: 9 VDS points, 9 VGS points, Currents: IDS: -1.53e-02A to 2.71e-08A, IG: -3.73e-07A to 1.34e-08A, IS: 1.01e-39A to 1.53e-02A, IB: -1.42e-38A to 3.30e-07A, KCL Error: 0.00%, Power: 0.00e+00W to 1.84e-02W, Temp: -40°C |\n| [Temperature Analysis](#temperature-analysis) | <span style='color: green'>✓</span> | Temp Points: [-40, 0, 25, 50, 100, 150], TC: 0.000015 /°C, IDS: -1.793e-02A to 2.870e-08A |\n| [Thermodynamic Analysis](#thermodynamic-analysis) | <span style='color: green'>✓</span> | Power: 0.000e+00W to 2.151e-02W, Efficiency: 7.992e+00 to 1.622e+10, TC: 8.34e-04/°C |\n\n### AC Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Small Signal Analysis](#small-signal-analysis) | <span style='color: green'>✓</span> | Gate capacitance range: 7.08fF to 13.98fF |\n| [S-Parameter Analysis](#s-parameter-analysis) | <span style='color: green'>✓</span> | S11 range: -2dB to -1dB, S21 range: -26dB to -22dB |\n| [Non-Quasi-Static (NQS) Effects Analysis](#non-quasi-static-effects-analysis) | <span style='color: green'>✓</span> | Max phase shift: 179.997 |\n| [Charge Conservation Analysis](#charge-conservation-analysis) | <span style='color: green'>✓</span> | Total charge error: 0.0 |\n\n### Transient Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Large-Signal Transient](#large-signal-transient) | <span style='color: green'>✓</span> | Max Current: 2.934e-05A, Rise Time: 0.1ps |\n| [Switching Simulations](#switching-simulations) | <span style='color: green'>✓</span> | Propagation Delay: 10.6ps, Power: 5.659e-03W (max), 1.485e-03W (avg) |\n| [Delay Effect](#delay-effect-simulations) | <span style='color: green'>✓</span> | Total Chain Delay: 24.9ps |\n| [Power Dissipation](#transient-simulations-for-power-dissipation) | <span style='color: green'>✓</span> | Temp Coeff: -3.050468e-05W/°C |\n| [Quasi-Static Analysis](#quasi-static-analysis) | <span style='color: green'>✓</span> | I-V characteristics analyzed: None |\n| [Charge Conservation](#charge-conservation-tests) | <span style='color: green'>✓</span> | Error: None |\n\n### Noise Analysis Summary\n| Test Type | Status | Key Findings |\n|-----------|--------|-------------|\n| [Thermal Noise](#thermal-noise-analysis) | <span style='color: green'>✓</span> | Floor: 2.65e+07 V²/Hz, Range: 2.16e-15 to 1.00e+09 V²/Hz |\n| [Flicker (1/f) Noise](#flicker-noise-analysis) | <span style='color: green'>✓</span> | Exponent: 0.5075, Corner Freq: 1.12e+00 Hz |\n| [Shot Noise](#shot-noise-analysis) | <span style='color: green'>✓</span> | Level: 3.79e-09 V²/Hz, Variation: 1.4676 |\n| [Temperature Dependence](#temperature-dependence) | <span style='color: green'>✓</span> | Coefficient: 2.77e-11 V²/Hz/°C, Range: -40.0°C to 150.0°C |\n| [Bias Dependence](#bias-dependence) | <span style='color: green'>✓</span> | Analyzed at 6 bias points |\n\n## 3. AC Analysis\n### DC Operating Point Analysis\n- [<span style='color: green'>✓</span>] IV data file is generated\n- [<span style='color: green'>✓</span>] Data points are properly read\n- [<span style='color: green'>✓</span>] Vds values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Vgs values are within range\n  - Range: 0.00V to 1.20V\n- [<span style='color: green'>✓</span>] Drain current (Ids) is properly measured\n  - Range: -1.79e-02A to 2.87e-08A\n\n*IV Characteristics showing drain current vs drain-source voltage*\n\n<img src='plots/dc_iv_characteristics.png' alt='IV Characteristics' width='400'/>\n\n### Bias Point Analysis\n- [<span style='color: green'>✓</span>] Voltage Biasing Points\n  - Points: 9 VDS points, 9 VGS points\n- [<span style='color: green'>✓</span>] Current Range\n  - IDS: -1.53e-02A to 2.71e-08A\n  - IG: -3.73e-07A to 1.34e-08A\n  - IS: 1.01e-39A to 1.53e-02A\n  - IB: -1.42e-38A to 3.30e-07A\n- [<span style='color: green'>✓</span>] KCL Error Range\n  - KCL Error: 0.00%\n\n*KCL verification showing current balance*\n\n<img src='plots/dc_kcl_verification.png' alt='KCL Verification' width='400'/>\n\n### Temperature Analysis\n- [<span style='color: green'>✓</span>] Temperature sweep is performed\n  - Points: [-40, 0, 25, 50, 100, 150]\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Temperature Coefficient: 0.000015 /°C\n- [<span style='color: green'>✓</span>] Device behavior is valid\n  - Current Range: -1.793e-02A to 2.870e-08A\n- [<span style='color: green'>✓</span>] Temperature-dependent behavior is valid\n\n*Temperature analysis showing current variation*\n\n<img src='plots/dc_temperature_analysis.png' alt='Temperature Analysis' width='400'/>\n\n### Thermodynamic Analysis\n- [<span style='color: green'>✓</span>] Energy is conserved\n  - Power Range: 0.000e+00W to 2.151e-02W\n- [<span style='color: green'>✓</span>] Device is efficient\n  - Efficiency Range: 7.992e+00 to 1.622e+10\n- [<span style='color: green'>✓</span>] Temperature coefficient is calculated\n  - Value: 8.34e-04/°C\n\n### Physical Properties Analysis\n- <span style='color: gray'>✗</span> Physical monotonicity over bias, geometry, and temperature: *In Progress*\n- <span style='color: gray'>✗</span> Parameter sweep simulations: *In Progress*\n- <span style='color: gray'>✗</span> Physical symmetries (currents, charges, their derivatives): *In Progress*\n- <span style='color: gray'>✗</span> Cross-derivative analysis: *In Progress*\n- <span style='color: gray'>✗</span> Terminal permutation tests: *In Progress*\n\n## 4. Transient Analysis\n### Large-Signal Transient\n- [<span style='color: green'>✓</span>] Large Signal Transient Verified\n  - Maximum Drain Current: 2.934367e-05A\n  - Gate Voltage Rise Time: 0.1ps\n\n*Large-signal transient analysis showing voltages and current response*\n\n<img src='plots/trans_large_signal_transient.png' alt='Large-Signal Transient Analysis' width='400'/>\n\n### Switching Simulations\n- [<span style='color: green'>✓</span>] Propagation Delay Verified\n  - Propagation Delay: 10.6ps\n\n  - Maximum Switching Power: 5.659051e-03W\n\n  - Average Switching Power: 1.485173e-03W\n\n*Inverter switching analysis showing input/output voltages and power*\n\n<img src='plots/trans_switching_response.png' alt='Switching Response' width='400'/>\n\n### Delay Effect Simulations\n- [<span style='color: green'>✓</span>] Propagation delay through inverter chain analyzed\n  - Stage 1 Delay: 13.7ps\n\n  - Stage 2 Delay: 6.1ps\n\n  - Stage 3 Delay: 5.1ps\n\n  - Total Delay: 24.9ps\n\n*Delay effect analysis showing signal propagation through inverter chain*\n\n<img src='plots/trans_delay_effect.png' alt='Delay Effect Analysis' width='400'/>\n\n### Transient Simulations for Power Dissipation\n- [<span style='color: green'>✓</span>] Temperature-dependent power analysis completed\n  - Maximum Power at 27°C: 9.361712e-03W\n\n  - Maximum Power at 100°C: 7.134870e-03W\n\n  - Average Power at 27°C: 1.538944e-03W\n\n  - Average Power at 100°C: 1.056623e-03W\n\n  - Power Temperature Coefficient: -3.050468e-05W/°C\n\n*Power dissipation analysis at different temperatures*\n\n<img src='plots/trans_power_dissipation.png' alt='Power Dissipation' width='400'/>\n\n*Energy consumption analysis at different temperatures*\n\n<img src='plots/trans_energy_consumption.png' alt='Energy Consumption' width='400'/>\n\n### Quasi-Static Analysis\n- [<span style='color: green'>✓</span>] Charge conservation analyzed\n*Quasi-static time-domain behavior analysis*\n\n<img src='plots/trans_quasi_static.png' alt='Quasi-Static Analysis' width='400'/>\n\n*Quasi-static I-V characteristic showing relationship between gate voltage and drain current*\n\n<img src='plots/trans_quasi_static_iv.png' alt='Quasi-Static I-V Characteristic' width='400'/>\n\n### Charge Conservation Tests\n- [<span style='color: red'>✗</span>] Charge Conservation verification failed\n  - Data not available or failed to read\n\n\n## 5. AC Analysis\n### Small-Signal Analysis\n- [<span style='color: green'>✓</span>] AC small-signal simulations verified\n  - Gate capacitance range: 7.08fF to 13.98fF\n  - Frequency range: 1.00e+06Hz to 1.00e+09Hz\n  - Max capacitance at: 0.00V\n\n*CV characteristics showing gate capacitance variation with gate voltage*\n\n<img src='plots/ac_cv_characteristics.png' alt='CV Characteristics' width='400'/>\n\nCapacitance components (Cgb, Cgs, Cgd) variation with gate voltage*\n\n<img src='plots/ac_cv_components.png' alt='CV Components' width='400'/>\n\n### S-Parameter Analysis\n- [<span style='color: green'>✓</span>] High-frequency AC simulations verified\n  - Frequency range: 1.0MHz to 1.0GHz\n- [<span style='color: green'>✓</span>] S-parameter analysis verified\n  - S11 range: -2dB to -1dB\n  - S21 range: -26dB to -22dB\n  - S12 range: -40dB to -32dB\n  - S22 range: -5dB to -3dB\n- [<span style='color: green'>✓</span>] RF simulations verified\n  - Isolation: >-10dB\n\n*S-Parameter analysis showing frequency response characteristics*\n\n<img src='plots/ac_cv_sparameter_analysis.png' alt='S-Parameters' width='400'/>\n\n### Non-Quasi-Static Effects Analysis\n- [<span style='color: green'>✓</span>] NQS effects verified\n  - Maximum phase shift: 179.997\n  - Frequency range: 10.0MHz to 10.0GHz\n\n*Non-quasi-static effects analysis showing phase shift between gate voltage and drain current*\n\n<img src='plots/ac_cv_nqs_effects.png' alt='NQS Effects' width='400'/>\n\n### Charge Conservation Analysis\n- [<span style='color: red'>✗</span>] Charge conservation verification failed\n  - Data not available or failed to read\n\n## 6. Noise Analysis\n### Thermal Noise Analysis\n- [<span style='color: green'>✓</span>] Thermal noise analysis completed\n  - Max Noise: 1.00e+09 V²/Hz\n  - Min Noise: 2.16e-15 V²/Hz\n  - Avg Noise: 2.54e+07 V²/Hz\n  - Noise Floor: 2.65e+07 V²/Hz\n  - Frequency Range: 0.0MHz to 1.0GHz\n\n*Thermal noise power spectral density analysis comparing different bias conditions, showing how the device noise characteristics change with bias voltage.*\n\n<img src='plots/noise_thermal_noise_vds_comparison.png' alt='Thermal Noise Comparison' width='400'/>\n\n### Flicker Noise Analysis\n- [<span style='color: green'>✓</span>] Flicker noise analysis completed\n  - Coefficient (K): 4.68e-08\n  - Exponent (γ): 5.07e-01 (ideally -1.0 for pure 1/f noise)\n  - Correlation (R²): 0.8265\n  - Corner Frequency: 1.12e+00 Hz\n\n*Flicker (1/f) noise analysis showing the power spectral density decreasing with frequency, a characteristic behavior in semiconductor devices associated with trapping/detrapping processes.*\n\n<img src='plots/noise_flicker_noise.png' alt='Flicker Noise Analysis' width='400'/>\n\n### Short Noise Analysis\n- [<span style='color: green'>✓</span>] Short noise analysis completed\n  - Shot Noise Level: 3.79e-09 V²/Hz\n  - Standard Deviation: 5.56e-09 V²/Hz\n  - Variation Coefficient: 1.4676\n\n*Shot noise analysis showing the frequency-independent noise component that arises from the discrete nature of electric charge carriers crossing potential barriers.*\n\n<img src='plots/noise_shot_noise.png' alt='Shot Noise Analysis' width='400'/>\n\n### Temperature Dependence\n- [<span style='color: green'>✓</span>] Short noise analysis completed\n  - Temperature Coefficient: 2.77e-11 V²/Hz/°C\n  - Temperature-Noise Correlation: None\n  - Temperature Range: -40.0°C to 150.0°C\n\n*Noise variation with temperature, illustrating how thermal effects influence the device's noise characteristics across the operational temperature range.*\n\n<img src='plots/noise_vs_temperature.png' alt='Shot Noise Analysis' width='400'/>\n\n### Bias Dependence\n- [<span style='color: green'>✓</span>] Bias Dependance analysis completed\n*Thermal Noise Results at Different Bias Points*\n\n| Bias Condition | Max Noise (V²/Hz) | Min Noise (V²/Hz) | Avg Noise (V²/Hz) | Noise Floor (V²/Hz) |\n|----------------|-------------------|-------------------|-------------------|--------------------|\n| Vgs=0.3V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=0.9V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.3V, Vds=1.2V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.3V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n| Vgs=0.6V, Vds=0.6V | 1.00e+09 | 2.16e-15 | 2.54e+07 | 2.16e-15 |\n\n",
        "simulator": "ngspice",
        "simulatorVersion": "unknown",
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
            "simulatorVersion": "unknown",
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
    }
  },
  "modelIds": [
    "reference_results",
    "results"
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
    }
  },
  "suiteIds": [
    "reference_results",
    "results"
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
    }
  },
  "modelFormats": [
    "ngspice"
  ],
  "availableModels": 10
};
export const SOURCE_INVENTORY = {"dataFiles":66,"plotFiles":45,"reportFiles":2,"logFiles":0,"netlistFiles":0,"otherFiles":0,"totalArtifacts":113};
