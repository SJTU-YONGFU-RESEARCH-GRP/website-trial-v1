import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { AcgError, regular, writeJson } from "./types.ts";
import type { inspectNative } from "./parser.ts";

type Native = Awaited<ReturnType<typeof inspectNative>>;
export interface ResearchCandidate {
  status: "PASS"|"FAIL"|"TOOL_ERROR"|"NOT_CHECKED";
  gdsPath: string; gdsSha256: string; nativeLedgerPath: string; nativeLedgerSha256: string;
  manifestPath: string; manifestSha256: string; ledgerPath: string; ledgerSha256: string;
  summaryPath: string|null; logPath: string; evidenceHash: string|null;
  evidencePaths: string[]; evidenceSha256: Record<string,string>; combinedHardGatePass: boolean;
}
export interface ResearchReport {
  schemaVersion: "acg.research-lvs1.v1"; scope: string; foundryCertification: false; processCompleted: true;
  sourceManifestSha256: string; configSha256: string; overallStatus: string;
  cells: Array<{cellName:string;status:string;candidates:ResearchCandidate[];evidencePaths:string[]}>;
}
const summaryRelative = "output/research-lvs1/summary.json";
const checks = new Set(["PASS","FAIL","TOOL_ERROR","NOT_CHECKED"]);
const aggregate = (statuses:string[]) => ["TOOL_ERROR","FAIL","NOT_CHECKED"].find(x=>statuses.includes(x)) ?? (statuses.length ? "PASS" : "NOT_CHECKED");
async function sha(root:string, relative:string) { return createHash("sha256").update(await fs.readFile(await regular(root,relative))).digest("hex"); }
function invalid(message:string):never { throw new AcgError("ACG_LVS1_EVIDENCE_INVALID",message,"tool_exit"); }

