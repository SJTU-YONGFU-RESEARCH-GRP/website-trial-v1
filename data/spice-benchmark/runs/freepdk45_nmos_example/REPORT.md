# SPICE Model Benchmark Report — FreePDK45 NMOS Example

**Model:** freepdk45_nmos (NMOS_VTH)
**Simulator:** ngspice 43
**Generated:** 2026-07-15T10:00:00Z
**Status:** Example result — not real measured data

## Overall Result: PASS (example)

This is a deterministic example fixture to demonstrate the benchmark dashboard.
It does NOT represent real fabrication data.

## DC Analysis

| Test | Status | Detail |
|------|--------|--------|
| Id-Vd family | PASS | 5 Vgs curves 0.4–1.0V, Vds sweep 0–1.8V, 101 points |
| Id-Vg transfer | PASS | Vds=1.8V, Vgs sweep 0–1.8V, 101 points |
| KCL check | PASS | Sum of terminal currents < 1e-12 A |
| Temperature sweep | PASS | –40°C, 27°C, 85°C, 125°C |

## AC Analysis

| Test | Status | Detail |
|------|--------|--------|
| C-V curve | PASS | Frequency sweep 1kHz–1GHz, Vgs bias sweep |
| Cgg vs Vgs | PASS | 5 frequencies, 41 bias points |
| Capacitance matrix | PASS | 4-terminal matrix (G,S,D,B) |
| S-parameter | UNAVAILABLE | Not generated for this example |

## Transient Analysis

| Test | Status | Detail |
|------|--------|--------|
| Switching waveform | PASS | Input pulse 0→1.8V, Cload=100fF |
| Delay measurement | PASS | tphl=42ps, tplh=38ps |
| Power measurement | PASS | Dynamic: 2.4µW, Static: 0.8nW |
| Energy per switch | PASS | 0.12fJ |

## Noise Analysis

| Test | Status | Detail |
|------|--------|--------|
| PSD (log-log) | PASS | 1Hz–1THz, Vgs=0.6V, Vds=0.9V |
| Bias comparison | PASS | Vgs=0.6V,0.8V,1.0V at Vds=0.9V |
| Temperature comparison | UNAVAILABLE | Not generated for this example |

## Notes

⚠ Example result — replace with real simulation data for production use.
