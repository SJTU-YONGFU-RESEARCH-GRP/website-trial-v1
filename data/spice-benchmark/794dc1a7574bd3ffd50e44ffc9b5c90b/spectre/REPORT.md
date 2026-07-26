# Benchmark Report: nmos_level1__fitting

- Simulator: `spectre`
- Model MD5: `794dc1a7574bd3ffd50e44ffc9b5c90b`
- Model name: `nmos_level1`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:35:48.738824+00:00`
- Completed: `2026-07-26T12:38:22.482621+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/794dc1a7574bd3ffd50e44ffc9b5c90b/model.lib --simulator spectre --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/794dc1a7574bd3ffd50e44ffc9b5c90b --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/794dc1a7574bd3ffd50e44ffc9b5c90b/spectre/benchmark.log
```
