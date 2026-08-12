# Unified data upload

Benchmark, Digital, and PPA use the same-origin endpoint:

```text
GET  /api/uploads  # capabilities and limits
POST /api/uploads  # validate, persist, publish
POST /api/uploads/jobs  # start a background import and return a job ID
GET  /api/uploads/jobs/<job-id>  # progress, stage, logs, recognition, result/error
```

The React pages share `DataUploadCard`; each page names the tool group that will
process its data. The browser reads selected files, keeps their folder-relative
paths, sends one JSON envelope, and reports file-read plus XHR upload progress.
The asynchronous job endpoint then reports backend recognition, validation,
parsing, persistence, and index-generation progress. A link opens
`#/upload-processing/<job-id>`, where the persisted stage log and recognized
content remain inspectable after completion. The original synchronous POST is
retained for API compatibility. The server rejects unsafe paths, duplicate names, unsupported
extensions, empty files, size/count violations, malformed data, incomplete
artifact contracts, cross-origin requests, and identity conflicts before it
publishes anything.

Limits are 16 MiB per file, 64 MiB per request, and 512 files. A content hash
is the upload UID, so retrying the exact same accepted upload is idempotent.
Digital imports are additionally limited to 100,000 rows. PNG and gzip inputs
must carry the matching binary signature, not only the filename extension.
Job state is stored under `data/upload-jobs`; finished jobs include the exact
tool, input format, recognized design/model/technology identity, published UID,
and any structured failure code.

## Digital

Accepted primary formats: JSON and CSV.

Required row fields:

```text
architecture, bitWidth, processNode, fmaxMhz, powerMw, areaUm2
```

`category`, `canonicalTechnology`, `isNamedPdk`, and `displayName` are
recommended. JSON may be one object, an array, or `{ "rows": [...] }`. CSV uses
the same field names as headers. Metrics must be finite and positive; bit width
must be a positive integer. The service creates or joins the content-addressed
technology resource under `data/digital-technologies`, rejects an existing
point with different content, and runs `generate-design-data.mjs`. The Digital
page reloads after success so selectors and charts use the new row immediately.

## PPA

Accepted primary shapes are the formats already consumed by the common AST
parser:

- `normalized-metrics.json` with DTCO `manifest.json` and `status.json`;
- OpenROAD `metrics.json`;
- OpenLane `reports/metrics.csv`;
- LibreLane `final/metrics.json` or a terminal `state_out.json`.

Choose the run folder so final DEF and timing evidence remain available. Native
folders should retain `flow/pdk/[scl]/design/run`; a standalone folder may add:

```json
{
  "flow": "openroad",
  "pdk": "sky130A",
  "scl": "sky130_fd_sc_hd",
  "design": "uart",
  "runName": "RUN_user_import"
}
```

as `upload-manifest.json`. The server invokes the same
`result_json_ast.py run` parser used for existing reports and requires observed
performance, power, and area before committing the bundle under
`data/uploads/ppa/<upload-id>`. It then regenerates the content-addressed PPA
store. The PPA page refreshes its index and selects the newly published UID.

## Benchmark

Choose one complete current model-result folder. It must contain exactly one
`model-manifest.json`, the declared model file whose content MD5 equals the
manifest/directory MD5, and one or more `ngspice`, `hspice`, or `spectre`
directories. Each simulator directory must satisfy the same displayability
contract as existing data: successful fixed-native execution, preserved model
parameters, submitted-netlist hashes, all four native netlists, report, data,
plots, and non-synthetic plot provenance.

Validated data is copied into `data/spice-model-benchmark/<md5>`. Identical
retries are accepted; an existing simulator result with different content is a
conflict. The dynamic Benchmark index is invalidated and the page reloads the
scenario immediately.

## Persistence and deployment

Uploads are server-side filesystem writes, not browser-local state. They are
available while the site runs through the configured Vite service (`npm run
dev`), including the background service on port 3000. Static GitHub Pages alone
cannot accept writes; a deployment that needs uploads must run this server-side
middleware with a writable `data` directory.
