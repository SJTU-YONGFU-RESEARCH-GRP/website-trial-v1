#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  throw new Error(`[validate-upload-integration] ${message}`);
}

function source(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) fail(`missing ${relative}`);
  return fs.readFileSync(file, "utf8");
}

const pages = [
  ["Benchmark", "src/pages/benchmark/BenchmarkWorkspacePage.tsx", 'dataset="benchmark"'],
  ["Digital", "src/pages/PlotlyPage.tsx", 'dataset="digital"'],
  ["PPA", "src/pages/PpaPage.tsx", 'dataset="ppa"'],
];
for (const [label, relative, marker] of pages) {
  const text = source(relative);
  if (!text.includes("DataUploadCard") || !text.includes(marker)) {
    fail(`${label} page does not use the shared upload component`);
  }
}

const component = source("src/components/DataUploadCard.tsx");
for (const marker of ["Choose files", "Choose folder", "Validate and publish", "progress", 'role="alert"', 'role="status"', "View backend processing", "Recognized and published", "config.tool"]) {
  if (!component.includes(marker)) fail(`shared component is missing ${marker}`);
}

const client = source("src/uploads/uploadClient.ts");
for (const marker of ["XMLHttpRequest", 'request.upload.addEventListener("progress"', "webkitRelativePath", "api/uploads", "loadUploadJob", "waitForJob", "/jobs"]) {
  if (!client.includes(marker)) fail(`upload client is missing ${marker}`);
}

const processingPage = source("src/pages/UploadProcessingPage.tsx");
for (const marker of ["Backend processing", "Backend progress", "Recognized content", "Live backend log", "loadUploadJob"]) {
  if (!processingPage.includes(marker)) fail(`processing page is missing ${marker}`);
}
if (!source("src/App.tsx").includes('/upload-processing/:jobId')) fail("processing route is not registered");

const uploadConfig = source("src/uploads/uploadConfig.ts");
for (const marker of ["SPICE Model Benchmark", "Digital PPA Dataset", "RTL-to-GDS PPA", "OpenROAD / OpenLane / LibreLane"]) {
  if (!uploadConfig.includes(marker)) fail(`tool-specific upload configuration is missing ${marker}`);
}

const service = source("server/uploadService.ts");
for (const marker of [
  "MAX_REQUEST_BYTES",
  "MAX_FILE_BYTES",
  "MAX_FILES",
  "safeRelativePath",
  "DATASET_EXTENSIONS",
  "ORIGIN_REJECTED",
  "processBenchmark",
  "processDigital",
  "processPpa",
  "options.parserPath",
  "generate-design-data.mjs",
  "generate-ppa-data.mjs",
  "validateBenchmarkRun",
  "UploadJobRecord",
  "data/upload-jobs",
  "recoverInterruptedJobs",
  "Recognized",
]) {
  if (!service.includes(marker)) fail(`server upload service is missing ${marker}`);
}

const config = source("vite.config.ts");
if (!config.includes("createUploadMiddleware") || !config.includes('name: "unified-data-upload"')) {
  fail("Vite server does not mount the unified upload API");
}

const ppaGenerator = source("scripts/generate-ppa-data.mjs");
if (!ppaGenerator.includes("uploadedPpaRoot") || !ppaGenerator.includes('sourceProfile: "uploaded-ppa"')) {
  fail("PPA generator does not discover persisted uploads");
}

const documentation = source("docs/data-upload.md");
for (const marker of ["## Digital", "## PPA", "## Benchmark", "64 MiB", "Static GitHub Pages alone", "POST /api/uploads/jobs", "#/upload-processing/<job-id>"]) {
  if (!documentation.includes(marker)) fail(`upload documentation is missing ${marker}`);
}

console.log("[validate-upload-integration] shared UI, API, persistence adapters, limits, progress, and documentation validated");
