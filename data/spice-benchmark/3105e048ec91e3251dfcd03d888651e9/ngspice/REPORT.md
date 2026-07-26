# Benchmark Report: 22nm_LP__original

- Simulator: `ngspice`
- Model MD5: `3105e048ec91e3251dfcd03d888651e9`
- Model name: `nmos`
- Requested modes: `dc, transient, ac, noise`
- Status: `timeout`
- Return code: `1`
- Started: `2026-07-26T12:40:52.772056+00:00`
- Completed: `2026-07-26T12:45:52.820222+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (124): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/3105e048ec91e3251dfcd03d888651e9/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/3105e048ec91e3251dfcd03d888651e9 --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/3105e048ec91e3251dfcd03d888651e9/ngspice/benchmark.log
```
