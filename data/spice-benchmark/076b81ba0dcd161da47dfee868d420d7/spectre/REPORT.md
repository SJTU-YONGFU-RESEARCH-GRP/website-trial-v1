# Benchmark Report: 180nm_bulk__expansion

- Simulator: `spectre`
- Model MD5: `076b81ba0dcd161da47dfee868d420d7`
- Model name: `NMOS`
- Requested modes: `dc, transient, ac, noise`
- Status: `completed_with_failures`
- Return code: `1`
- Started: `2026-07-26T12:39:09.368530+00:00`
- Completed: `2026-07-26T12:39:18.212926+00:00`

## Result

All requested benchmark modes were submitted, but the simulator suite returned a failure or timeout. Partial raw results are retained and the exact runner output is available in `benchmark.log`.

## Error

```text
command failed (1): /usr/bin/timeout --kill-after=10 300 /usr/bin/python -m spice_model_benchmark.cli /home/duhaochen/website-trial-v1/data/spice-benchmark/076b81ba0dcd161da47dfee868d420d7/model.lib --simulator spectre --modes dc transient ac noise --output-dir /home/duhaochen/website-trial-v1/data/spice-benchmark/076b81ba0dcd161da47dfee868d420d7 --dpi 150 --log-level WARNING; see /home/duhaochen/website-trial-v1/data/spice-benchmark/076b81ba0dcd161da47dfee868d420d7/spectre/benchmark.log
```
