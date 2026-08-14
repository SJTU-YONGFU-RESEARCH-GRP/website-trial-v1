import fs from "node:fs/promises";
import type { JsonObject, ParsedModuleResultV1 } from "../../../shared/contracts/v1.ts";
import { objectValue } from "./helpers.ts";
import { PPA_PARSER_ID, PPA_PARSER_VERSION, PPA_RESULT_DATA_VERSION, type PpaFlowId, type PpaParsedData } from "./types.ts";

export async function parseParserOutput(filename: string): Promise<ParsedModuleResultV1> {
  const raw = (await fs.readFile(filename, "utf8")).trim();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("result_json_ast.py did not emit one valid JSON document"); }
  const source = objectValue(value); const normalized = objectValue(source.normalized ?? source.interpretation ?? source.result ?? source.metrics ?? source);
  if (!Object.keys(normalized).length) throw new Error("result_json_ast.py output has no normalized metrics");
  const parserFlow = String(source.flow ?? objectValue(source.source_bundle).flow ?? normalized.flow ?? "").toLowerCase();
  const flowMap: Record<string, PpaFlowId> = { openroad: "openroad-orfs", openlane: "openlane1", librelane: "librelane" };
  const flow = flowMap[parserFlow]; if (!flow) throw new Error("result_json_ast.py output has an unsupported flow");
  const design = String(source.design ?? normalized.design ?? normalized.design_name ?? "PPA run");
  const data: PpaParsedData = { schemaVersion: PPA_RESULT_DATA_VERSION, flow, parserFlow: parserFlow as PpaParsedData["parserFlow"], normalized: normalized as JsonObject, evidence: source as JsonObject };
  return { title: `${design} · ${flow}`, summary: normalized as JsonObject, data, artifactRoles: ["normalized-result", "native-run", "parser-log"], parserId: PPA_PARSER_ID, parserVersion: PPA_PARSER_VERSION };
}

export function validatePpaParsedResult(result: unknown): asserts result is ParsedModuleResultV1 {
  const value = objectValue(result); if (typeof value.title !== "string" || !value.title.trim()) throw new Error("PPA result title is missing");
  const data = objectValue(value.data); if (data.schemaVersion !== PPA_RESULT_DATA_VERSION) throw new Error("PPA result data schema is invalid");
  if (!["openroad-orfs", "openlane1", "librelane"].includes(String(data.flow))) throw new Error("PPA result flow is invalid");
  if (!Object.keys(objectValue(data.normalized)).length) throw new Error("PPA normalized result is empty");
  if (value.parserId !== PPA_PARSER_ID || typeof value.parserVersion !== "string") throw new Error("PPA parser provenance is invalid");
}
