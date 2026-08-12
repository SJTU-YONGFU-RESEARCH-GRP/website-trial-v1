import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type UploadDataset = "benchmark" | "digital" | "ppa";

type JsonObject = Record<string, unknown>;

interface EncodedUploadFile {
  path: string;
  type?: string;
  size?: number;
  contentBase64: string;
}

interface UploadPayload {
  dataset: UploadDataset;
  files: EncodedUploadFile[];
}

interface DecodedUploadFile {
  relativePath: string;
  content: Buffer;
}

interface PpaIdentity {
  flow: "openroad" | "openlane" | "librelane";
  pdk: string;
  scl: string | null;
  design: string;
  runName: string;
  runRelativeDir: string;
}

interface UploadRecognition {
  tool: string;
  format: string;
  summary: string;
  details: string[];
}

interface UploadProcessResult {
  publishedIds: string[];
  recordCount: number;
  refreshMode: "index" | "reload";
  recognition: UploadRecognition;
}

type UploadProgressReporter = (
  progress: number,
  stage: string,
  message: string,
) => void | Promise<void>;

type UploadJobStatus = "queued" | "processing" | "published" | "failed";

interface UploadJobLog {
  at: string;
  level: "info" | "success" | "error";
  message: string;
}

interface UploadJobRecord {
  schemaVersion: "eda-upload-job.v1";
  jobId: string;
  uploadId: string;
  dataset: UploadDataset;
  tool: string;
  status: UploadJobStatus;
  progress: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  logs: UploadJobLog[];
  result?: Awaited<ReturnType<typeof processUpload>>;
  error?: { code: string; message: string };
}

interface UploadServiceOptions {
  projectRoot: string;
  parserPath: string;
  validateBenchmarkRun: (
    runDirectory: string,
    simulator: "ngspice" | "hspice" | "spectre",
    manifest: JsonObject,
  ) => Promise<boolean>;
  invalidateBenchmarkIndex: () => void;
}

const MAX_REQUEST_BYTES = 64 * 1024 * 1024;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_FILES = 512;
const DATASET_TOOL_NAMES: Record<UploadDataset, string> = {
  benchmark: "SPICE Model Benchmark · ngspice / HSPICE / Spectre",
  digital: "Digital PPA Dataset · Architecture comparison",
  ppa: "RTL-to-GDS PPA · OpenROAD / OpenLane / LibreLane",
};
const DATASET_EXTENSIONS: Record<UploadDataset, Set<string>> = {
  digital: new Set([".json", ".csv"]),
  ppa: new Set([
    ".json", ".csv", ".def", ".rpt", ".log", ".txt", ".tcl", ".spef", ".v", ".sdc", ".lef",
    ".gds", ".odb", ".gz", ".xml", ".yaml", ".yml",
  ]),
  benchmark: new Set([
    ".json", ".csv", ".md", ".txt", ".lib", ".model", ".sp", ".cir", ".scs", ".png",
  ]),
};

class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "UPLOAD_INVALID",
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function safeSegment(value: unknown, label: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || !/^[A-Za-z0-9_.+-]+$/.test(normalized)) {
    throw new UploadError(`${label} must contain only letters, digits, dot, underscore, plus, or dash`);
  }
  return normalized;
}

function safeRelativePath(value: unknown): string {
  const normalized = String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized
    || normalized.startsWith("/")
    || normalized.includes("\0")
    || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")
    || normalized.length > 512
  ) {
    throw new UploadError(`unsafe upload path: ${String(value ?? "")}`);
  }
  return normalized;
}

function jsonResponse(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(`${JSON.stringify(body)}\n`);
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const declared = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    throw new UploadError("upload exceeds the 64 MiB request limit", 413, "UPLOAD_TOO_LARGE");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_REQUEST_BYTES) {
      throw new UploadError("upload exceeds the 64 MiB request limit", 413, "UPLOAD_TOO_LARGE");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function decodePayload(raw: Buffer): { dataset: UploadDataset; files: DecodedUploadFile[] } {
  let payload: UploadPayload;
  try {
    payload = JSON.parse(raw.toString("utf8")) as UploadPayload;
  } catch (error) {
    throw new UploadError(`request body is not valid JSON: ${String(error)}`);
  }
  if (!(["benchmark", "digital", "ppa"] as const).includes(payload.dataset)) {
    throw new UploadError("dataset must be benchmark, digital, or ppa");
  }
  if (!Array.isArray(payload.files) || payload.files.length === 0) {
    throw new UploadError("select at least one file");
  }
  if (payload.files.length > MAX_FILES) {
    throw new UploadError(`upload contains more than ${MAX_FILES} files`, 413, "TOO_MANY_FILES");
  }
  const seen = new Set<string>();
  const files = payload.files.map((record) => {
    const relativePath = safeRelativePath(record.path);
    if (seen.has(relativePath)) throw new UploadError(`duplicate upload path: ${relativePath}`);
    seen.add(relativePath);
    const extension = path.extname(relativePath).toLowerCase();
    if (!DATASET_EXTENSIONS[payload.dataset].has(extension)) {
      throw new UploadError(`${relativePath}: ${extension || "extensionless files"} are not accepted for ${payload.dataset}`);
    }
    if (typeof record.contentBase64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(record.contentBase64)) {
      throw new UploadError(`${relativePath}: invalid base64 content`);
    }
    const content = Buffer.from(record.contentBase64, "base64");
    if (content.length === 0) throw new UploadError(`${relativePath}: empty files are not accepted`);
    if (content.length > MAX_FILE_BYTES) {
      throw new UploadError(`${relativePath}: exceeds the 16 MiB per-file limit`, 413, "FILE_TOO_LARGE");
    }
    if (record.size !== undefined && Number(record.size) !== content.length) {
      throw new UploadError(`${relativePath}: declared size does not match decoded content`);
    }
    if (extension === ".png" && !content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new UploadError(`${relativePath}: extension is .png but the PNG signature is missing`);
    }
    if (extension === ".gz" && !(content[0] === 0x1f && content[1] === 0x8b)) {
      throw new UploadError(`${relativePath}: extension is .gz but the gzip signature is missing`);
    }
    return { relativePath, content };
  });
  return { dataset: payload.dataset, files };
}

function contentUploadId(dataset: UploadDataset, files: DecodedUploadFile[]): string {
  const digest = createHash("sha256").update(`eda-upload-v1\0${dataset}\0`);
  for (const file of [...files].sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"))) {
    digest.update(file.relativePath).update("\0").update(createHash("sha256").update(file.content).digest()).update("\0");
  }
  return digest.digest("hex").slice(0, 32);
}

async function writeFiles(root: string, files: DecodedUploadFile[]): Promise<void> {
  for (const file of files) {
    const destination = path.join(root, ...file.relativePath.split("/"));
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.writeFile(destination, file.content, { flag: "wx" });
  }
}

async function directoryDigest(root: string): Promise<string> {
  const files: string[] = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    if (!current) break;
    for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile()) files.push(candidate);
      else throw new UploadError(`${candidate}: symbolic links and special files are not accepted`);
    }
  }
  const digest = createHash("sha256");
  for (const file of files.sort((left, right) => left.localeCompare(right, "en"))) {
    digest.update(path.relative(root, file).split(path.sep).join("/")).update("\0");
    digest.update(await fsp.readFile(file)).update("\0");
  }
  return digest.digest("hex");
}

