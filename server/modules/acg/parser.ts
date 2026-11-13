import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { object, safePath, type Parameters } from "./types.ts";
export async function listOutputs(root: string, relative = "output", maxFiles=4000): Promise<string[]> {
  const result: string[] = [];
  const realRoot = await fs.realpath(root);
  const visit = async (directory: string) => {
    const target = safePath(root,directory);
    const stat = await fs.lstat(target).catch(()=>null);
    if (!stat) return;
    if (stat.isSymbolicLink() || !stat.isDirectory() || !(await fs.realpath(target)).startsWith(realRoot + path.sep)) throw new Error("Unsafe output directory: " + directory);
    for (const entry of await fs.readdir(safePath(root,directory), { withFileTypes: true }).catch(() => [])) {
      if (entry.isSymbolicLink()) throw new Error("Output symlink is not publishable: " + entry.name);
      const name = directory + "/" + entry.name;
      if (entry.isDirectory()) await visit(name); else if (entry.isFile()) result.push(name);
      if (result.length > maxFiles) throw new Error("Too many ACG output artifacts");
    }
  };
  await visit(relative); return result;
}
export function artifactRole(relative: string): string {
  if (/\.gds$/i.test(relative)) return "acg-gds";
  if (/\.png$/i.test(relative)) return "acg-preview";
  if (/verification|ledger/i.test(relative) && /\.json$/i.test(relative)) return "acg-verification";
  if (relative === "output/config.json") return "acg-config";
  if (relative === "output/rules.json") return "acg-rules";
  if (["output/replay/prepared-placement.json","output/replay/source-placement.json"].includes(relative)) return "acg-placement";
  if (relative.startsWith("output/placement/") && /\.json$/.test(relative)) return "acg-placement";
  return "acg-report";
}
function status(value: unknown): string {
  const raw = String(value ?? "").toUpperCase();
  return raw === "PASS" || raw === "PASSED" ? "passed" : raw === "FAIL" || raw === "FAILED" ? "failed" : ["NOT_CHECKED","NOT_RUN","SKIP"].includes(raw) ? "not_run" : "unknown";
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {}; }
export function parseVerification(report: Record<string, unknown>, relativePath: string) {
  const checks = (Array.isArray(report.layers) ? report.layers : []).flatMap(layer => {
    const list = record(layer).checks; return Array.isArray(list) ? list.map(record) : [];
  });
  const check = (name: string) => {
    const found = checks.find(x => x.name === name);
    return { status: status(found?.status), evidencePaths: found ? [relativePath] : [], ...(found ? { details: found } : {}) };
  };
  const placement = record(record(report.milestones).PLACEMENT_VALID);
  const legacy=report.schema_version!==2 && report.phase==="PRE_ROUTE" && typeof report.pass==="boolean";
  const preRoute = { status: legacy ? report.pass ? "passed" : "failed" : status(placement.status), evidencePaths: legacy || placement.status ? [relativePath] : [] };
  return { profile: String(report.profile ?? "unknown"), preRoute,
    researchDrc: { status: report.drc ? typeof record(report.drc).pass==="boolean" ? record(report.drc).pass ? "passed" : "failed" : status(record(report.drc).status) : "unknown", evidencePaths: report.drc ? [relativePath] : [] },
    lvs0: legacy && typeof record(report.lvs).pass==="boolean" ? {status:record(report.lvs).pass ? "passed" : "failed",evidencePaths:[relativePath]} : check("LVS0_CONNECTIVITY"), lvs1: checks.some(x=>x.name==="LVS1_EXTRACTED_CONNECTIVITY") ? check("LVS1_EXTRACTED_CONNECTIVITY") : check("LVS1_CONNECTIVITY"),
    officialDrc: check("FOUNDRY_DRC"), officialLvs: check("FOUNDRY_LVS"),
    route: check("ROUTING_OUTCOME"), hardGatePass: report.hard_gate_pass === true };
}
export async function inspectNative(root: string, parameters: Parameters, cellNames: string[]) {
  const files = await listOutputs(root); const json = new Map<string, Record<string,unknown>>(); const jsonHashes = new Map<string,string>();
  for (const relative of files.filter(x => (x.endsWith(".json") || x === "output/placement") && !x.startsWith("output/previews/"))) {
    const metadata = await fs.stat(safePath(root,relative)); if (metadata.size > 16*1024*1024) continue;
    try { const bytes=await fs.readFile(safePath(root,relative)); json.set(relative, object(JSON.parse(bytes.toString("utf8")))); jsonHashes.set(relative,createHash("sha256").update(bytes).digest("hex")); } catch { /* Non-contract native JSON remains downloadable evidence. */ }
  }
  const summaryPath = "output/native/summary.txt";
  const summary = await fs.readFile(safePath(root,summaryPath),"utf8").catch(()=>"");
  const config:Record<string,unknown>=await fs.readFile(path.join(root,"work/config.json"),"utf8").then(x=>record(JSON.parse(x))).catch(()=>({}));
  const placementRows = new Map<string,number>();
  if (parameters.engine === "dr") for (const relative of files.filter(x=>x.startsWith("output/native/") && x.endsWith(".txt"))) {
    if ((await fs.stat(safePath(root,relative))).size > 16*1024*1024) continue;
    const text=await fs.readFile(safePath(root,relative),"utf8");
    const modes=[...text.matchAll(/^Layout Mode: (SINGLE ROW \(2|DOUBLE ROW \(4) transistors per column\)\r?$/gm)].map(x=>x[1]?.startsWith("DOUBLE") ? 2 : 1);
    if (modes.length && new Set(modes).size===1) placementRows.set(relative,modes[0]!);
  }
  const sections = new Map<string,string>();
  const headers = [...summary.matchAll(/Cell name[ \t]*:[ \t]*(\S+)/g)];
  for (let i=0;i<headers.length;i++) sections.set(headers[i]![1]!,summary.slice(headers[i]!.index,headers[i+1]?.index ?? summary.length));
  const validGds = new Set<string>();
  const gdsHashes = new Map<string,string>();
  const gdsCellNames=new Map<string,string>();
  for (const relative of files.filter(x=>x.endsWith(".gds"))) {
    const handle = await fs.open(safePath(root,relative),"r");
    try {
      const size=(await handle.stat()).size;
      if (size<10 || size>=128*1024*1024) continue;
      const bytes=await handle.readFile(); let offset=0; let endLibrary=false; let structure=false; let valid=true;
      const structures=new Set<string>();const references=new Set<string>();
      if (bytes.readUInt16BE(0)!==6 || bytes[2]!==0 || bytes[3]!==2) continue;
      while(offset<bytes.length) {
        if (offset+4>bytes.length) {valid=false;break;}
        const length=bytes.readUInt16BE(offset); const kind=bytes[offset+2];
        if(length<4 || length%2 || offset+length>bytes.length || endLibrary) {valid=false;break;}
        if(kind===5) structure=true;
        if ((kind===6 || kind===18) && bytes[offset+3]===6 && length>4) {
          const name=bytes.subarray(offset+4,offset+length).toString("ascii").replace(/\0+$/,"");
          if(kind===6) structures.add(name);else references.add(name);
        }
        if(kind===4) {endLibrary=true;if(length!==4) valid=false;}
        offset+=length;
      }
      if(valid && structure && endLibrary && offset===bytes.length) {
        validGds.add(relative);gdsHashes.set(relative,createHash("sha256").update(bytes).digest("hex"));
        const top=[...structures].filter(x=>!references.has(x));
        if(top.length===1 && cellNames.includes(top[0]!)) gdsCellNames.set(relative,top[0]!);
      }
    } finally { await handle.close(); }
  }
  const declaredOwners=new Map<string,Set<string>>();
  const declare=(relative:string,cell:string)=>{const owners=declaredOwners.get(relative) ?? new Set<string>();owners.add(cell);declaredOwners.set(relative,owners);};
  for (const [relative,report] of json) if (typeof report.cell_name==="string" && (report.schema_version===1 || report.schema_version===2 && Array.isArray(report.layers))) {
    declare(relative,report.cell_name);
    if (/\.verification\.json$/.test(relative) && report.schema_version===2 || /\.routing\.json$/.test(relative) && report.schema_version===1 && typeof report.status==="string" && typeof report.outcome==="string") {
      const stem=relative.replace(/\.(verification|routing)\.json$/,"");
      for (const file of files.filter(x=>x===stem+".gds" || x.startsWith(stem+"."))) declare(file,report.cell_name);
    }
  }
  for (const [relative,cell] of gdsCellNames) {
    const stem=relative.replace(/\.gds$/,"");
    for(const file of files.filter(x=>x===relative || x.startsWith(stem+"."))) declare(file,cell);
    const preview=relative.replace(/^output\/native\//,"output/previews/").replace(/\.gds$/,".png");
    if(files.includes(preview)) declare(preview,cell);
  }
  const cells = cellNames.map(cellName => {
    const belongs = (relative: string) => {
      const name = path.basename(relative);
      const declared=declaredOwners.get(relative);
      if (declared) return declared.size===1 && declared.has(cellName);
      const matches=cellNames.filter(cell => name === cell + ".json" || name.startsWith(cell + "_") || name.startsWith(cell + ".") || relative.split("/").includes(cell));
      return matches.length===1 && matches[0]===cellName;
    };
    const reports = [...json].filter(([relative,report]) => belongs(relative) && ((/verification\.json$/.test(relative) && report.layers) || (/drc_lvs_rank\d+\.json$/.test(relative) && report.phase==="PRE_ROUTE")));
    const routedCandidates: Array<{gdsPath:string; verificationPath?:string; routeStatus:string; routeEvidence?:Record<string,unknown>;gdsSha256?:string;verificationSha256?:string;lvs1ManifestSha256?:string}> = [];
    for (const [relative, report] of reports) {
      const parsed = parseVerification(report,relative);
      const stem = relative.replace(/\.verification\.json$/,"");
      const gds = files.find(x => x === stem + ".gds" && validGds.has(x) && belongs(x));
      if (gds && report.schema_version === 2 && parsed.route.status === "passed" && parsed.hardGatePass && (Array.isArray(report.layers) ? report.layers : []).flatMap(layer=>Array.isArray(record(layer).checks) ? record(layer).checks as unknown[] : []).some(check=>record(check).name==="GDS_PROJECTION" && status(record(check).status)==="passed")) routedCandidates.push({gdsPath:gds,verificationPath:relative,routeStatus:"succeeded",gdsSha256:gdsHashes.get(gds),verificationSha256:jsonHashes.get(relative),lvs1ManifestSha256:jsonHashes.get(stem+".lvs1_manifest.json")});
    }
    const section = sections.get(cellName) ?? "";
    const importedLines=parameters.engine==="dr" ? section.split(/\r?\n/).filter(line=>/^Width \d+, Solution \d+: Imported routing template NOT_CHECKED; GDS_FILE=[A-Za-z0-9_.-]+\.gds\s*$/.test(line.trim())) : [];
    const routeLines = section.split(/\r?\n/).filter(line=>/: (?:M[12] routable|Routable via auto-widen)/i.test(line));
    if (parameters.engine !== "mr") for (const line of routeLines) {
      const width = /Width (\d+)/.exec(line)?.[1]; const solution = /Solution (\d+)/.exec(line)?.[1];
      if (!width || solution === undefined) continue;
      const widened=/Width \d+ \(([A-Za-z0-9_]+) (\d+)\)/.exec(line);
      const explicit=/; GDS_FILE=([A-Za-z0-9_.-]+\.gds)(?:\s|$)/.exec(line)?.[1];
      if (line.includes("; GDS_FILE=") && (!explicit || line.split("; GDS_FILE=").length!==2)) continue;
      if (explicit) {
        const prefix=cellName+"_w"+width+"_"; const suffix=widened ? "_"+widened[1]+widened[2]+".gds" : ".gds";
        if (!explicit.startsWith(prefix) || !explicit.endsWith(suffix) || !/^\d+$/.test(explicit.slice(prefix.length,-suffix.length))) continue;
      }
      if (!explicit && parameters.engine==="cmos" && !widened && (config.seq_diverse_candidates_enable===true || config.brute_force_mode===true) && /DFF|DFFS|DFFR|SDFF|DLL|DLY|LH|LCK|LATCH/.test(cellName)) continue;
      const expected = explicit ?? cellName + "_w" + width + "_" + solution + (widened ? "_"+widened[1]+widened[2] : "") + ".gds";
      const gdsPath = files.find(x=>path.basename(x)===expected && validGds.has(x) && (!declaredOwners.has(x) || declaredOwners.get(x)?.size===1 && declaredOwners.get(x)?.has(cellName)));
      if (gdsPath) {declare(gdsPath,cellName);routedCandidates.push({gdsPath,routeStatus:"succeeded",routeEvidence:{engine:parameters.engine,path:summaryPath,sha256:createHash("sha256").update(summary).digest("hex"),cellName,matchedLine:line,gdsSha256:gdsHashes.get(gdsPath)}});}
    }
    const importedCandidates=importedLines.flatMap(line=>{
      const match=/^Width (\d+), Solution (\d+): Imported routing template NOT_CHECKED; GDS_FILE=([A-Za-z0-9_.-]+\.gds)\s*$/.exec(line.trim());
      if (!match || match[3]!==cellName+"_w"+match[1]+"_"+match[2]+".gds") return [];
      const gds=files.find(x=>path.basename(x)===match[3] && validGds.has(x));
      if (!gds || declaredOwners.has(gds) && (declaredOwners.get(gds)?.size!==1 || !declaredOwners.get(gds)?.has(cellName))) return [];
      declare(gds,cellName);return [{gdsPath:gds,status:"imported_unverified",connectivityStatus:"not_checked",evidencePaths:[summaryPath]}];
    });
    const artifacts = files.filter(belongs).map(relativePath => ({ role: relativePath==="output/placement" && json.get(relativePath)?.schema_version===1 && json.get(relativePath)?.cell_name===cellName ? "acg-placement" : artifactRole(relativePath), relativePath, cellName }));
    // Select report of a proved routed candidate, then a valid placement, then retain failures.
    const chosen = reports.find(([relative]) => routedCandidates.some(x=>x.verificationPath===relative)) ??
      reports.find(([,report])=>report.hard_gate_pass===true) ?? reports[0];
    const verification = parseVerification(chosen?.[1] ?? {}, chosen?.[0] ?? "");
    const candidates: Array<Record<string,unknown> & {relativePath:string}> = [...json].filter(([relative, report])=> belongs(relative) && (relative.startsWith("output/placement/") || relative==="output/placement") && report.schema_version===1).map(([relativePath,report])=>({relativePath,...report}));
    if (parameters.engine==="mr") for (const candidate of candidates) {
      const grid=record(candidate.grid);const rows=grid.rows;
      if (Number.isInteger(candidate.num_rows) && Number(candidate.num_rows)>=1 && Number(candidate.num_rows)<=4 && grid.row_count===candidate.num_rows && Array.isArray(rows) && rows.length===candidate.num_rows) placementRows.set(candidate.relativePath,Number(candidate.num_rows));
    }
    const rowEvidence=[...placementRows].filter(([relative])=>belongs(relative));
    const observedRows=new Set(rowEvidence.map(([,rows])=>rows));
    const geometry={actualRows:observedRows.size===1 ? rowEvidence[0]![1] : null,rowEvidencePaths:rowEvidence.map(([relative])=>relative)};
    const metrics: Record<string,unknown> = {};
    const first = candidates[0] as Record<string,unknown> | undefined;
    if (typeof first?.cell_width_cpp === "number") metrics.widthCpp = first.cell_width_cpp;
    const gds = artifacts.filter(x=>x.role==="acg-gds" && validGds.has(x.relativePath));
    const generated = /Placement-only mode: [1-9]\d* GDS candidate\(s\) generated/.test(section);
    const widthMatch = /Min #CPP = (\d+)/.exec(section);
    if (widthMatch && metrics.widthCpp===undefined) metrics.widthCpp=Number(widthMatch[1]);
    if (metrics.widthCpp!==undefined) {metrics.placementWidthCpp=metrics.widthCpp;metrics.widthSource="placement";}
    // A routed width belongs to the same candidate already proved by its ledger and GDS.
    if (parameters.engine==="mr" && parameters.mode==="routed") {
      const selected=routedCandidates.find(x=>x.verificationPath===chosen?.[0]) ?? routedCandidates[0];
      const relative=selected?.verificationPath?.replace(/\.verification\.json$/,".routing.json");
      const report=relative ? json.get(relative) : undefined;
      const width=record(report?.placement).cell_width_cpp;
      if (relative && report?.schema_version===1 && report.status==="ROUTED" && report.outcome==="ROUTED" && Number.isInteger(width) && Number(width)>0) {
        metrics.routedWidthCpp=width;metrics.widthCpp=width;metrics.widthSource="routed_candidate";metrics.widthEvidencePaths=[relative,selected!.verificationPath!];
      }
    }
    const routing = parameters.mode==="placement" ? "not_requested" : routedCandidates.length ? "succeeded" : reports.some(([,r])=>parseVerification(r,"").route.status==="failed") || /: Unroutable/.test(section) ? "failed" : "unknown";
    const placementStatus = verification.preRoute.status === "passed" || candidates.length > 0 || (generated && gds.length>0) || routedCandidates.length>0 ? "succeeded" : verification.preRoute.status === "failed" ? "failed" : "unknown";
    const complete = parameters.mode === "placement" ? placementStatus === "succeeded" && gds.length > 0 : routing === "succeeded";
    return { cellName, geometry, validGdsCount:gds.length,status: complete ? "complete" : placementStatus==="failed" || routing==="failed" ? "failed" : "partial",
      placement: {status:placementStatus,candidates,evidencePaths:section ? [summaryPath] : []}, routing:{status:routing,evidencePaths:section ? [summaryPath] : [],importedCandidates}, verification, metrics, artifacts, routedCandidates,
      diagnostics: [...(importedCandidates.length ? ["Routing template imported without connectivity verification (NOT_CHECKED); no proved routed candidate or official verification eligibility"] : []), ...(!gds.length ? ["No GDS artifact was emitted"] : []), ...(!reports.length ? ["No structured verification ledger was emitted; checks remain unknown"] : [])] };
  });
  return { schemaVersion:"acg.native.v1",engine:parameters.engine,mode:parameters.mode,cells };
}
