# Smoke-test record and runbook

Observed on 2026-08-14 in `/home/duhaochen`, Asia/Shanghai. Version output is
host evidence only; a production deployment must repeat probes under its actual
non-root worker account and store health records through Admin → Tools.

## Observed real tools

| Tool | Probe | Observed result | Status on audited host |
|---|---|---|---|
| Yosys | `/usr/local/bin/yosys -V` | `0.64+72`, git `22ef99218` | Available |
| OpenSTA | `/usr/local/bin/sta -version` | `3.1.0` | Available |
| Icarus | `/usr/bin/iverilog -V` | `12.0 stable` | Available |
| VVP | `/usr/bin/vvp -V` | `12.0 stable` | Available |
| ngspice | `ngspice --version` | `ngspice-46+`, KLU | Available |
| OpenROAD | `.../OpenROAD/bin/openroad -version` | `26Q3-771-g7cfb2105c9` | Binary available; full ORFS self-test still required |
| PPA parser | `result_json_ast.py --help` | `report/run/ast/leaves/audit` commands | Available |
| KLayout | `klayout -v` | `0.30.7` | Available |
| Magic | `magic --version` | `8.3.664` | Available |
| HSPICE | `command -v hspice` | no executable | Not configured |
| Spectre | `command -v spectre` | no executable | Not configured |

OpenLane 1 and LibreLane source trees exist, but the service user had no usable
Docker socket and no configured LibreLane Python runtime. They remain
Unavailable/Not configured and were not reported as successful.

## Real non-fixture executions

The following probes used existing retained design evidence and real binaries;
they did not use `test/fixtures/fake-tools`.

1. Yosys read the retained 8-bit ripple-adder RTL plus Sky130 blackbox cell
   declarations, resolved top `adder8_ripple`, synthesized it, and completed
   `stat`: `YOSYS_REAL_SMOKE_OK`.
2. Icarus 12 compiled the same RTL/cell declarations with `-g2012 -tnull`:
   `IVERILOG_REAL_SMOKE_OK`.
3. OpenSTA 3.1.0 executed the retained generated `sta.tcl`; the timing path
   reported `slack (MET)` and worst max slack `8.285554`.
4. `result_json_ast.py run --flow openroad --include-all` parsed the real
   retained UART run
   `/home/duhaochen/results/openroad/sky130A/sky130_fd_sc_hd/uart/RUN_2026-08-08_TECH_original`.
   It returned a valid lossless document with top-level `ast`,
   `interpretation`, and `source_bundle`, flow `openroad`, and 21 interpreted
   groups. The design interpretation included 798 logical/standard cells,
   die area `19344.6 µm²`, core area `17963.5 µm²`, and utilization `0.308282`.

A complete new ORFS/OpenLane/LibreLane RTL-to-GDS run was not launched during
this smoke pass: ORFS still needs an administrator-registered platform self-test,
and the other two runtimes were unavailable. This is an explicit unavailable
state, not a substituted success.

## Automated fixture evidence

`npm run test:integration` uses a real child executable boundary under
`NODE_ENV=test`. It covers success, non-zero exit, timeout, incomplete parser
output, and cancellation with a child process; production rejects that fixture
path. Integration tests exercise:

- login/session/CSRF and owner/admin access;
- streaming multipart/path/signature/quota limits;
- upload → preflight → explicit Start → worker → events → atomic result;
- independent Benchmark/Digital/PPA queues;
- worker restart recovery;
- failure/partial output never published;
- real production Benchmark import, Digital Yosys/OpenSTA adapter argv/parser,
  and PPA completed-run parser adapter.

Run the full gate:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
```

## Deployment smoke sequence

1. `GET /api/health` and `/api/docs/json` return 200.
2. Create a throwaway ordinary user; verify a bad password fails and logout
   invalidates the server session.
3. For every required tool, run Check paths, Probe version, and adapter
   self-test; verify absent proprietary tools remain disabled.
4. Upload one Benchmark completed report, one Digital JSON, and one PPA native
   run; preflight must display the exact plan before Start.
5. Start each job, observe SSE logs, and verify the private results enter the
   corresponding result API without rebuild.
6. Run one small real Digital source job with registered Liberty and, when
   available, one small real PPA design on a registered technology.
7. Cancel a long disposable job and verify no process group remains.
8. Restart the worker with one queued and one disposable running job; verify
   queued resumes and running becomes interrupted/retryable.
9. Publish one result as admin; verify anonymous visibility, then unpublish and
   verify it disappears publicly.
10. Restore a backup to a staging instance and repeat steps 1–5.
