# Benchmark Report: nmos_level1__original

- Simulator: `ngspice`
- Model MD5: `b0e9d98cfdd35ff415e9a51da7dfaff0`
- Model name: `nmos_level1`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:35:17.944646+00:00`
- Completed: `2026-07-26T12:35:23.315081+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/b0e9d98cfdd35ff415e9a51da7dfaff0/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/b0e9d98cfdd35ff415e9a51da7dfaff0 --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/b0e9d98cfdd35ff415e9a51da7dfaff0/ngspice/benchmark.log
```
