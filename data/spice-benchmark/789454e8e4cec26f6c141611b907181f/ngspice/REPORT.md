# Benchmark Report: 22nm_LP__fitting

- Simulator: `ngspice`
- Model MD5: `789454e8e4cec26f6c141611b907181f`
- Model name: `nmos`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:55:55.773893+00:00`
- Completed: `2026-07-26T12:57:43.913880+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/789454e8e4cec26f6c141611b907181f/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/789454e8e4cec26f6c141611b907181f --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/789454e8e4cec26f6c141611b907181f/ngspice/benchmark.log
```
