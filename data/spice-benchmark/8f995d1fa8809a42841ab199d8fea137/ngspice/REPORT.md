# Benchmark Report: 22nm_LP__reduction

- Simulator: `ngspice`
- Model MD5: `8f995d1fa8809a42841ab199d8fea137`
- Model name: `nmos`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:50:52.870528+00:00`
- Completed: `2026-07-26T12:50:55.739133+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/8f995d1fa8809a42841ab199d8fea137/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/8f995d1fa8809a42841ab199d8fea137 --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/8f995d1fa8809a42841ab199d8fea137/ngspice/benchmark.log
```
