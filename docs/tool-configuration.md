# Tool and technology configuration

The adapter owns executable selection, argv construction, generated scripts,
allowed parameters, expected outputs, and parser rules. An administrator owns
only installation paths, time/concurrency limits, and allowlisted environment
values. User uploads never select an executable or supply a command string.

The audited capability matrix and host observations are in
[tool-capabilities.md](tool-capabilities.md).

## Configuration fields

Each saved revision contains:

- `toolId` and module (`benchmark`, `digital`, or `ppa`);
- enabled state;
- optional tool root;
- executable path, or Python interpreter plus adapter entry point;
- optional working directory;
- timeout and maximum concurrency;
- adapter-approved environment variable names and values;
- fixed version-probe argv;
- adapter ID/version.

All filesystem paths are absolute. The server resolves configured paths before
execution, and the worker executes argv arrays with `shell:false`. Environment
values whose names are not in the adapter allowlist are rejected. Secrets and
license variables are redacted from persisted log events.

Saving a change creates a new revision. A ready job contains a snapshot of the
revision, capability version, and probed tool version; later admin changes do
not alter that plan.

## Examples

Fitting on the audited repository:

```text
toolId             fitting
module             benchmark
rootPath           /home/edatool/spice_model_fitting
interpreterPath    /home/edatool/spice_model_fitting/.venv/bin/python
entryPoint         calibrate_bsim.py
adapterId          benchmark-fitting
timeoutSeconds     3600
maxConcurrency     1
```

Spectre, when the licensed installation and adapter self-test are available:

```text
toolId             spectre
module             benchmark
rootPath           /home/edatool/spectre
executablePath     /home/edatool/spectre/bin/spectre
adapterId          benchmark-spectre
timeoutSeconds     1800
maxConcurrency     1
```

Do not enable Spectre or HSPICE merely because a path exists. The simulator is
selectable only after its adapter can generate a compatible native netlist,
execute a minimal case, parse output, and record a successful self-test.

Digital examples:

```text
yosys:   executablePath=/usr/local/bin/yosys, versionProbeArgv=["-V"]
opensta: executablePath=/usr/local/bin/sta,   versionProbeArgv=["-version"]
iverilog: executablePath=/usr/bin/iverilog
vvp:      executablePath=/usr/bin/vvp
```

PPA examples:

```text
openroad-orfs:
  rootPath=/opt/OpenROAD-flow-scripts
  executablePath=/usr/bin/make
  adapterId=openroad-orfs

ppa-result-parser:
  rootPath=/opt/rtl2gds-copilot-orchestrator
  interpreterPath=/usr/bin/python3
  entryPoint=/opt/rtl2gds-copilot-orchestrator/scripts/result_json_ast.py
  adapterId=ppa-result-parser-v1
```

OpenLane and LibreLane require a pinned runtime that the service account can
actually use. A source checkout with an inaccessible Docker socket is
`Unavailable`, not healthy.

## Health sequence

For a new revision:

1. Save it disabled when possible.
2. **Check paths** verifies real paths, file type, execute/read permissions, and
   entry point.
3. **Probe version** runs only the adapter's fixed probe argv in an isolated
   probe directory.
4. **Run minimal self-test** verifies adapter-specific handoff and parsing.
5. Enable it and inspect `/api/modules/<module>/capabilities`.

Health statuses mean:

- `healthy`: current probe succeeded and the adapter may plan it;
- `degraded`: executable responds but a required dependency/self-test is
  incomplete;
- `unavailable`: a configured path or probe failed;
- `not_configured`: no usable revision exists.

Deleting or disabling a revision needed by a frozen job is unsafe. Create a new
revision and allow existing queued/running jobs to finish first.

## Technology records

A Technology Library revision binds PDK semantics to adapters:

```text
technologyId          sky130A-hd-tt
processNode           130nm
pdk                   sky130A
standardCellLibrary   sky130_fd_sc_hd
libertyPaths          [/opt/pdk/.../sky130_fd_sc_hd__tt_025C_1v80.lib]
techLefPath            /opt/pdk/.../techlef/sky130_fd_sc_hd.tlef
cellLefPaths           [/opt/pdk/.../lef/sky130_fd_sc_hd.lef]
corner                 tt_025C_1v80
voltage                1.8
rcCorner               nominal
allowedAdapterIds      [digital-yosys-opensta-v1, openroad-orfs]
```

The backend validates adapter allowlists and freezes the technology ID/revision
in job parameters. Do not register user-writable PDK paths.

## Test fixture boundary

`test/fixtures/fake-tools` is accepted only when `NODE_ENV=test`. The production
admin API rejects configurations pointing there, and it must never be copied or
symlinked into a production tool root. Fake outputs prove process and state
machinery; they are not EDA results.
