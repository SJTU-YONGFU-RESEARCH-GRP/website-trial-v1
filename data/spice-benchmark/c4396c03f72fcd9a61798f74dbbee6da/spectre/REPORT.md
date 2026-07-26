# Benchmark Report: 180nm_bulk__fitting

- Simulator: `spectre`
- Model MD5: `c4396c03f72fcd9a61798f74dbbee6da`
- Model name: `NMOS`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:39:18.214001+00:00`
- Completed: `2026-07-26T12:39:28.782019+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/c4396c03f72fcd9a61798f74dbbee6da/model.lib --simulator spectre --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/c4396c03f72fcd9a61798f74dbbee6da --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/c4396c03f72fcd9a61798f74dbbee6da/spectre/benchmark.log
```
