// Auto-generated — 2026-07-17T05:42:23.796Z
// Runs: 1, Models: 1, Suites: 1
import type { SpiceBenchmarkManifest } from "./SpiceBenchmarkTypes";
export const SPICE_BENCHMARK_MANIFEST: SpiceBenchmarkManifest = {
  "generatedAt": "2026-07-17T05:42:23.795Z",
  "repoUrl": "https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark",
  "runs": {
    "freepdk45_nmos_example": {
      "runId": "freepdk45_nmos_example",
      "status": "example",
      "pdkId": "FreePDK45",
      "modelId": "freepdk45_nmos",
      "modelPath": "models/freepdk45/nmos_v1.lib",
      "modelFormat": "ngspice",
      "deviceName": "NMOS_VTH",
      "netlistSuite": {
        "suiteId": "freepdk45_nmos_basic",
        "suiteName": "FreePDK45 NMOS Basic Suite",
        "dcCircuit": "netlists/dc_nmos_id_vd.cir",
        "acCircuit": "netlists/ac_nmos_cv.cir",
        "transientCircuit": "netlists/tran_nmos_switch.cir",
        "noiseCircuit": "netlists/noise_nmos_psd.cir"
      },
      "modes": [
        "dc",
        "ac",
        "tran",
        "noise"
      ],
      "simulator": "ngspice",
      "simulatorVersion": "43",
      "generatedAt": "2026-07-15T10:00:00Z",
      "commitSha": "example_fixture_001",
      "metadataSource": "fixture",
      "reportSummary": {
        "reportPath": "REPORT.md",
        "reportMarkdown": "# SPICE Model Benchmark Report — FreePDK45 NMOS Example\n\n**Model:** freepdk45_nmos (NMOS_VTH)\n**Simulator:** ngspice 43\n**Generated:** 2026-07-15T10:00:00Z\n**Status:** Example result — not real measured data\n\n## Overall Result: PASS (example)\n\nThis is a deterministic example fixture to demonstrate the benchmark dashboard.\nIt does NOT represent real fabrication data.\n\n## DC Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| Id-Vd family | PASS | 5 Vgs curves 0.4–1.0V, Vds sweep 0–1.8V, 101 points |\n| Id-Vg transfer | PASS | Vds=1.8V, Vgs sweep 0–1.8V, 101 points |\n| KCL check | PASS | Sum of terminal currents < 1e-12 A |\n| Temperature sweep | PASS | –40°C, 27°C, 85°C, 125°C |\n\n## AC Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| C-V curve | PASS | Frequency sweep 1kHz–1GHz, Vgs bias sweep |\n| Cgg vs Vgs | PASS | 5 frequencies, 41 bias points |\n| Capacitance matrix | PASS | 4-terminal matrix (G,S,D,B) |\n| S-parameter | UNAVAILABLE | Not generated for this example |\n\n## Transient Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| Switching waveform | PASS | Input pulse 0→1.8V, Cload=100fF |\n| Delay measurement | PASS | tphl=42ps, tplh=38ps |\n| Power measurement | PASS | Dynamic: 2.4µW, Static: 0.8nW |\n| Energy per switch | PASS | 0.12fJ |\n\n## Noise Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| PSD (log-log) | PASS | 1Hz–1THz, Vgs=0.6V, Vds=0.9V |\n| Bias comparison | PASS | Vgs=0.6V,0.8V,1.0V at Vds=0.9V |\n| Temperature comparison | UNAVAILABLE | Not generated for this example |\n\n## Notes\n\n⚠ Example result — replace with real simulation data for production use.\n",
        "simulator": "ngspice",
        "simulatorVersion": "43",
        "overallStatus": "pass"
      },
      "verificationTests": [
        {
          "testId": "dc_1",
          "domain": "dc",
          "name": "Id-Vd family",
          "status": "pass",
          "detail": "5 Vgs curves 0.4–1.0V, Vds sweep 0–1.8V, 101 points"
        },
        {
          "testId": "dc_2",
          "domain": "dc",
          "name": "Id-Vg transfer",
          "status": "pass",
          "detail": "Vds=1.8V, Vgs sweep 0–1.8V, 101 points"
        },
        {
          "testId": "dc_3",
          "domain": "dc",
          "name": "KCL check",
          "status": "pass",
          "detail": "Sum of terminal currents < 1e-12 A"
        },
        {
          "testId": "dc_4",
          "domain": "dc",
          "name": "Temperature sweep",
          "status": "pass",
          "detail": "–40°C, 27°C, 85°C, 125°C"
        },
        {
          "testId": "ac_5",
          "domain": "ac",
          "name": "C-V curve",
          "status": "pass",
          "detail": "Frequency sweep 1kHz–1GHz, Vgs bias sweep"
        },
        {
          "testId": "ac_6",
          "domain": "ac",
          "name": "Cgg vs Vgs",
          "status": "pass",
          "detail": "5 frequencies, 41 bias points"
        },
        {
          "testId": "ac_7",
          "domain": "ac",
          "name": "Capacitance matrix",
          "status": "pass",
          "detail": "4-terminal matrix (G,S,D,B)"
        },
        {
          "testId": "ac_8",
          "domain": "ac",
          "name": "S-parameter",
          "status": "unavailable",
          "detail": "Not generated for this example"
        },
        {
          "testId": "transient_9",
          "domain": "transient",
          "name": "Switching waveform",
          "status": "pass",
          "detail": "Input pulse 0→1.8V, Cload=100fF"
        },
        {
          "testId": "transient_10",
          "domain": "transient",
          "name": "Delay measurement",
          "status": "pass",
          "detail": "tphl=42ps, tplh=38ps"
        },
        {
          "testId": "transient_11",
          "domain": "transient",
          "name": "Power measurement",
          "status": "pass",
          "detail": "Dynamic: 2.4µW, Static: 0.8nW"
        },
        {
          "testId": "transient_12",
          "domain": "transient",
          "name": "Energy per switch",
          "status": "pass",
          "detail": "0.12fJ"
        },
        {
          "testId": "noise_13",
          "domain": "noise",
          "name": "PSD (log-log)",
          "status": "pass",
          "detail": "1Hz–1THz, Vgs=0.6V, Vds=0.9V"
        },
        {
          "testId": "noise_14",
          "domain": "noise",
          "name": "Bias comparison",
          "status": "pass",
          "detail": "Vgs=0.6V,0.8V,1.0V at Vds=0.9V"
        },
        {
          "testId": "noise_15",
          "domain": "noise",
          "name": "Temperature comparison",
          "status": "unavailable",
          "detail": "Not generated for this example"
        }
      ],
      "dataArtifacts": [
        {
          "name": "ac_cv.csv",
          "relPath": "data/ac_cv.csv",
          "domain": "ac",
          "format": "csv",
          "size": "1.4 KB",
          "hash": "a19002f0",
          "columns": [
            "freq(Hz)",
            "Vgs(V)",
            "Cgg(F)",
            "Cgd(F)",
            "Cgs(F)",
            "Cgb(F)"
          ],
          "rowCount": 25,
          "numericColumns": [
            "freq(Hz)",
            "Vgs(V)",
            "Cgg(F)",
            "Cgd(F)",
            "Cgs(F)",
            "Cgb(F)"
          ],
          "groups": {
            "byColumn": "freq(Hz)",
            "uniqueValues": [
              "1.000e+03",
              "1.000e+04",
              "1.000e+06",
              "1.000e+08",
              "1.000e+09"
            ]
          },
          "fetchUrl": "benchmark/freepdk45_nmos_example/data/ac_cv_a19002f0.json",
          "rawUrl": "benchmark/freepdk45_nmos_example/data/ac_cv_a19002f0.csv",
          "metadata": {}
        },
        {
          "name": "dc_nmos_iv.csv",
          "relPath": "data/dc_nmos_iv.csv",
          "domain": "dc",
          "format": "csv",
          "size": "1.6 KB",
          "hash": "f60c4196",
          "columns": [
            "Vgs",
            "Vds",
            "Id(A)",
            "gm(A/V)",
            "gds(A/V)"
          ],
          "rowCount": 40,
          "numericColumns": [
            "Vgs",
            "Vds",
            "Id(A)",
            "gm(A/V)",
            "gds(A/V)"
          ],
          "groups": {
            "byColumn": "Vgs",
            "uniqueValues": [
              "0.4",
              "0.6",
              "0.8",
              "1.0"
            ]
          },
          "fetchUrl": "benchmark/freepdk45_nmos_example/data/dc_nmos_iv_f60c4196.json",
          "rawUrl": "benchmark/freepdk45_nmos_example/data/dc_nmos_iv_f60c4196.csv",
          "metadata": {}
        },
        {
          "name": "noise_psd.csv",
          "relPath": "data/noise_psd.csv",
          "domain": "noise",
          "format": "csv",
          "size": "1.6 KB",
          "hash": "b7d7b6df",
          "columns": [
            "freq(Hz)",
            "Vgs(V)",
            "Vds(V)",
            "Sid(A^2/Hz)",
            "Svg(V^2/Hz)",
            "Sv(V^2/Hz)"
          ],
          "rowCount": 33,
          "numericColumns": [
            "freq(Hz)",
            "Vgs(V)",
            "Vds(V)",
            "Sid(A^2/Hz)",
            "Svg(V^2/Hz)",
            "Sv(V^2/Hz)"
          ],
          "groups": {
            "byColumn": "freq(Hz)",
            "uniqueValues": [
              "1.000e+00",
              "1.000e+01",
              "1.000e+02",
              "1.000e+03",
              "1.000e+04",
              "1.000e+05",
              "1.000e+06",
              "1.000e+07",
              "1.000e+08",
              "1.000e+09",
              "1.000e+10"
            ]
          },
          "fetchUrl": "benchmark/freepdk45_nmos_example/data/noise_psd_b7d7b6df.json",
          "rawUrl": "benchmark/freepdk45_nmos_example/data/noise_psd_b7d7b6df.csv",
          "metadata": {}
        },
        {
          "name": "transient_switch.csv",
          "relPath": "data/transient_switch.csv",
          "domain": "transient",
          "format": "csv",
          "size": "878 B",
          "hash": "faf2639a",
          "columns": [
            "time(s)",
            "Vin(V)",
            "Vout(V)",
            "Iin(A)",
            "Idd(A)",
            "power(W)"
          ],
          "rowCount": 16,
          "numericColumns": [
            "time(s)",
            "Vin(V)",
            "Vout(V)",
            "Iin(A)",
            "Idd(A)",
            "power(W)"
          ],
          "groups": {
            "byColumn": "Vin(V)",
            "uniqueValues": [
              "0.000",
              "0.900",
              "1.800"
            ]
          },
          "fetchUrl": "benchmark/freepdk45_nmos_example/data/transient_switch_faf2639a.json",
          "rawUrl": "benchmark/freepdk45_nmos_example/data/transient_switch_faf2639a.csv",
          "metadata": {}
        },
        {
          "name": "run_manifest.json",
          "relPath": "run_manifest.json",
          "domain": "overview",
          "format": "json",
          "size": "710 B",
          "hash": "7868c5aa",
          "columns": [
            "col_0"
          ],
          "rowCount": 22,
          "numericColumns": [],
          "groups": null,
          "fetchUrl": null,
          "rawUrl": null,
          "metadata": {}
        }
      ],
      "plotArtifacts": [],
      "otherArtifacts": [
        {
          "name": "REPORT.md",
          "relPath": "REPORT.md",
          "size": "1.6 KB",
          "hash": "b53c915a",
          "report": {
            "reportMarkdown": "# SPICE Model Benchmark Report — FreePDK45 NMOS Example\n\n**Model:** freepdk45_nmos (NMOS_VTH)\n**Simulator:** ngspice 43\n**Generated:** 2026-07-15T10:00:00Z\n**Status:** Example result — not real measured data\n\n## Overall Result: PASS (example)\n\nThis is a deterministic example fixture to demonstrate the benchmark dashboard.\nIt does NOT represent real fabrication data.\n\n## DC Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| Id-Vd family | PASS | 5 Vgs curves 0.4–1.0V, Vds sweep 0–1.8V, 101 points |\n| Id-Vg transfer | PASS | Vds=1.8V, Vgs sweep 0–1.8V, 101 points |\n| KCL check | PASS | Sum of terminal currents < 1e-12 A |\n| Temperature sweep | PASS | –40°C, 27°C, 85°C, 125°C |\n\n## AC Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| C-V curve | PASS | Frequency sweep 1kHz–1GHz, Vgs bias sweep |\n| Cgg vs Vgs | PASS | 5 frequencies, 41 bias points |\n| Capacitance matrix | PASS | 4-terminal matrix (G,S,D,B) |\n| S-parameter | UNAVAILABLE | Not generated for this example |\n\n## Transient Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| Switching waveform | PASS | Input pulse 0→1.8V, Cload=100fF |\n| Delay measurement | PASS | tphl=42ps, tplh=38ps |\n| Power measurement | PASS | Dynamic: 2.4µW, Static: 0.8nW |\n| Energy per switch | PASS | 0.12fJ |\n\n## Noise Analysis\n\n| Test | Status | Detail |\n|------|--------|--------|\n| PSD (log-log) | PASS | 1Hz–1THz, Vgs=0.6V, Vds=0.9V |\n| Bias comparison | PASS | Vgs=0.6V,0.8V,1.0V at Vds=0.9V |\n| Temperature comparison | UNAVAILABLE | Not generated for this example |\n\n## Notes\n\n⚠ Example result — replace with real simulation data for production use.\n",
            "simulator": "ngspice",
            "simulatorVersion": "43",
            "overallStatus": "pass",
            "verificationTests": [
              {
                "testId": "dc_1",
                "domain": "dc",
                "name": "Id-Vd family",
                "status": "pass",
                "detail": "5 Vgs curves 0.4–1.0V, Vds sweep 0–1.8V, 101 points"
              },
              {
                "testId": "dc_2",
                "domain": "dc",
                "name": "Id-Vg transfer",
                "status": "pass",
                "detail": "Vds=1.8V, Vgs sweep 0–1.8V, 101 points"
              },
              {
                "testId": "dc_3",
                "domain": "dc",
                "name": "KCL check",
                "status": "pass",
                "detail": "Sum of terminal currents < 1e-12 A"
              },
              {
                "testId": "dc_4",
                "domain": "dc",
                "name": "Temperature sweep",
                "status": "pass",
                "detail": "–40°C, 27°C, 85°C, 125°C"
              },
              {
                "testId": "ac_5",
                "domain": "ac",
                "name": "C-V curve",
                "status": "pass",
                "detail": "Frequency sweep 1kHz–1GHz, Vgs bias sweep"
              },
              {
                "testId": "ac_6",
                "domain": "ac",
                "name": "Cgg vs Vgs",
                "status": "pass",
                "detail": "5 frequencies, 41 bias points"
              },
              {
                "testId": "ac_7",
                "domain": "ac",
                "name": "Capacitance matrix",
                "status": "pass",
                "detail": "4-terminal matrix (G,S,D,B)"
              },
              {
                "testId": "ac_8",
                "domain": "ac",
                "name": "S-parameter",
                "status": "unavailable",
                "detail": "Not generated for this example"
              },
              {
                "testId": "transient_9",
                "domain": "transient",
                "name": "Switching waveform",
                "status": "pass",
                "detail": "Input pulse 0→1.8V, Cload=100fF"
              },
              {
                "testId": "transient_10",
                "domain": "transient",
                "name": "Delay measurement",
                "status": "pass",
                "detail": "tphl=42ps, tplh=38ps"
              },
              {
                "testId": "transient_11",
                "domain": "transient",
                "name": "Power measurement",
                "status": "pass",
                "detail": "Dynamic: 2.4µW, Static: 0.8nW"
              },
              {
                "testId": "transient_12",
                "domain": "transient",
                "name": "Energy per switch",
                "status": "pass",
                "detail": "0.12fJ"
              },
              {
                "testId": "noise_13",
                "domain": "noise",
                "name": "PSD (log-log)",
                "status": "pass",
                "detail": "1Hz–1THz, Vgs=0.6V, Vds=0.9V"
              },
              {
                "testId": "noise_14",
                "domain": "noise",
                "name": "Bias comparison",
                "status": "pass",
                "detail": "Vgs=0.6V,0.8V,1.0V at Vds=0.9V"
              },
              {
                "testId": "noise_15",
                "domain": "noise",
                "name": "Temperature comparison",
                "status": "unavailable",
                "detail": "Not generated for this example"
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
    "freepdk45_nmos"
  ],
  "models": {
    "freepdk45_nmos": {
      "modelId": "freepdk45_nmos",
      "modelName": "freepdk45_nmos",
      "modelPath": "models/freepdk45/nmos_v1.lib",
      "modelFormat": "ngspice",
      "deviceName": "NMOS_VTH",
      "deviceType": ""
    }
  },
  "suiteIds": [
    "freepdk45_nmos_basic"
  ],
  "netlistSuites": {
    "freepdk45_nmos_basic": {
      "suiteId": "freepdk45_nmos_basic",
      "suiteName": "FreePDK45 NMOS Basic Suite",
      "dcCircuit": "netlists/dc_nmos_id_vd.cir",
      "acCircuit": "netlists/ac_nmos_cv.cir",
      "transientCircuit": "netlists/tran_nmos_switch.cir",
      "noiseCircuit": "netlists/noise_nmos_psd.cir"
    }
  },
  "modelFormats": [
    "ngspice"
  ],
  "availableModels": 0
};
export const SOURCE_INVENTORY = {"dataFiles":5,"plotFiles":0,"reportFiles":1,"logFiles":0,"netlistFiles":0,"otherFiles":0,"totalArtifacts":6};
