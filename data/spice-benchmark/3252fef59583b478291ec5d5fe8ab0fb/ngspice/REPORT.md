# Benchmark Report: nmos_level1__expansion

- Simulator: `ngspice`
- Model MD5: `3252fef59583b478291ec5d5fe8ab0fb`
- Model name: `nmos_level1`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:35:33.546365+00:00`
- Completed: `2026-07-26T12:35:38.220210+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/3252fef59583b478291ec5d5fe8ab0fb/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/3252fef59583b478291ec5d5fe8ab0fb --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/3252fef59583b478291ec5d5fe8ab0fb/ngspice/benchmark.log
```