function uploadedFormats(files: DecodedUploadFile[]): string {
  return [...new Set(files.map((file) => path.extname(file.relativePath).slice(1).toUpperCase()))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "en"))
    .join(" + ");
}

function digitalRecognition(rows: JsonObject[], files: DecodedUploadFile[]): UploadRecognition {
  const technologies = [...new Set(rows.map((row) => String(row.processNode ?? "")).filter(Boolean))];
  const architectures = [...new Set(rows.map((row) => String(row.architecture ?? "")).filter(Boolean))];
  return {
    tool: DATASET_TOOL_NAMES.digital,
    format: uploadedFormats(files) || "JSON / CSV",
    summary: `${rows.length} design point${rows.length === 1 ? "" : "s"} recognized`,
    details: [
      `Technology: ${technologies.join(", ") || "unknown"}`,
      `Architecture: ${architectures.join(", ") || "unknown"}`,
    ],
  };
}

function ppaRecognition(identity: PpaIdentity, files: DecodedUploadFile[]): UploadRecognition {
  const flowName = identity.flow === "openroad" ? "OpenROAD" : identity.flow === "openlane" ? "OpenLane" : "LibreLane";
  return {
    tool: flowName,
    format: uploadedFormats(files) || "native run bundle",
    summary: `${identity.design} · ${identity.pdk}${identity.scl ? ` · ${identity.scl}` : ""}`,
    details: [`Run: ${identity.runName}`, `Flow: ${flowName}`],
  };
}

