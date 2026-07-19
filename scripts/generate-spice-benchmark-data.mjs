#!/usr/bin/env node
/**
 * generate-spice-benchmark-data.mjs
 *
 * Discovers SPICE benchmark results, normalizes data to JSON, builds manifest.
 *
 * Source priority:
 *   1. SPICE_BENCHMARK_SOURCE env var
 *   2. external/spice_model_benchmark (CI)
 *   3. ../spice_model_benchmark (local clone)
 *
 * Fixture fallback: only when ALLOW_SPICE_FIXTURE=1 and no real results found.
 * Production builds without real results will fail.
 *
 * For each result root, recursively indexes ALL files.
 * Normalizes CSV/TXT/DAT/ngspice-raw to JSON for browser consumption.
 * Generates src/data/generatedSpiceBenchmarkManifest.ts + .json snapshot.
 */

import { readFileSync, readdirSync, statSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, relative, basename, extname, join } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(ROOT, "public/benchmark");
const OUT_FILE = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.ts");
const JSON_FILE = resolve(ROOT, "src/data/generatedSpiceBenchmarkManifest.json");

const EXCLUDE_TERMS = ["sky130", "skywater"];
const DATA_EXTS = new Set([".csv", ".txt", ".dat", ".raw", ".json"]);
const PLOT_EXTS = new Set([".png", ".svg"]);
const ALLOW_FIXTURE = process.env.ALLOW_SPICE_FIXTURE === "1";

let SOURCE_INVENTORY = { dataFiles:0, plotFiles:0, reportFiles:0, logFiles:0, netlistFiles:0, otherFiles:0, totalArtifacts:0 };
let COVERAGE = { pdks:[], modelsAvailable:[], modelsRun:[], runsCompleted:0, runsPartial:0 };
let EXCLUDED_COUNT = 0;

function isExcluded(s) { return EXCLUDE_TERMS.some(t => s.toLowerCase().includes(t)); }
function fileHash(p) { try { return createHash("md5").update(readFileSync(p)).digest("hex").slice(0,8); } catch { return "unknown"; } }
function fmtSize(b) { return b<1024?`${b} B`:`${(b/1024).toFixed(1)} KB`; }
function copyToPublic(src, runId, subdir, relPath) {
  const destDir = resolve(PUBLIC_DIR, runId, subdir);
  mkdirSync(destDir, { recursive: true });
  // Use hash to avoid basename collisions
  const h = fileHash(src);
  const ext = extname(src);
  const destName = `${basename(src, ext)}_${h}${ext}`;
  const dest = resolve(destDir, destName);
  try { copyFileSync(src, dest); return `benchmark/${runId}/${subdir}/${destName}`; }
  catch { return null; }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Robust TXT/CSV/DAT/RAW → JSON normalizer                            */
/* ═══════════════════════════════════════════════════════════════════ */

function isCommentOrMeta(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^[#*]/.test(t) || /^\/\//.test(t)) return true;
  if (/^-{3,}$/.test(t) || /^={3,}$/.test(t)) return true;
  if (/^(scale|plotname|title|date|options):/i.test(t)) return true;
  return false;
}

function detectDelim(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => !isCommentOrMeta(l));
  if (!lines.length) return " ";
  const f = lines[0];
  const tabs = (f.match(/\t/g)||[]).length, commas = (f.match(/,/g)||[]).length;
  if (tabs>=2) return "\t";
  if (commas>=1) return ",";
  return /\s+/;
}

function smartSplit(line, delim) {
  if (typeof delim === "string") return line.split(delim).map(c => c.trim());
  return line.trim().split(delim).filter(c => c.length>0);
}

function findHeaderRow(lines, delim) {
  for (let i=0; i<lines.length; i++) {
    const t = lines[i].trim();
    if (!t || isCommentOrMeta(t)) continue;
    const cols = smartSplit(t, delim);
    // Check if row looks like a header (at least one non-numeric col)
    const nonNumeric = cols.filter(c => !/^-?[\d.eE+-]+$/.test(c));
    if (nonNumeric.length > 0 && cols.length >= 2) return i;
    // If all numeric, this is data — no header
    return -1;
  }
  return -1;
}

function parseNgspiceRaw(text) {
  const lines = text.split(/\r?\n/);
  const vars = []; let nPts=0, nV=0, inHdr=true, bin=false;
  const dataLines = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (inHdr) {
      if (/^no\.\s+variables/i.test(t)) { nV=+(t.match(/\d+/)?.[0]||0); continue; }
      if (/^no\.\s+points/i.test(t)) { nPts=+(t.match(/\d+/)?.[0]||0); continue; }
      if (/^binary:/i.test(t)) { bin=true; break; }
      if (/^\d+\s+\S+\s+\S+/.test(t) && nV>0) {
        vars.push({idx:t.split(/\s+/)[0], name:t.split(/\s+/)[1], type:t.split(/\s+/)[2]});
        if (vars.length>=nV) inHdr=false;
      }
    } else {
      if (/^\d/.test(t)||/^-?\d/.test(t)) dataLines.push(t);
    }
  }
  const cols = vars.map(v=>v.name);
  const rows = dataLines.map(l=>l.trim().split(/\s+/));
  const numericCols = cols.map((_,i)=>rows.every(r=>!isNaN(+r[i]))?cols[i]:null).filter(Boolean);
  return { columns:cols, rows, rowCount:rows.length, numericColumns:numericCols, isBinaryRaw:bin, metadata:{nPoints:nPts,nVariables:nV} };
}

