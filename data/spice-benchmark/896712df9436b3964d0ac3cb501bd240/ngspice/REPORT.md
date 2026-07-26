# Benchmark Report: 22nm_LP__translator

- Simulator: `ngspice`
- Model MD5: `896712df9436b3964d0ac3cb501bd240`
- Model name: `nmos`
- Requested modes: `dc, transient, ac, noise`
- Status: `timeout`
- Return code: `1`
- Started: `2026-07-26T12:45:52.821118+00:00`
- Completed: `2026-07-26T12:50:52.869720+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (124): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/896712df9436b3964d0ac3cb501bd240/model.lib --simulator ngspice --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/896712df9436b3964d0ac3cb501bd240 --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/896712df9436b3964d0ac3cb501bd240/ngspice/benchmark.log
```
