# Upload and preflight contract

Benchmark, Digital, and PPA use the same explicit sequence:

1. choose a single file, multiple files, or a folder;
2. preserve and display relative paths;
3. calculate/display local SHA-256 where practical;
4. upload as streaming `multipart/form-data`;
5. inspect server recognition and map file roles;
6. set capability-backed parameters;
7. run backend preflight;
8. review immutable Planned Operations and argv/config mappings;
9. click **Start** to enter the persistent module queue.

Upload and preflight never execute an EDA process. Only a `ready` job can be
started.

## Multipart wire format

The draft endpoint is:

```text
POST /api/modules/{benchmark|digital|ppa}/drafts
Content-Type: multipart/form-data
X-CSRF-Token: <session token>
```

Text fields:

- `operation` — module operation, for example `run`, `import`,
  `run-from-source`, or `import-completed-result`;
- `workflow` — an adapter workflow identifier;
- optional `rootHint` — display-only folder root hint.

Every file part uses field name `file:<base64url(relative POSIX path)>`. The
browser filename is informational; the decoded field path is authoritative.
Folder selection uses `webkitRelativePath`, preserving include and run-tree
layout. Files are streamed to a draft area and hashed; they are not base64
encoded in JSON and are never held as one giant request body.

Successful creation returns the API envelope with a `draft` job and recognition
manifest. Each manifest file contains relative path, byte size, SHA-256, media
type, recognized type, role, required/use-by-step metadata, unresolved includes,
and validation errors.

## Draft patch and preflight

```text
PATCH /api/jobs/{jobId}/draft
Content-Type: application/json

{
  "fileRoles": { "rtl/top.sv": "rtl" },
  "parameters": { "topModule": "top" },
  "technologyLibraryId": null
}
```

The backend validates input signatures, role compatibility, includes,
capability values, tool health, technology revision, sweep cardinality, and the
exact process plan. On success it freezes input permissions and returns status
`ready`. A subsequent patch is rejected. `POST /api/jobs/{jobId}/start` is the
only transition to `queued`.

## Module roles

Benchmark:

- source model/library, measured DC IV CSV, optional base model and sigma JSON;
- completed `REPORT.md`, manifest, native data, and plots for import;
- included model files retain their relative directory tree.

Digital:

- `rtl`, `gate_netlist`, supported `yosys_json`, `liberty`, `sdc`, `testbench`,
  and include/header;
- `completed_result` JSON/CSV for import.

PPA:

- `rtl`, supported `gate_netlist`, `sdc`, include, macro Liberty/LEF/GDS;
- `completed_run` native metrics, DEF/GDS, STA/SPEF, logs, and evidence tree.

Uploaded `.sh`, Python, Makefile, and Tcl are labeled
`evidence-script-never-executed`. SDC/config subsets are parsed and regenerated
by adapters; uploaded programs are never placed in executable argv.

## Path, signature, and quota rules

The server rejects:

- absolute, drive-prefixed, empty, `.`/`..`, NUL, and duplicate normalized
  paths;
- symlinks, devices, and non-regular workspace input;
- mismatched known binary signatures and binary data under text extensions;
- file-count, per-file, total-upload, or user storage-quota excess;
- unresolved relative includes required by the selected adapter;
- parameter/sweep values outside the returned capability schema.

Shell metacharacters in a filename remain inert data because tools receive
backend-built argv arrays and generated configuration. User input never becomes
an executable or a shell fragment.

Limits are controlled by `EDA_MAX_UPLOAD_FILES`,
`EDA_MAX_UPLOAD_FILE_BYTES`, `EDA_MAX_UPLOAD_TOTAL_BYTES`, user quota, and
`EDA_MAX_SWEEP_JOBS`. Reverse-proxy limits must be at least as large as backend
limits or users will receive a proxy error before the API can return its
versioned error envelope.

If a single source references missing `.include`/`` `include`` dependencies,
the UI displays each unresolved path and asks the user to add the dependencies
or choose the containing folder.