function normalizeDataFile(filePath) {
  const name = basename(filePath);
  const ext = extname(filePath).toLowerCase();
  const st = statSync(filePath);
  const size = fmtSize(st.size);
  const hash = fileHash(filePath);
  let result = { name, format:ext.slice(1)||"unknown", size, hash, columns:null, rows:[], rowCount:0, numericColumns:[], groups:null, metadata:{}, isBinary:false };

  if (ext===".raw") {
    try {
      const txt = readFileSync(filePath,"utf-8");
      const parsed = parseNgspiceRaw(txt);
      if (parsed.isBinaryRaw) {
        result.format="raw_binary"; result.isBinary=true; result.rowCount=parsed.rowCount;
        result.metadata={nPoints:parsed.metadata.nPoints, nVariables:parsed.metadata.nVariables, isBinaryRaw:true};
      } else {
        result.columns=parsed.columns; result.rows=parsed.rows; result.rowCount=parsed.rows.length;
        result.numericColumns=parsed.numericColumns;
      }
    } catch { result.rowCount=-1; }
    return result;
  }

  try {
    const txt = readFileSync(filePath,"utf-8");
    const delim = detectDelim(txt);
    const allLines = txt.split(/\r?\n/);
    const hdrIdx = findHeaderRow(allLines, delim);

    let columns, dataLines;
    if (hdrIdx<0) {
      // No header — generate column names
      const dl = allLines.filter(l=>!isCommentOrMeta(l));
      if (!dl.length) { result.rowCount=0; return result; }
      const first = smartSplit(dl[0], delim);
      columns = first.map((_,i)=>`col_${i}`);
      dataLines = dl;
    } else {
      columns = smartSplit(allLines[hdrIdx], delim);
      dataLines = allLines.slice(hdrIdx+1).filter(l=>{
        const t=l.trim();
        if (!t||isCommentOrMeta(l)) return false;
        const cols = smartSplit(l, delim);
        // Skip if all columns match header pattern (duplicate header)
        if (cols.length===columns.length && cols.every((c,i)=>c===columns[i])) return false;
        return cols.length>0;
      });
    }

    const rows = dataLines.map(l=>smartSplit(l,delim));
    const numericCols = columns.map((c,i)=>{
      const vals = rows.map(r=>+r[i]);
      const valid = vals.filter(v=>!isNaN(v));
      return valid.length>rows.length*0.8 ? c : null;
    }).filter(Boolean);

    // Detect groups: if a numeric column has few unique values relative to rows
    let groups = null;
    if (rows.length>10 && numericCols.length>=2) {
      for (const nc of numericCols.slice(0,2)) {
        const ci = columns.indexOf(nc);
        const uniq = new Set(rows.map(r=>r[ci]));
        if (uniq.size>=2 && uniq.size<=Math.min(50,rows.length/2)) {
          groups = { byColumn:nc, uniqueValues:[...uniq] };
          break;
        }
      }
    }

    result.columns=columns; result.rows=rows; result.rowCount=rows.length;
    result.numericColumns=numericCols; result.groups=groups;
  } catch { result.rowCount=-1; }

  return result;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Domain assignment                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

function assignDomain(name, parentDirs="") {
  const n = (parentDirs+"/"+name).toLowerCase();
  if (/dc|_iv|_id|transfer|kcl|bias|gm|output_conductance/.test(n)) return "dc";
  if (/ac|_cv|cv_|spar|s_param|nqs|capacitance|cgg|cgd|cgs/.test(n)) return "ac";
  if (/tran|switch|delay|waveform|pulse|energy|ringing|rise_time|fall_time/.test(n)) return "transient";
  if (/noise|psd|flicker|thermal|shot/.test(n)) return "noise";
  return "overview";
}

function plotDomain(name) {
  const n = name.toLowerCase();
  if (/dc|_iv|transfer|kcl/.test(n)) return "dc";
  if (/^ac|ac_|_cv|spar|s_param|capacitance/.test(n)) return "ac";
  if (/^tran|tran_|waveform|switch|pulse|delay/.test(n)) return "transient";
  if (/noise|psd|flicker/.test(n)) return "noise";
  return "overview";
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  REPORT parser                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

function parseStatusCell(cell) {
  const raw = cell.replace(/<[^>]+>/g,"").trim();
  const spanCls = cell.match(/class="([^"]*)"/i);
  if (spanCls) {
    if (/pass|success|green|ok/i.test(spanCls[1])) return "pass";
    if (/fail|error|red/i.test(spanCls[1])) return "fail";
  }
  const u = raw.toUpperCase();
  if (u==="PASS"||u==="✓"||u==="✅"||u==="OK") return "pass";
  if (u==="FAIL"||u==="✗"||u==="❌"||u==="FAILED"||u==="ERROR") return "fail";
  if (u==="UNAVAILABLE"||u==="N/A"||u==="—"||u==="-") return "unavailable";
  if (u.includes("PASS")) return "pass";
  if (u.includes("FAIL")) return "fail";
  return "unavailable";
}

function parseReport(reportPath) {
  try {
    const md = readFileSync(reportPath,"utf-8");
    const simM = md.match(/\*\*Simulator:\*\*\s*(\S+)\s*(\S*)/)||md.match(/Simulator:\s*(\S+)\s*(\S*)/i);
    const verM = md.match(/Version:\s*(\S+)\s*(\S*)/i)||md.match(/version:\s*(\S+)/i);
    let sim = simM?simM[1]:"ngspice", ver = simM?simM[2]||"unknown":"unknown";
    if (ver==="unknown" && verM) {
      const v = verM[1].replace(/^ngspice-?/i,"");
      if (v && v!=="unknown") { sim = "ngspice"; ver = v; }
    }
    const orM = md.match(/##\s*Overall Result:?\s*(\w+)/i);
    let overall = "unavailable";
    if (orM) { const w=orM[1].toUpperCase(); overall=w==="PASS"?"pass":w==="FAIL"?"fail":"unavailable"; }

    const tests=[];
    // Parse Summary tables under ### DC/AC/Transient/Noise Analysis Summary
    const domainFromHead=(h)=>{
      const hl=h.toLowerCase().trim();
      if (/dc analysis summary/i.test(hl)) return "dc";
      if (/ac analysis summary/i.test(hl)) return "ac";
      if (/transient analysis summary/i.test(hl)) return "transient";
      if (/noise analysis summary/i.test(hl)) return "noise";
      return null;
    };
    const cleanName=(n)=>n.replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim();
    const sumSecs = md.split(/^###\s+/m);
    for (const sec of sumSecs) {
      const hn = sec.slice(0,sec.indexOf("\n")).trim();
      const dom = domainFromHead(hn);
      if (!dom) continue;
      const lines = sec.split("\n"); let inTbl=false, tHdr=null;
      for (const line of lines) {
        const t = line.trim();
        if (!t) { inTbl=false; continue; }
        if (/^\|[-:\s|]+\|$/.test(t)) continue;
        if (t.startsWith("|")&&t.endsWith("|")) {
          const cells = t.split("|").slice(1,-1).map(c=>c.trim());
          if (cells.length<2) continue;
          const fc = cells[0];
          if (/^vgs\s*=/.test(fc.toLowerCase())||/^vds\s*=/.test(fc.toLowerCase())) continue;
          if (!inTbl) {
            if (/test type|test|check|metric|name/i.test(fc)) { tHdr=cells; inTbl=true; continue; }
            tHdr=cells; inTbl=true; continue;
          }
          let si=1;
          if (tHdr) { for (let i=0;i<tHdr.length;i++) { if (/status|result|pass/i.test(tHdr[i])) { si=i; break; }}}
          tests.push({testId:`${dom}_${tests.length+1}`,domain:dom,name:cleanName(fc),status:parseStatusCell(cells[si]||""),detail:cells[si+1]||cells[2]||""});
        }
      }
    }
    // Also collect bullet items from Simulation Setup
    const setupM = md.match(/##\s*1\.\s*Simulation Setup[\s\S]*?(?=##\s*2\.|$)/i);
    if (setupM) {
      const re = /-\s*\[<span[^>]*>([✓✗])<\/span>\]\s*(.+)/g; let m;
      while ((m=re.exec(setupM[0]))!==null) {
        tests.push({testId:`setup_${tests.length+1}`,domain:"overview",name:cleanName(m[2].trim()),status:m[1]==="✓"?"pass":"fail",detail:""});
      }
    }
    // Infer overall from tests if not explicitly stated
    if (overall==="unavailable" && tests.length>0) {
      const failCnt = tests.filter(t=>t.status==="fail").length;
      const passCnt = tests.filter(t=>t.status==="pass").length;
      if (failCnt===0 && passCnt>0) overall="pass";
      else if (failCnt>0) overall="fail";
    }
    return {reportMarkdown:md,simulator:sim,simulatorVersion:ver,overallStatus:overall,verificationTests:tests};
  } catch { return {reportMarkdown:"",simulator:"unknown",simulatorVersion:"",overallStatus:"unavailable",verificationTests:[]}; }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Recursive file indexing                                             */
/* ═══════════════════════════════════════════════════════════════════ */

function indexAllFiles(dir, runId, parentDirs="") {
  const res = { data:[], plots:[], reports:[], logs:[], netlists:[], other:[] };
  if (!existsSync(dir)) return res;
  try {
    for (const entry of readdirSync(dir)) {
      const fp = resolve(dir, entry);
      if (isExcluded(entry)||isExcluded(fp)) { EXCLUDED_COUNT++; continue; }
      let st; try { st=statSync(fp); } catch { continue; }
      if (st.isDirectory()) {
        if (["node_modules",".git","__pycache__","models"].includes(entry)) continue;
        const sub = indexAllFiles(fp, runId, parentDirs+entry+"/");
        for (const k of Object.keys(res)) res[k].push(...sub[k]);
        continue;
      }
      const ext = extname(entry).toLowerCase();
      const lo = entry.toLowerCase();
      const relP = parentDirs+entry;
      const sz = fmtSize(st.size);
      const h = fileHash(fp);

      if (lo==="report.md"||lo==="report.txt") {
        const rp = parseReport(fp);
        res.reports.push({name:entry,relPath:relP,size:sz,hash:h,report:rp});
        SOURCE_INVENTORY.reportFiles++;
        continue;
      }

      if (PLOT_EXTS.has(ext)) {
        const url = copyToPublic(fp, runId, "plots", relP);
        res.plots.push({name:entry,relPath:relP,domain:plotDomain(entry),format:ext.slice(1),size:sz,displayUrl:url});
        SOURCE_INVENTORY.plotFiles++;
        continue;
      }

      if (DATA_EXTS.has(ext)) {
        const norm = normalizeDataFile(fp);
        const url = (ext===".csv"||ext===".txt"||ext===".dat"||ext===".raw") ? copyToPublic(fp, runId, "data", relP) : null;
        // Write normalized JSON to public/ for browser fetch
        let jsonUrl = null;
        if (url && norm.rows && norm.rows.length>0) {
          const jsonDestDir = resolve(PUBLIC_DIR, runId, "data");
          const jsonName = `${basename(entry, ext)}_${h}.json`;
          writeFileSync(resolve(jsonDestDir, jsonName), JSON.stringify({columns:norm.columns, rows:norm.rows.slice(0,10000), numericColumns:norm.numericColumns, groups:norm.groups, metadata:norm.metadata, totalRows:norm.rows.length}));
          jsonUrl = `benchmark/${runId}/data/${jsonName}`;
        }
        res.data.push({name:entry,relPath:relP,domain:assignDomain(entry,parentDirs),format:norm.format,size:sz,hash:norm.hash,columns:norm.columns,rowCount:norm.rowCount,numericColumns:norm.numericColumns,groups:norm.groups,fetchUrl:jsonUrl||url,rawUrl:url,metadata:norm.metadata});
        SOURCE_INVENTORY.dataFiles++;
        continue;
      }

      if (/\.(log|out|err)$/i.test(ext)) { res.logs.push({name:entry,relPath:relP,size:sz,hash:h}); SOURCE_INVENTORY.logFiles++; continue; }
      if (/\.(cir|sp|inc|lib|scs)$/i.test(ext)) { res.netlists.push({name:entry,relPath:relP,size:sz,hash:h}); SOURCE_INVENTORY.netlistFiles++; continue; }
      res.other.push({name:entry,relPath:relP,format:ext||"unknown",size:sz,hash:h});
      SOURCE_INVENTORY.otherFiles++;
    }
  } catch(e) { console.warn(`  ⚠ Error reading ${dir}: ${e.message}`); }
  return res;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Source discovery                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function *discoverSources() {
  if (process.env.SPICE_BENCHMARK_SOURCE && existsSync(process.env.SPICE_BENCHMARK_SOURCE))
    yield { path: resolve(process.env.SPICE_BENCHMARK_SOURCE), label: "SPICE_BENCHMARK_SOURCE" };
  const ext = resolve(ROOT,"external","spice_model_benchmark");
  if (existsSync(ext)) yield { path: ext, label: "external/spice_model_benchmark" };
  const local = resolve(ROOT,"..","spice_model_benchmark");
  if (existsSync(local)) yield { path: local, label: "local clone" };
}

function findResultRoots(sourcePath) {
  const roots = [];
  const find = (p, prefix="") => {
    if (!existsSync(p)) return;
    try {
      for (const e of readdirSync(p)) {
        const fp = resolve(p,e);
        if (isExcluded(e)||isExcluded(fp)) { EXCLUDED_COUNT++; continue; }
        let st; try { st=statSync(fp); } catch { continue; }
        if (!st.isDirectory()) continue;
        if (["models",".git","node_modules","__pycache__"].includes(e)) continue;
        const dr = resolve(fp,"data"), pr = resolve(fp,"plots"), rr = resolve(fp,"REPORT.md")||resolve(fp,"report.md");
        const hasData = existsSync(dr), hasPlots = existsSync(pr), hasReport = existsSync(resolve(fp,"REPORT.md"))||existsSync(resolve(fp,"report.md"));
        if (hasData||hasPlots||hasReport) {
          roots.push({path:fp,label:prefix+e,hasData,hasPlots,hasReport});
        } else {
          // Check subdirectories that may contain results
          for (const sub of ["results","reference_results","spice_benchmark_results","benchmark_exports"]) {
            const sp = resolve(fp,sub);
            if (existsSync(sp) && statSync(sp).isDirectory()) find(sp, prefix+e+"/"+sub+"/");
          }
        }
      }
    } catch {}
  };
  find(sourcePath);
  return roots;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main                                                                */
/* ═══════════════════════════════════════════════════════════════════ */

function main() {
  console.log("[generate-spice-benchmark-data] discovering sources...");
  const sources = [...discoverSources()];
  console.log(`  Sources: ${sources.map(s=>s.label).join(", ") || "none"}`);

  const allRuns = {}, allModels = {}, allSuites = {};
  const modelIds=[], suiteIds=[], formatsSet=new Set();
  const indexedPaths = new Set(); // dedup identical paths across sources
  let availableModels = 0;

  for (const src of sources) {
    // Deduplicate identical source paths
    const srcKey = src.path;
    if (indexedPaths.has(srcKey)) { console.log(`  ⏭ Skipping duplicate source: ${src.label}`); continue; }
    indexedPaths.add(srcKey);
    console.log(`\n📂 ${src.label}: ${src.path}`);
    const roots = findResultRoots(src.path);
    console.log(`  Result roots: ${roots.length}`);

    // Scan for available netlists/models that haven't been run
    let availableFound = 0;
    const scanForModels = (p) => {
      if (!existsSync(p)) return;
      try {
        for (const e of readdirSync(p)) {
          if (isExcluded(e)) continue;
          const fp = resolve(p,e);
          let st; try { st=statSync(fp); } catch { continue; }
          if (st.isDirectory()) {
            if (["models",".git","node_modules","__pycache__","results","plots","data"].includes(e)) continue;
            const dl = e.toLowerCase();
            if (dl==="spectre"||dl.includes("spectre")) formatsSet.add("spectre");
            else if (dl==="hspice"||dl.includes("hspice")) formatsSet.add("hspice");
            else if (dl==="ngspice"||dl.includes("ngspice")) formatsSet.add("ngspice");
            scanForModels(fp);
            continue;
          }
          const ext = extname(e).toLowerCase();
          if (/\.(cir|sp|inc|lib|scs)$/i.test(ext)) {
            const pd = p.replace(src.path,"").split("/").filter(Boolean)[0]||"unknown";
            if (!COVERAGE.pdks.includes(pd)) COVERAGE.pdks.push(pd);
            if (ext===".scs") formatsSet.add("spectre");
            else if (ext===".sp") formatsSet.add("hspice");
            else if (ext===".cir") formatsSet.add("ngspice");
            else {
              const parentDir = p.split("/").pop()?.toLowerCase()||"";
              if (parentDir.includes("spectre")) formatsSet.add("spectre");
              else if (parentDir.includes("hspice")) formatsSet.add("hspice");
            }
            availableFound++;
          }
        }
      } catch {}
    };
    scanForModels(src.path);
    availableModels += availableFound;
    COVERAGE.modelsAvailable = availableModels;
    console.log(`  Available models/netlists: ${availableFound}`);

    for (const root of roots) {
      const rid = root.label.replace(/\//g,"_");
      const pd = root.label.split("/")[0]||"unknown";
      if (!COVERAGE.pdks.includes(pd)) COVERAGE.pdks.push(pd);
      console.log(`  📋 ${root.label}`);

      const files = indexAllFiles(root.path, rid);
      const rp = existsSync(resolve(root.path,"REPORT.md"))?resolve(root.path,"REPORT.md"):existsSync(resolve(root.path,"report.md"))?resolve(root.path,"report.md"):null;
      const rd = rp?parseReport(rp):{reportMarkdown:"",simulator:"unknown",simulatorVersion:"",overallStatus:"unavailable",verificationTests:[]};

      // Build or infer manifest
      let mf = {};
      const mp = resolve(root.path,"run_manifest.json");
      if (existsSync(mp)) { try { mf=JSON.parse(readFileSync(mp,"utf-8")); } catch {} }
      else {
        // Infer from report and netlist files
        const ns = files.netlists[0];
        mf = {
          pdkId: pd, modelId: rid, modelPath: ns?.relPath||"", modelFormat: pd.includes("ihp")?"hspice":"ngspice",
          deviceName: rd.reportMarkdown.split("\n").find(l=>l.includes("*Model:**"))?.replace(/\*\*Model:\*\*\s*/,"").trim()||"",
          netlistSuite:{suiteId:rid,suiteName:root.label,dcCircuit:"",acCircuit:"",transientCircuit:"",noiseCircuit:""},
          modes:[], simulator:rd.simulator, simulatorVersion:rd.simulatorVersion,
          generatedAt:"", commitSha:"", metadataSource:"inferred"
        };
      }

      const runStatus = rd.overallStatus==="pass"?"completed":rd.overallStatus==="fail"?"failed":"partial";

      const dataArtifacts = files.data.map(f=>({
        name:f.name,relPath:f.relPath,domain:f.domain,format:f.format,size:f.size,hash:f.hash,
        columns:f.columns,rowCount:f.rowCount,numericColumns:f.numericColumns,groups:f.groups,
        fetchUrl:f.fetchUrl,rawUrl:f.rawUrl,metadata:f.metadata||{}
      }));
      const plotArtifacts = files.plots.map(f=>({name:f.name,relPath:f.relPath,domain:f.domain,format:f.format,size:f.size,displayUrl:f.displayUrl}));
      const otherArtifacts = [...files.reports.map(f=>({...f,kind:"report"})),...files.logs.map(f=>({...f,kind:"log"})),...files.netlists.map(f=>({...f,kind:"netlist"})),...files.other.map(f=>({...f,kind:"other"}))];

      allRuns[rid]={runId:rid,status:runStatus,pdkId:mf.pdkId||pd,modelId:mf.modelId||rid,modelPath:mf.modelPath||"",modelFormat:mf.modelFormat||"ngspice",deviceName:mf.deviceName||"",netlistSuite:mf.netlistSuite||{suiteId:rid,suiteName:root.label,dcCircuit:"",acCircuit:"",transientCircuit:"",noiseCircuit:""},modes:mf.modes||[],simulator:rd.simulator,simulatorVersion:rd.simulatorVersion,generatedAt:mf.generatedAt||"",commitSha:mf.commitSha||"",metadataSource:mf.metadataSource||"manifest",reportSummary:{reportPath:"REPORT.md",reportMarkdown:rd.reportMarkdown,simulator:rd.simulator,simulatorVersion:rd.simulatorVersion,overallStatus:rd.overallStatus},verificationTests:rd.verificationTests,dataArtifacts,plotArtifacts,otherArtifacts,reportPath:"REPORT.md"};
      COVERAGE.runsCompleted++;

      const mid = mf.modelId||rid;
      if (!allModels[mid]) { allModels[mid]={modelId:mid,modelName:mid,modelPath:mf.modelPath||"",modelFormat:mf.modelFormat||"ngspice",deviceName:mf.deviceName||"",deviceType:""}; modelIds.push(mid); }
      if (mf.modelFormat) formatsSet.add(mf.modelFormat);
      const s = mf.netlistSuite;
      if (s?.suiteId && !allSuites[s.suiteId]) { allSuites[s.suiteId]=s; suiteIds.push(s.suiteId); }
    }
  }

  // Fixture fallback (only with ALLOW_SPICE_FIXTURE=1 and no real results)
  if (Object.keys(allRuns).length===0) {
    if (ALLOW_FIXTURE) {
      console.log("\n⚠ ALLOW_SPICE_FIXTURE=1 — loading fixture (no real results found)");
      const fixtureDir = resolve(ROOT,"data","spice-benchmark","runs");
      if (existsSync(fixtureDir)) {
        const roots = findResultRoots(fixtureDir);
        console.log(`  Fixture roots: ${roots.length}`);
        for (const root of roots) {
          const rid = root.label.replace(/\//g,"_");
          const files = indexAllFiles(root.path, rid);
          const rp = existsSync(resolve(root.path,"REPORT.md"))?resolve(root.path,"REPORT.md"):null;
          const rd = rp?parseReport(rp):{reportMarkdown:"",simulator:"unknown",simulatorVersion:"",overallStatus:"unavailable",verificationTests:[]};
          let mf={};
          try { mf=JSON.parse(readFileSync(resolve(root.path,"run_manifest.json"),"utf-8")); } catch {}
          allRuns[rid]={runId:rid,status:"example",pdkId:"FreePDK45",modelId:mf.modelId||rid,modelPath:mf.modelPath||"",modelFormat:mf.modelFormat||"ngspice",deviceName:mf.deviceName||"",netlistSuite:mf.netlistSuite||{suiteId:rid,suiteName:root.label,dcCircuit:"",acCircuit:"",transientCircuit:"",noiseCircuit:""},modes:mf.modes||[],simulator:rd.simulator,simulatorVersion:rd.simulatorVersion,generatedAt:mf.generatedAt||"",commitSha:mf.commitSha||"",metadataSource:"fixture",reportSummary:{reportPath:"REPORT.md",reportMarkdown:rd.reportMarkdown,simulator:rd.simulator,simulatorVersion:rd.simulatorVersion,overallStatus:rd.overallStatus},verificationTests:rd.verificationTests,dataArtifacts:files.data.map(f=>({name:f.name,relPath:f.relPath,domain:f.domain,format:f.format,size:f.size,hash:f.hash,columns:f.columns,rowCount:f.rowCount,numericColumns:f.numericColumns,groups:f.groups,fetchUrl:f.fetchUrl,rawUrl:f.rawUrl,metadata:f.metadata||{}})),plotArtifacts:files.plots.map(f=>({name:f.name,relPath:f.relPath,domain:f.domain,format:f.format,size:f.size,displayUrl:f.displayUrl})),otherArtifacts:[...files.reports.map(f=>({...f,kind:"report"})),...files.logs.map(f=>({...f,kind:"log"})),...files.netlists.map(f=>({...f,kind:"netlist"})),...files.other.map(f=>({...f,kind:"other"}))],reportPath:"REPORT.md"};
          COVERAGE.runsCompleted++;
          const mid=mf.modelId||rid; if(!allModels[mid]){allModels[mid]={modelId:mid,modelName:mid,modelPath:mf.modelPath||"",modelFormat:mf.modelFormat||"ngspice",deviceName:mf.deviceName||"",deviceType:""};modelIds.push(mid);}
          if(mf.modelFormat)formatsSet.add(mf.modelFormat);
          const s=mf.netlistSuite; if(s?.suiteId&&!allSuites[s.suiteId]){allSuites[s.suiteId]=s;suiteIds.push(s.suiteId);}
        }
      }
    } else {
      console.error("\n❌ No real benchmark results found and ALLOW_SPICE_FIXTURE is not set.");
      console.error("   Set ALLOW_SPICE_FIXTURE=1 to allow fixture data, or run benchmarks first.");
      process.exit(1);
    }
  }

  SOURCE_INVENTORY.totalArtifacts = SOURCE_INVENTORY.dataFiles+SOURCE_INVENTORY.plotFiles+SOURCE_INVENTORY.reportFiles+SOURCE_INVENTORY.logFiles+SOURCE_INVENTORY.netlistFiles+SOURCE_INVENTORY.otherFiles;

  const manifestData = {generatedAt:new Date().toISOString(),repoUrl:"https://github.com/SJTU-YONGFU-RESEARCH-GRP/spice_model_benchmark",runs:allRuns,modelIds,models:allModels,suiteIds,netlistSuites:allSuites,modelFormats:[...formatsSet],availableModels:COVERAGE.modelsAvailable||0};

  // Write JSON snapshot
  writeFileSync(JSON_FILE, JSON.stringify({manifest:manifestData,sourceInventory:SOURCE_INVENTORY,coverage:COVERAGE},null,2),"utf-8");

  // Write TypeScript
  const ts = `// Auto-generated — ${new Date().toISOString()}
// Runs: ${Object.keys(allRuns).length}, Models: ${modelIds.length}, Suites: ${suiteIds.length}
import type { SpiceBenchmarkManifest } from "./SpiceBenchmarkTypes";
export const SPICE_BENCHMARK_MANIFEST: SpiceBenchmarkManifest = ${JSON.stringify(manifestData,null,2)};
export const SOURCE_INVENTORY = ${JSON.stringify(SOURCE_INVENTORY)};
`;
  writeFileSync(OUT_FILE, ts, "utf-8");

  console.log(`\n📊 Build summary:`);
  console.log(`  Sources: ${sources.length}`);
  console.log(`  PDKs: ${COVERAGE.pdks.join(", ")||"—"}`);
  console.log(`  Result roots: ${COVERAGE.runsCompleted}`);
  console.log(`  Data files: ${SOURCE_INVENTORY.dataFiles}`);
  console.log(`  Plot files: ${SOURCE_INVENTORY.plotFiles}`);
  console.log(`  Report files: ${SOURCE_INVENTORY.reportFiles}`);
  console.log(`  Log files: ${SOURCE_INVENTORY.logFiles}`);
  console.log(`  Netlist files: ${SOURCE_INVENTORY.netlistFiles}`);
  console.log(`  Other files: ${SOURCE_INVENTORY.otherFiles}`);
  console.log(`  Total artifacts: ${SOURCE_INVENTORY.totalArtifacts}`);
  console.log(`  Excluded: ${EXCLUDED_COUNT}`);
  console.log(`\n✅ Written: ${OUT_FILE}`);
}

main();
