# Benchmark Report: nmos_level1__translator

- Simulator: `ngspice`
- Model MD5: `8486baec7978259bc647103f972218a5`
- Model name: `nmos_level1`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:35:23.316055+00:00`
- Completed: `2026-07-26T12:35:29.235929+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/8486baec7978259bc647103f972218a5/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/8486baec7978259bc647103f972218a5 --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/8486baec7978259bc647103f972218a5/ngspice/benchmark.log
```
