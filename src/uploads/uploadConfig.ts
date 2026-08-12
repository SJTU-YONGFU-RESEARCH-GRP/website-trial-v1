import type { UploadDataset } from "./uploadClient";

export interface UploadDatasetConfig {
  title: string;
  tool: string;
  accepts: string;
  guidance: string;
  folderGuidance: string;
  processing: string;
}

export const UPLOAD_DATASET_CONFIG: Record<UploadDataset, UploadDatasetConfig> = {
  benchmark: {
    title: "Upload Benchmark data",
    tool: "SPICE Model Benchmark · ngspice / HSPICE / Spectre",
    accepts: ".json,.csv,.md,.txt,.lib,.model,.sp,.cir,.scs,.png",
    guidance: "Upload one complete model result bundle with its manifest, model, native simulator reports, netlists, data, plots, and provenance.",
    folderGuidance: "Choose the model result folder so relative artifact paths are retained.",
    processing: "Checks model MD5, native execution evidence, all four netlists, reports, plotted data, and provenance before updating the completed-run index.",
  },
  digital: {
    title: "Upload Digital data",
    tool: "Digital PPA Dataset · Architecture comparison",
    accepts: ".json,.csv",
    guidance: "JSON may contain one row, an array, or { rows: [...] }. CSV uses the same headers. Required: architecture, bitWidth, processNode, fmaxMhz, powerMw, and areaUm2.",
    folderGuidance: "Choose individual JSON/CSV files; a folder is also accepted.",
    processing: "Validates each PPA point, joins or creates its technology UID, writes the canonical data record, and regenerates Digital selectors and charts.",
  },
  ppa: {
    title: "Upload PPA data",
    tool: "RTL-to-GDS PPA · OpenROAD / OpenLane / LibreLane",
    accepts: ".json,.csv,.def,.rpt,.log,.txt,.tcl,.spef,.v,.sdc,.lef,.gds,.odb,.gz,.xml,.yaml,.yml",
    guidance: "Upload a complete OpenROAD, OpenLane, LibreLane, or normalized run folder while preserving flow/pdk/[scl]/design/run hierarchy.",
    folderGuidance: "Choose the run folder so final DEF, endpoint timing, and native evidence can be parsed together.",
    processing: "Identifies the backend flow, runs the shared final-report parser, checks performance/power/area/timing, and regenerates the normalized PPA index.",
  },
};