function benchmarkRecognition(
  modelId: string,
  md5: string,
  simulators: readonly ("ngspice" | "hspice" | "spectre")[],
  files: DecodedUploadFile[],
): UploadRecognition {
  const names = simulators.map((simulator) => simulator === "hspice" ? "HSPICE" : simulator === "spectre" ? "Spectre" : "ngspice");
  return {
    tool: names.join(" · "),
    format: `Complete benchmark bundle · ${uploadedFormats(files)}`,
    summary: modelId || md5,
    details: [`Model MD5: ${md5}`, `Simulator runs: ${names.join(", ")}`],
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (quoted) throw new UploadError("CSV contains an unterminated quoted field");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function rowsFromFile(file: DecodedUploadFile): JsonObject[] {
  const text = file.content.toString("utf8");
  if (file.relativePath.toLowerCase().endsWith(".json")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new UploadError(`${file.relativePath}: invalid JSON: ${String(error)}`);
    }
    if (Array.isArray(parsed)) return parsed.map(asObject);
    const object = asObject(parsed);
    if (Array.isArray(object.rows)) return object.rows.map(asObject);
    return [object];
  }
  const matrix = parseCsv(text);
  if (matrix.length < 2) throw new UploadError(`${file.relativePath}: CSV needs a header and at least one row`);
  const headers = matrix[0].map((value) => value.trim());
  if (new Set(headers).size !== headers.length || headers.some((header) => !header)) {
    throw new UploadError(`${file.relativePath}: CSV headers must be non-empty and unique`);
  }
  return matrix.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new UploadError(`${file.relativePath}: row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function finitePositive(value: unknown, label: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) throw new UploadError(`${label} must be a finite number greater than zero`);
  return numeric;
}

function technologyUid(processNode: string, canonicalTechnology: string, isNamedPdk: boolean): string {
  return createHash("md5").update(JSON.stringify({
    schemaVersion: 1,
    processNode,
    canonicalTechnology,
    isNamedPdk,
  })).digest("hex");
}

async function existingTechnology(projectRoot: string, processNode: string): Promise<JsonObject | null> {
  const root = path.join(projectRoot, "data/digital-technologies");
  for (const entry of await fsp.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = asObject(JSON.parse(await fsp.readFile(path.join(root, entry.name, "technology.json"), "utf8")));
      if (manifest.processNode === processNode) return manifest;
    } catch {
      // The canonical generator/validator reports malformed existing resources.
    }
  }
  return null;
}

async function processDigital(
  options: UploadServiceOptions,
  uploadId: string,
  files: DecodedUploadFile[],
  report: UploadProgressReporter,
): Promise<UploadProcessResult> {
  await report(12, "recognizing", "Reading Digital JSON/CSV rows and checking the metric contract.");
  const uploadRoot = path.join(options.projectRoot, "data/uploads/digital", uploadId);
  if (fs.existsSync(path.join(uploadRoot, "receipt.json"))) {
    const receipt = asObject(JSON.parse(await fsp.readFile(path.join(uploadRoot, "receipt.json"), "utf8")));
    const rows = Array.isArray(receipt.rows) ? receipt.rows.map(asObject) : [];
    await report(88, "publishing", "This content is already published; reusing its canonical technology records.");
    return {
      publishedIds: [...new Set(rows.map((row) => String(row.technologyUid)))],
      recordCount: rows.length,
      refreshMode: "reload",
      recognition: digitalRecognition(rows, files),
    };
  }
  const parsedRows = files.flatMap((file) => rowsFromFile(file));
  if (parsedRows.length === 0) throw new UploadError("no Digital result rows were found");
  if (parsedRows.length > 100_000) throw new UploadError("Digital upload exceeds 100,000 rows", 413, "TOO_MANY_ROWS");
  const normalized: Array<JsonObject & {
    architecture: string; category: string; bitWidth: number; processNode: string;
    canonicalTechnology: string; isNamedPdk: boolean; fmaxMhz: number; powerMw: number; areaUm2: number;
    technologyUid: string;
  }> = [];
  for (const [index, row] of parsedRows.entries()) {
    const processNode = safeSegment(row.processNode, `row ${index + 1} processNode`);
    const existing = await existingTechnology(options.projectRoot, processNode);
    const canonicalTechnology = String(
      row.canonicalTechnology ?? existing?.canonicalTechnology ?? (/^\d+nm$/i.test(processNode) ? processNode : processNode),
    ).trim();
    const isNamedPdk = typeof row.isNamedPdk === "boolean"
      ? row.isNamedPdk
      : typeof existing?.isNamedPdk === "boolean"
        ? existing.isNamedPdk
        : !/^\d+nm$/i.test(processNode);
    const uid = technologyUid(processNode, canonicalTechnology, isNamedPdk);
    if (existing && existing.uid !== uid) {
      throw new UploadError(`row ${index + 1}: technology metadata conflicts with existing ${processNode}`);
    }
    const bitWidth = Number(row.bitWidth);
    if (!Number.isInteger(bitWidth) || bitWidth <= 0 || bitWidth > 65536) {
      throw new UploadError(`row ${index + 1} bitWidth must be a positive integer`);
    }
    normalized.push({
      ...row,
      architecture: safeSegment(row.architecture, `row ${index + 1} architecture`),
      category: safeSegment(row.category ?? row.designFamily ?? "uploaded", `row ${index + 1} category`),
      bitWidth,
      processNode,
      canonicalTechnology,
      isNamedPdk,
      fmaxMhz: finitePositive(row.fmaxMhz, `row ${index + 1} fmaxMhz`),
      powerMw: finitePositive(row.powerMw, `row ${index + 1} powerMw`),
      areaUm2: finitePositive(row.areaUm2, `row ${index + 1} areaUm2`),
      technologyUid: uid,
    });
  }
  await report(36, "validated", `Recognized ${normalized.length} Digital design point${normalized.length === 1 ? "" : "s"}; all required PPA fields are valid.`);

  const targetKeys = new Set<string>();
  const planned: Array<{ row: typeof normalized[number]; target: string; resource: string; newResource: boolean }> = [];
  for (const row of normalized) {
    const resource = path.join(options.projectRoot, "data/digital-technologies", row.technologyUid);
    const target = path.join(resource, "results", row.category, row.architecture, `w${row.bitWidth}`, "result.json");
    if (targetKeys.has(target)) throw new UploadError(`duplicate Digital point in upload: ${row.processNode}/${row.category}/${row.architecture}/w${row.bitWidth}`);
    targetKeys.add(target);
    if (fs.existsSync(target)) throw new UploadError(`Digital point already exists: ${row.processNode}/${row.category}/${row.architecture}/w${row.bitWidth}`, 409, "DATA_CONFLICT");
    planned.push({ row, target, resource, newResource: !fs.existsSync(resource) });
  }

  const createdFiles: string[] = [];
  const createdResources = new Set<string>();
  const generatedPath = path.join(options.projectRoot, "src/data/generatedDesignRows.ts");
  const generatedBefore = await fsp.readFile(generatedPath);
  try {
    await report(55, "persisting", "Writing normalized points into the content-addressed technology store.");
    for (const item of planned) {
      if (item.newResource && !createdResources.has(item.resource)) {
        await fsp.mkdir(item.resource, { recursive: true });
        createdResources.add(item.resource);
        const manifest = {
          schemaVersion: 1,
          uid: item.row.technologyUid,
          processNode: item.row.processNode,
          displayName: String(item.row.displayName ?? item.row.processNode),
          canonicalTechnology: item.row.canonicalTechnology,
          isNamedPdk: item.row.isNamedPdk,
          pdk: item.row.pdk == null ? undefined : String(item.row.pdk),
          standardCellLibrary: item.row.standardCellLibrary == null ? undefined : String(item.row.standardCellLibrary),
          corner: item.row.corner == null ? undefined : String(item.row.corner),
          origin: "user-upload",
        };
        await fsp.writeFile(path.join(item.resource, "technology.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
      }
      await fsp.mkdir(path.dirname(item.target), { recursive: true });
      const result = {
        ...item.row,
        flow: { ...asObject(item.row.flow), technologyUid: item.row.technologyUid, origin: "user-upload" },
        upload: { schemaVersion: "eda-upload.v1", uploadId },
      };
      delete result.technologyUid;
      await fsp.writeFile(item.target, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
      createdFiles.push(item.target);
    }
    await report(74, "indexing", "Regenerating the Digital frontend dataset and selectors.");
    await execFileAsync("node", [path.join(options.projectRoot, "scripts/generate-design-data.mjs")], {
      cwd: options.projectRoot,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    await fsp.writeFile(generatedPath, generatedBefore);
    await Promise.all(createdFiles.map((file) => fsp.rm(file, { force: true })));
    await Promise.all([...createdResources].map((directory) => fsp.rm(directory, { recursive: true, force: true })));
    throw new UploadError(`Digital data could not be published: ${error instanceof Error ? error.message : String(error)}`, 422, "PUBLISH_FAILED");
  }

  await fsp.mkdir(uploadRoot, { recursive: true });
  await writeFiles(path.join(uploadRoot, "source"), files);
  await fsp.writeFile(path.join(uploadRoot, "receipt.json"), `${JSON.stringify({
    schemaVersion: "eda-upload-receipt.v1", uploadId, dataset: "digital", createdAt: new Date().toISOString(),
    rows: normalized.map((row) => ({ processNode: row.processNode, category: row.category, architecture: row.architecture, bitWidth: row.bitWidth, technologyUid: row.technologyUid })),
  }, null, 2)}\n`);
  await report(92, "published", "Digital data is indexed and ready for filtering and chart comparison.");
  return {
    publishedIds: [...new Set(normalized.map((row) => row.technologyUid))],
    recordCount: normalized.length,
    refreshMode: "reload",
    recognition: digitalRecognition(normalized, files),
  };
}

function locatePpaCandidate(root: string): { flow: PpaIdentity["flow"]; runRoot: string; primary: string } {
  const files: string[] = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    if (!current) break;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile()) files.push(candidate);
    }
  }
  const normalized = files.find((file) => path.basename(file) === "normalized-metrics.json");
  if (normalized) return { flow: "openroad", runRoot: path.dirname(normalized), primary: normalized };
  const openlane = files.find((file) => path.basename(file) === "metrics.csv" && path.basename(path.dirname(file)) === "reports");
  if (openlane) return { flow: "openlane", runRoot: path.dirname(path.dirname(openlane)), primary: openlane };
  const librelane = files.find((file) => path.basename(file) === "metrics.json" && path.basename(path.dirname(file)) === "final");
  if (librelane) return { flow: "librelane", runRoot: path.dirname(path.dirname(librelane)), primary: librelane };
  const openroad = files.find((file) => path.basename(file) === "metrics.json");
  if (openroad) return { flow: "openroad", runRoot: path.dirname(openroad), primary: openroad };
  const state = files.find((file) => path.basename(file) === "state_out.json");
  if (state) return { flow: "librelane", runRoot: root, primary: state };
  throw new UploadError("PPA upload has no normalized-metrics.json, OpenROAD metrics.json, OpenLane reports/metrics.csv, LibreLane final/metrics.json, or state_out.json");
}

function inferPpaIdentity(sourceRoot: string, candidate: ReturnType<typeof locatePpaCandidate>): PpaIdentity {
  const manifestFile = path.join(candidate.runRoot, "manifest.json");
  if (fs.existsSync(path.join(candidate.runRoot, "normalized-metrics.json")) && fs.existsSync(manifestFile)) {
    const manifest = asObject(JSON.parse(fs.readFileSync(manifestFile, "utf8")));
    const concrete = asObject(asObject(manifest.scenario).concrete);
    const technology = asObject(concrete.technology);
    const design = asObject(concrete.design);
    const aliases: Record<string, PpaIdentity["flow"]> = {
      openroad: "openroad", "openroad-flow-scripts": "openroad", openlane: "openlane", librelane: "librelane",
    };
    const flow = aliases[String(manifest.flow)] ?? candidate.flow;
    return {
      flow,
      pdk: safeSegment(technology.pdk, "PPA manifest technology.pdk"),
      scl: technology.standard_cell_library == null ? null : safeSegment(technology.standard_cell_library, "PPA manifest standard cell library"),
      design: safeSegment(design.name, "PPA manifest design.name"),
      runName: safeSegment(manifest.run_id ?? path.basename(candidate.runRoot), "PPA manifest run_id"),
      runRelativeDir: path.relative(sourceRoot, candidate.runRoot).split(path.sep).join("/") || ".",
    };
  }
  const explicit = [path.join(sourceRoot, "upload-manifest.json"), path.join(candidate.runRoot, "upload-manifest.json")]
    .find((file) => fs.existsSync(file));
  if (explicit) {
    const manifest = asObject(JSON.parse(fs.readFileSync(explicit, "utf8")));
    const flow = String(manifest.flow);
    if (!["openroad", "openlane", "librelane"].includes(flow)) throw new UploadError("upload-manifest.json flow is invalid");
    return {
      flow: flow as PpaIdentity["flow"],
      pdk: safeSegment(manifest.pdk, "upload-manifest.json pdk"),
      scl: manifest.scl == null ? null : safeSegment(manifest.scl, "upload-manifest.json scl"),
      design: safeSegment(manifest.design, "upload-manifest.json design"),
      runName: safeSegment(manifest.runName ?? path.basename(candidate.runRoot), "upload-manifest.json runName"),
      runRelativeDir: path.relative(sourceRoot, candidate.runRoot).split(path.sep).join("/") || ".",
    };
  }
  const relative = path.relative(sourceRoot, candidate.primary).split(path.sep).join("/");
  const parts = relative.split("/");
  const flowIndex = parts.lastIndexOf(candidate.flow);
  if (flowIndex >= 0) {
    if (candidate.flow === "openlane" && parts.length >= flowIndex + 5) {
      return { flow: candidate.flow, pdk: safeSegment(parts[flowIndex + 1], "PPA path pdk"), scl: null, design: safeSegment(parts[flowIndex + 2], "PPA path design"), runName: safeSegment(parts[flowIndex + 3], "PPA path run"), runRelativeDir: parts.slice(0, flowIndex + 4).join("/") };
    }
    if (parts.length >= flowIndex + 6) {
      return { flow: candidate.flow, pdk: safeSegment(parts[flowIndex + 1], "PPA path pdk"), scl: safeSegment(parts[flowIndex + 2], "PPA path scl"), design: safeSegment(parts[flowIndex + 3], "PPA path design"), runName: safeSegment(parts[flowIndex + 4], "PPA path run"), runRelativeDir: parts.slice(0, flowIndex + 5).join("/") };
    }
  }
  throw new UploadError("native PPA files need their existing flow/pdk/[scl]/design/run folder hierarchy or an upload-manifest.json");
}

async function processPpa(
  options: UploadServiceOptions,
  uploadId: string,
  files: DecodedUploadFile[],
  report: UploadProgressReporter,
): Promise<UploadProcessResult> {
  await report(12, "staging", "Preserving the uploaded run hierarchy for native report discovery.");
  const uploadRoot = path.join(options.projectRoot, "data/uploads/ppa", uploadId);
  if (fs.existsSync(uploadRoot)) {
    const receipt = asObject(JSON.parse(await fsp.readFile(path.join(uploadRoot, "receipt.json"), "utf8")));
    const identity = {
      flow: String(receipt.flow) as PpaIdentity["flow"],
      pdk: String(receipt.pdk),
      scl: receipt.scl == null ? null : String(receipt.scl),
      design: String(receipt.design),
      runName: String(receipt.runName),
      runRelativeDir: String(receipt.runRelativeDir),
    };
    await report(88, "publishing", "This PPA bundle is already parsed; reusing its published report UID.");
    return {
      publishedIds: Array.isArray(receipt.publishedIds) ? receipt.publishedIds.map(String) : [],
      recordCount: Number(receipt.recordCount ?? 1),
      refreshMode: "index",
      recognition: ppaRecognition(identity, files),
    };
  }
  const stage = path.join(options.projectRoot, "data/uploads/ppa", `.stage-${randomUUID()}`);
  const sourceRoot = path.join(stage, "source");
  await fsp.mkdir(sourceRoot, { recursive: true });
  try {
    await writeFiles(sourceRoot, files);
    const candidate = locatePpaCandidate(sourceRoot);
    const identity = inferPpaIdentity(sourceRoot, candidate);
    const flowName = identity.flow === "openroad" ? "OpenROAD" : identity.flow === "openlane" ? "OpenLane" : "LibreLane";
    await report(30, "recognized", `Recognized ${flowName}: ${identity.design} · ${identity.pdk}${identity.scl ? ` · ${identity.scl}` : ""}.`);
    if (identity.flow !== candidate.flow && !fs.existsSync(path.join(candidate.runRoot, "normalized-metrics.json"))) {
      throw new UploadError(`PPA file signature indicates ${candidate.flow}, but metadata declares ${identity.flow}`);
    }
    await report(48, "parsing", `Running the shared ${flowName} final-report parser.`);
    const execution = await execFileAsync("python3", [options.parserPath, "run", candidate.runRoot, "--flow", identity.flow, "--include-all"], {
      cwd: options.projectRoot,
      maxBuffer: 128 * 1024 * 1024,
    });
    const parsed = asObject(JSON.parse(execution.stdout));
    const interpretation = asObject(parsed.interpretation);
    const design = asObject(interpretation.design);
    const power = asObject(interpretation.power_mw);
    const timing = asObject(interpretation.timing_aggregate);
    if (!Number.isFinite(Number(design.die_area_um2)) || !Number.isFinite(Number(power.total)) || (!Number.isFinite(Number(timing.fmax_hz)) && !Number.isFinite(Number(timing.reference_setup_slack_ns)))) {
      throw new UploadError("PPA parser did not find complete performance, power, and area fields", 422, "PPA_INCOMPLETE");
    }
    await report(66, "validated", "Performance, power, area, and timing evidence passed the normalized PPA contract.");
    const receipt = {
      schemaVersion: "eda-upload-receipt.v1",
      uploadId,
      dataset: "ppa",
      createdAt: new Date().toISOString(),
      ...identity,
      primaryRelativePath: path.relative(sourceRoot, candidate.primary).split(path.sep).join("/"),
      parserSchema: interpretation.schema,
      recordCount: Array.isArray(interpretation.normalized_metric_provenance)
        ? interpretation.normalized_metric_provenance.length
        : Number(interpretation.metric_count ?? 1),
      publishedIds: [],
    };
    await fsp.writeFile(path.join(stage, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    await fsp.rename(stage, uploadRoot);
    try {
      await report(78, "indexing", "Regenerating the content-addressed PPA report index.");
      await execFileAsync("node", [path.join(options.projectRoot, "scripts/generate-ppa-data.mjs")], {
        cwd: options.projectRoot,
        maxBuffer: 32 * 1024 * 1024,
      });
      const index = asObject(JSON.parse(await fsp.readFile(path.join(options.projectRoot, "data/ppa-analysis/available-runs.json"), "utf8")));
      const publicPrefix = `uploads/ppa/${uploadId}/source/`;
      const ids = (Array.isArray(index.runs) ? index.runs : [])
        .map(asObject)
        .filter((run) => String(run.relativePath ?? "").startsWith(publicPrefix))
        .map((run) => String(run.uid));
      receipt.publishedIds = ids;
      await fsp.writeFile(path.join(uploadRoot, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
      await report(94, "published", "The normalized report is ready in PPA selectors, summaries, tables, and plots.");
      return {
        publishedIds: ids,
        recordCount: Number(receipt.recordCount),
        refreshMode: "index",
        recognition: ppaRecognition(identity, files),
      };
    } catch (error) {
      await fsp.rm(uploadRoot, { recursive: true, force: true });
      await execFileAsync("node", [path.join(options.projectRoot, "scripts/generate-ppa-data.mjs")], { cwd: options.projectRoot });
      throw error;
    }
  } catch (error) {
    await fsp.rm(stage, { recursive: true, force: true });
    if (error instanceof UploadError) throw error;
    throw new UploadError(`PPA data could not be published: ${error instanceof Error ? error.message : String(error)}`, 422, "PUBLISH_FAILED");
  }
}

async function processBenchmark(
  options: UploadServiceOptions,
  uploadId: string,
  files: DecodedUploadFile[],
  report: UploadProgressReporter,
): Promise<UploadProcessResult> {
  await report(12, "staging", "Preserving the model bundle, simulator reports, data, plots, and netlists.");
  const uploadReceiptRoot = path.join(options.projectRoot, "data/uploads/benchmark", uploadId);
  if (fs.existsSync(uploadReceiptRoot)) {
    const receipt = asObject(JSON.parse(await fsp.readFile(path.join(uploadReceiptRoot, "receipt.json"), "utf8")));
    const simulators = (Array.isArray(receipt.simulators) ? receipt.simulators.map(String) : [])
      .filter((value): value is "ngspice" | "hspice" | "spectre" => ["ngspice", "hspice", "spectre"].includes(value));
    await report(88, "publishing", "This benchmark bundle is already present; reusing its model and simulator records.");
    return {
      publishedIds: Array.isArray(receipt.publishedIds) ? receipt.publishedIds.map(String) : [],
      recordCount: Number(receipt.recordCount ?? 1),
      refreshMode: "index",
      recognition: benchmarkRecognition(String(receipt.modelId ?? receipt.md5 ?? "Benchmark model"), String(receipt.md5 ?? uploadId), simulators, files),
    };
  }
  const stage = path.join(options.projectRoot, "data/uploads/benchmark", `.stage-${randomUUID()}`);
  const sourceRoot = path.join(stage, "source");
  const createdDestinations: string[] = [];
  await fsp.mkdir(sourceRoot, { recursive: true });
  try {
    await writeFiles(sourceRoot, files);
    const manifests: string[] = [];
    const pending = [sourceRoot];
    while (pending.length) {
      const current = pending.pop();
      if (!current) break;
      for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
        const candidate = path.join(current, entry.name);
        if (entry.isDirectory()) pending.push(candidate);
        else if (entry.isFile() && entry.name === "model-manifest.json") manifests.push(candidate);
      }
    }
    if (manifests.length !== 1) throw new UploadError("Benchmark upload must contain exactly one model-manifest.json");
    const modelRoot = path.dirname(manifests[0]);
    const modelManifest = asObject(JSON.parse(await fsp.readFile(manifests[0], "utf8")));
    const md5 = safeSegment(modelManifest.md5, "Benchmark model manifest md5");
    if (!/^[a-f0-9]{32}$/.test(md5)) throw new UploadError("Benchmark model manifest md5 must be 32 lowercase hexadecimal characters");
    const modelFile = path.join(modelRoot, String(modelManifest.modelFile ?? "model.lib"));
    if (!fs.existsSync(modelFile) || !fs.statSync(modelFile).isFile()) {
      throw new UploadError("Benchmark model file declared by model-manifest.json is missing");
    }
    const actualMd5 = createHash("md5").update(await fsp.readFile(modelFile)).digest("hex");
    if (actualMd5 !== md5) throw new UploadError(`Benchmark model MD5 mismatch: manifest ${md5}, content ${actualMd5}`);
    const simulators = (["ngspice", "hspice", "spectre"] as const).filter((simulator) => fs.existsSync(path.join(modelRoot, simulator, "manifest.json")));
    if (simulators.length === 0) throw new UploadError("Benchmark upload contains no ngspice, hspice, or spectre run");
    await report(30, "recognized", `Recognized model ${String(modelManifest.id ?? md5)} with ${simulators.join(", ")} output.`);
    for (const simulator of simulators) {
      await report(38 + Math.round((simulators.indexOf(simulator) / simulators.length) * 24), "validating", `Checking ${simulator} completion, native netlists, report, data, plots, and provenance.`);
      const manifest = asObject(JSON.parse(await fsp.readFile(path.join(modelRoot, simulator, "manifest.json"), "utf8")));
      if (!(await options.validateBenchmarkRun(path.join(modelRoot, simulator), simulator, manifest))) {
        throw new UploadError(`${simulator}: run does not satisfy the current completed-run artifact contract`, 422, "BENCHMARK_INCOMPLETE");
      }
    }
    await report(66, "validated", "Every simulator run satisfies the current displayable Benchmark artifact contract.");
    const destination = path.join(options.projectRoot, "data/spice-model-benchmark", md5);
    const newModel = !fs.existsSync(destination);
    if (newModel) {
      await fsp.cp(modelRoot, destination, { recursive: true, errorOnExist: true, force: false });
      createdDestinations.push(destination);
    } else {
      const existingManifest = asObject(JSON.parse(await fsp.readFile(path.join(destination, "model-manifest.json"), "utf8")));
      if (existingManifest.id !== modelManifest.id || existingManifest.md5 !== md5) {
        throw new UploadError(`Benchmark MD5 ${md5} conflicts with an existing model`, 409, "DATA_CONFLICT");
      }
      for (const simulator of simulators) {
        const target = path.join(destination, simulator);
        if (fs.existsSync(target)) {
          const [uploadedDigest, existingDigest] = await Promise.all([
            directoryDigest(path.join(modelRoot, simulator)),
            directoryDigest(target),
          ]);
          if (uploadedDigest === existingDigest) continue;
          throw new UploadError(`Benchmark run already exists with different content: ${md5}/${simulator}`, 409, "DATA_CONFLICT");
        }
        await fsp.cp(path.join(modelRoot, simulator), target, { recursive: true, errorOnExist: true, force: false });
        createdDestinations.push(target);
      }
    }
    const publishedIds = simulators.map((simulator) => `${md5}|${simulator}`);
    await report(78, "persisting", "Publishing the content-addressed model and simulator directories.");
    await fsp.rename(stage, uploadReceiptRoot);
    await fsp.writeFile(path.join(uploadReceiptRoot, "receipt.json"), `${JSON.stringify({
      schemaVersion: "eda-upload-receipt.v1", uploadId, dataset: "benchmark", createdAt: new Date().toISOString(), md5,
      modelId: String(modelManifest.id ?? md5), simulators, publishedIds, recordCount: simulators.length,
    }, null, 2)}\n`);
    await report(92, "indexing", "Invalidating the completed-run index so Benchmark can display the result immediately.");
    options.invalidateBenchmarkIndex();
    return {
      publishedIds,
      recordCount: simulators.length,
      refreshMode: "index",
      recognition: benchmarkRecognition(String(modelManifest.id ?? md5), md5, simulators, files),
    };
  } catch (error) {
    await fsp.rm(stage, { recursive: true, force: true });
    await Promise.all(createdDestinations.map((destination) => fsp.rm(destination, { recursive: true, force: true })));
    if (error instanceof UploadError) throw error;
    throw new UploadError(`Benchmark data could not be published: ${error instanceof Error ? error.message : String(error)}`, 422, "PUBLISH_FAILED");
  }
}

async function processUpload(
  options: UploadServiceOptions,
  payload: ReturnType<typeof decodePayload>,
  report: UploadProgressReporter = () => undefined,
) {
  const uploadId = contentUploadId(payload.dataset, payload.files);
  const result = payload.dataset === "digital"
    ? await processDigital(options, uploadId, payload.files, report)
    : payload.dataset === "ppa"
      ? await processPpa(options, uploadId, payload.files, report)
      : await processBenchmark(options, uploadId, payload.files, report);
  return {
    schemaVersion: "eda-upload-response.v1",
    status: "published",
    dataset: payload.dataset,
    uploadId,
    acceptedFiles: payload.files.length,
    ...result,
  };
}

function jobFile(jobRoot: string, jobId: string): string {
  if (!/^[a-f0-9-]{36}$/.test(jobId)) throw new UploadError("invalid upload job ID", 400, "JOB_ID_INVALID");
  return path.join(jobRoot, `${jobId}.json`);
}

async function persistJob(jobRoot: string, job: UploadJobRecord): Promise<void> {
  await fsp.mkdir(jobRoot, { recursive: true });
  const target = jobFile(jobRoot, job.jobId);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify(job, null, 2)}\n`, { flag: "wx" });
  await fsp.rename(temporary, target);
}

async function readJob(jobRoot: string, jobId: string): Promise<UploadJobRecord | null> {
  try {
    return JSON.parse(await fsp.readFile(jobFile(jobRoot, jobId), "utf8")) as UploadJobRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function recoverInterruptedJobs(jobRoot: string): void {
  fs.mkdirSync(jobRoot, { recursive: true });
  for (const entry of fs.readdirSync(jobRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !/^[a-f0-9-]{36}\.json$/.test(entry.name)) continue;
    const file = path.join(jobRoot, entry.name);
    try {
      const job = JSON.parse(fs.readFileSync(file, "utf8")) as UploadJobRecord;
      if (job.status !== "queued" && job.status !== "processing") continue;
      const now = new Date().toISOString();
      job.status = "failed";
      job.stage = "interrupted";
      job.updatedAt = now;
      job.error = { code: "SERVER_RESTARTED", message: "Backend processing was interrupted by a server restart; submit the upload again." };
      job.logs.push({ at: now, level: "error", message: job.error.message });
      fs.writeFileSync(file, `${JSON.stringify(job, null, 2)}\n`, "utf8");
    } catch {
      // A malformed historical job is ignored here and remains inspectable on disk.
    }
  }
}

export function createUploadMiddleware(options: UploadServiceOptions) {
  const jobRoot = path.join(options.projectRoot, "data/upload-jobs");
  recoverInterruptedJobs(jobRoot);
  let processingQueue: Promise<void> = Promise.resolve();

  const enqueue = (job: UploadJobRecord, payload: ReturnType<typeof decodePayload>): void => {
    const run = async (): Promise<void> => {
      const update = async (
        changes: Partial<UploadJobRecord>,
        log?: Omit<UploadJobLog, "at">,
      ): Promise<void> => {
        Object.assign(job, changes, { updatedAt: new Date().toISOString() });
        if (log) job.logs.push({ at: job.updatedAt, ...log });
        await persistJob(jobRoot, job);
      };
      try {
        await update(
          { status: "processing", progress: 5, stage: "starting" },
          { level: "info", message: `Backend worker started ${DATASET_TOOL_NAMES[job.dataset]}.` },
        );
        const result = await processUpload(options, payload, async (progress, stage, message) => {
          await update(
            { status: "processing", progress: Math.max(job.progress, Math.min(99, Math.round(progress))), stage },
            { level: "info", message },
          );
        });
        await update(
          { status: "published", progress: 100, stage: "complete", result },
          { level: "success", message: "Processing completed; the uploaded data is now available to the page." },
        );
      } catch (error) {
        const uploadError = error instanceof UploadError
          ? error
          : new UploadError(error instanceof Error ? error.message : String(error), 500, "UPLOAD_INTERNAL");
        await update(
          {
            status: "failed",
            stage: "failed",
            error: { code: uploadError.code, message: uploadError.message },
          },
          { level: "error", message: `${uploadError.code}: ${uploadError.message}` },
        );
      }
    };
    processingQueue = processingQueue.then(run, run).catch(() => undefined);
  };

  return async (request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void> => {
    const pathname = request.url?.split("?", 1)[0] ?? "";
    const apiPath = pathname.startsWith("/website-trial-v1/") ? pathname.slice("/website-trial-v1".length) : pathname;
    const jobMatch = apiPath.match(/^\/api\/uploads\/jobs\/([a-f0-9-]{36})$/);
    const isJobCollection = apiPath === "/api/uploads/jobs";
    const isUploadRoot = apiPath === "/api/uploads";
    if (!isUploadRoot && !isJobCollection && !jobMatch) {
      next();
      return;
    }
    if (jobMatch && request.method === "GET") {
      const job = await readJob(jobRoot, jobMatch[1]);
      if (!job) jsonResponse(response, 404, { error: { code: "JOB_NOT_FOUND", message: "upload job was not found" } });
      else jsonResponse(response, 200, job);
      return;
    }
    if (isUploadRoot && request.method === "GET") {
      jsonResponse(response, 200, {
        schemaVersion: "eda-upload-capabilities.v1",
        datasets: Object.fromEntries(Object.entries(DATASET_EXTENSIONS).map(([dataset, extensions]) => [dataset, [...extensions].sort()])),
        maxRequestBytes: MAX_REQUEST_BYTES,
        maxFileBytes: MAX_FILE_BYTES,
        maxFiles: MAX_FILES,
      });
      return;
    }
    if ((!isUploadRoot && !isJobCollection) || request.method !== "POST") {
      response.setHeader("Allow", isUploadRoot ? "GET, POST" : jobMatch ? "GET" : "POST");
      jsonResponse(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "method is not supported for this upload endpoint" } });
      return;
    }
    const origin = request.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.host) {
          jsonResponse(response, 403, { error: { code: "ORIGIN_REJECTED", message: "cross-origin uploads are not allowed" } });
          return;
        }
      } catch {
        jsonResponse(response, 403, { error: { code: "ORIGIN_REJECTED", message: "invalid Origin header" } });
        return;
      }
    }
    const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
    if (!contentType.startsWith("application/json")) {
      jsonResponse(response, 415, { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "upload API requires application/json" } });
      return;
    }
    try {
      const payload = decodePayload(await readRequestBody(request));
      if (isUploadRoot) {
        jsonResponse(response, 201, await processUpload(options, payload));
        return;
      }
      const now = new Date().toISOString();
      const job: UploadJobRecord = {
        schemaVersion: "eda-upload-job.v1",
        jobId: randomUUID(),
        uploadId: contentUploadId(payload.dataset, payload.files),
        dataset: payload.dataset,
        tool: DATASET_TOOL_NAMES[payload.dataset],
        status: "queued",
        progress: 1,
        stage: "queued",
        createdAt: now,
        updatedAt: now,
        logs: [{ at: now, level: "info", message: `Upload accepted: ${payload.files.length} file${payload.files.length === 1 ? "" : "s"}; waiting for the backend worker.` }],
      };
      await persistJob(jobRoot, job);
      enqueue(job, payload);
      jsonResponse(response, 202, job);
    } catch (error) {
      const uploadError = error instanceof UploadError
        ? error
        : new UploadError(error instanceof Error ? error.message : String(error), 500, "UPLOAD_INTERNAL");
      jsonResponse(response, uploadError.status, {
        error: { code: uploadError.code, message: uploadError.message, detail: uploadError.detail },
      });
    }
  };
}