export async function readResearchReport(root:string):Promise<ResearchReport> {
  const report=JSON.parse(await fs.readFile(await regular(root,summaryRelative),"utf8")) as ResearchReport;
  const native=JSON.parse(await fs.readFile(await regular(root,"output/acg-native.json"),"utf8")) as Native;
  if(report.schemaVersion!=="acg.research-lvs1.v1" || report.scope!=="gf180-research-connectivity" || report.foundryCertification!==false || report.processCompleted!==true || native.engine!=="mr" || native.mode!=="routed" || !Array.isArray(report.cells) || report.cells.length!==native.cells.length) invalid("Completed MR research LVS1 report required");
  if(await sha(root,"output/acg-native.json")!==report.sourceManifestSha256 || await sha(root,"work/config.json")!==report.configSha256) invalid("Research report source manifest/config checksum changed");
  for(let cellIndex=0;cellIndex<native.cells.length;cellIndex++) {
    const cell=native.cells[cellIndex]!; const result=report.cells[cellIndex]!;
    if(result.cellName!==cell.cellName || !Array.isArray(result.candidates) || result.candidates.length!==cell.routedCandidates.length) invalid("Research candidates do not match inspected native cell");
    for(let index=0;index<cell.routedCandidates.length;index++) {
      const original=cell.routedCandidates[index]!; const item=result.candidates[index]!;
      const prefix="output/research-lvs1/cell-"+String(cellIndex).padStart(4,"0")+"-candidate-"+String(index).padStart(4,"0")+"/";
      if(!checks.has(item.status) || item.gdsPath!==original.gdsPath || item.nativeLedgerPath!==original.verificationPath || item.gdsSha256!==original.gdsSha256 || item.nativeLedgerSha256!==original.verificationSha256 || item.manifestSha256!==original.lvs1ManifestSha256 || item.manifestPath!==original.gdsPath.replace(/\.gds$/,".lvs1_manifest.json") || item.ledgerPath!==prefix+"verification.json" || item.logPath!==prefix+"driver.log") invalid("Research source/candidate binding is invalid");
      for(const [relative,expected] of [[item.gdsPath,item.gdsSha256],[item.nativeLedgerPath,item.nativeLedgerSha256],[item.manifestPath,item.manifestSha256],[item.ledgerPath,item.ledgerSha256]]) if(!relative || !expected || await sha(root,relative)!==expected) invalid("Research source or merged ledger checksum changed");
      if(!Array.isArray(item.evidencePaths) || !item.evidenceSha256 || item.evidencePaths.some(p=>!p.startsWith(prefix)) || new Set(item.evidencePaths).size!==item.evidencePaths.length || Object.keys(item.evidenceSha256).length!==item.evidencePaths.length) invalid("Research evidence paths are invalid");
      for(const relative of item.evidencePaths) if(await sha(root,relative)!==item.evidenceSha256[relative]) invalid("Research extracted evidence checksum changed");
      if(!item.evidencePaths.includes(item.ledgerPath) || !item.evidencePaths.includes(item.logPath) || item.summaryPath && (item.summaryPath!==prefix+"lvs1_summary.json" || !item.evidencePaths.includes(item.summaryPath))) invalid("Research required evidence is missing");
      const ledger=JSON.parse(await fs.readFile(await regular(root,item.ledgerPath),"utf8"));
      const check=ledger.layers?.flatMap((layer:{checks?:Array<{name:string;status:string}>})=>layer.checks ?? []).find((x:{name:string})=>x.name==="LVS1_EXTRACTED_CONNECTIVITY");
      if(ledger.schema_version!==2 || ledger.cell_name!==cell.cellName || (ledger.hard_gate_pass===true)!==item.combinedHardGatePass || item.status!=="TOOL_ERROR" && check?.status!==item.status) invalid("Research ledger disagrees with candidate result");
      if(item.summaryPath) {
        const summary=JSON.parse(await fs.readFile(await regular(root,item.summaryPath),"utf8"));
        if(item.status!=="TOOL_ERROR" && (summary.status!==item.status || summary.pass!==(item.status==="PASS") || summary.evidence_hash!==item.evidenceHash)) invalid("Research summary disagrees with candidate result");
      } else if(item.status!=="TOOL_ERROR") invalid("Research native summary is missing");
    }
    if(result.status!==aggregate(result.candidates.map(x=>x.status)) || !Array.isArray(result.evidencePaths) || JSON.stringify(result.evidencePaths)!==JSON.stringify(result.candidates.flatMap(x=>x.evidencePaths))) invalid("Research cell aggregate is inconsistent");
  }
  if(report.overallStatus!==aggregate(report.cells.map(x=>x.status))) invalid("Research aggregate is inconsistent");
  return report;
}

export async function prepareResearchPvManifest(root:string, report:ResearchReport) {
  const native=JSON.parse(await fs.readFile(await regular(root,"output/acg-native.json"),"utf8")) as Native;
  for(let cellIndex=0;cellIndex<native.cells.length;cellIndex++) for(let index=0;index<native.cells[cellIndex]!.routedCandidates.length;index++) {
    const candidate=native.cells[cellIndex]!.routedCandidates[index]!;
    const researched=report.cells[cellIndex]!.candidates[index]!;
    candidate.verificationPath=researched.ledgerPath;
    candidate.verificationSha256=researched.ledgerSha256;
  }
  await writeJson(path.join(root,"output/acg-pv-native.json"),native);
}

export function mergeResearchReport(native:Native, report:ResearchReport) {
  for(const cell of native.cells) {
    const result=report.cells.find(x=>x.cellName===cell.cellName)!;
    cell.verification.lvs1={
      status:result.status==="PASS" ? "passed" : result.status==="FAIL" ? "failed" : result.status==="NOT_CHECKED" ? "not_run" : "unknown",
      evidencePaths:[summaryRelative,...result.evidencePaths],
      details:{status:result.status,scope:report.scope,foundryCertification:false,candidates:result.candidates},
    };
    if(result.candidates.length) cell.verification.hardGatePass=result.candidates.every(x=>x.combinedHardGatePass);
    for(const relativePath of [summaryRelative,...result.evidencePaths]) if(!cell.artifacts.some(x=>x.relativePath===relativePath)) cell.artifacts.push({role:"acg-verification",relativePath,cellName:cell.cellName});
  }
}
