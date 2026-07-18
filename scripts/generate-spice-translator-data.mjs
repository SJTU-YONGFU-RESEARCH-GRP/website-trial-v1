#!/usr/bin/env node
/**
 * generate-spice-translator-data.mjs
 * Indexes docs/finalbatchrun2/ from new-spice-translator.
 * Generates src/data/generatedSpiceTranslatorManifest.ts + .json snapshot.
 * Excludes private-model paths; only indexes docs/finalbatchrun2/.
 */

import { readFileSync, readdirSync, statSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, basename, extname } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(ROOT, "public/translator");
const OUT_FILE = resolve(ROOT, "src/data/generatedSpiceTranslatorManifest.ts");
const JSON_FILE = resolve(ROOT, "src/data/generatedSpiceTranslatorManifest.json");

const SOURCE_PRIORITY = [
  process.env.TRANSLATOR_SOURCE,
  resolve(ROOT,"external","new-spice-translator"),
  resolve(ROOT,"..","new-spice-translator"),
].filter(Boolean);

let SOURCE_DIR = null;
for (const p of SOURCE_PRIORITY) { if (existsSync(resolve(p,"docs","finalbatchrun2"))) { SOURCE_DIR=p; break; } }
if (!SOURCE_DIR) { console.error("No new-spice-translator source found"); process.exit(1); }

const FINAL_DIR = resolve(SOURCE_DIR, "docs/finalbatchrun2");
const EXCLUDE_TERMS = ["private-models","private_models","/tools/spice-libraries/private"];

function isExcluded(s) { return EXCLUDE_TERMS.some(t => s.includes(t)); }
function fileHash(p) { try { return createHash("md5").update(readFileSync(p)).digest("hex").slice(0,8); } catch { return "unknown"; } }
function fmtSize(b) { return b<1024?`${b} B`:`${(b/1024).toFixed(1)} KB`; }

function copyToPublic(src, subdir) {
  const destDir = resolve(PUBLIC_DIR, subdir);
  mkdirSync(destDir, { recursive: true });
  const h = fileHash(src); const ext = extname(src);
  const dn = `${basename(src, ext)}_${h}${ext}`;
  try { copyFileSync(src, resolve(destDir, dn)); return `translator/${subdir}/${dn}`; } catch { return null; }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length<2) return [];
  const headers = lines[0].split(",").map(h=>h.trim());
  return lines.slice(1).map(l=>{const v=l.split(","); const o={}; headers.forEach((h,i)=>o[h]=v[i]?.trim()??""); return o;});
}

function indexRecursive(dir, relPrefix="") {
  const results = { markdowns:[], jsons:[], csvs:[], texs:[], plots:[], others:[] };
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const fp = resolve(dir, entry);
    if (isExcluded(fp)) continue;
    let st; try { st=statSync(fp); } catch { continue; }
    if (st.isDirectory()) {
      const sub = indexRecursive(fp, relPrefix+entry+"/");
      for (const k of Object.keys(results)) results[k].push(...sub[k]);
      continue;
    }
    const ext = extname(entry).toLowerCase();
    const relP = relPrefix+entry;
    const sz = fmtSize(st.size);
    const h = fileHash(fp);

    if (ext===".md") {
      const content = readFileSync(fp,"utf-8");
      results.markdowns.push({name:entry,relPath:relP,size:sz,hash:h,content});
    } else if (ext===".json") {
      const content = readFileSync(fp,"utf-8");
      let parsed=null; try { parsed=JSON.parse(content); } catch {}
      results.jsons.push({name:entry,relPath:relP,size:sz,hash:h,parsed});
    } else if (ext===".csv") {
      const content = readFileSync(fp,"utf-8");
      results.csvs.push({name:entry,relPath:relP,size:sz,hash:h,rows:parseCsv(content)});
    } else if (ext===".tex") {
      results.texs.push({name:entry,relPath:relP,size:sz,hash:h});
    } else if (ext===".png"||ext===".svg") {
      const url = copyToPublic(fp, "plots");
      results.plots.push({name:entry,relPath:relP,format:ext.slice(1),size:sz,hash:h,displayUrl:url});
    } else {
      results.others.push({name:entry,relPath:relP,size:sz,hash:h,format:ext||"unknown"});
    }
  }
  return results;
}

function extractHeroNumbers(md) {
  const nums = {};
  const m = (re,key) => { const match = md.match(re); if (match) nums[key] = match[1].trim(); };
  m(/\*\*(\d+)\/\d+\s*PDKs\*\*|\*\*(\d+)\/\d+ PDKs\*\*/,"pdks");
  m(/processed \*\*(\d+)\/\d+ PDKs/i,"pdks");
  m(/PDKs processed[:\s]*(\d+)/i,"pdks");
  m(/files discovered:\s*\*?\*?(\d+)/i,"sourceFiles");
  m(/Successful translations:\s*\*?\*?(\d+)/i,"successfulTranslations");
  m(/Models translated:\s*\*?\*?([\d,]+)/i,"modelsTranslated");
  m(/Verification result:\s*\*?\*?(\d+)\/(\d+)/i,"verification");
  m(/Round-trip consistency:\s*\*?\*?(\d+)\/(\d+)/i,"roundTrip");
  m(/Monte Carlo stability:\s*\*?\*?(\d+)\/(\d+)/i,"monteCarlo");
  // Fallback: extract from first bullets
  if (!nums.sourceFiles) { const m2=md.match(/Source files discovered[:\s]*\*?\*?(\d+)/i); if(m2) nums.sourceFiles=m2[1]; }
  if (!nums.successfulTranslations) { const m2=md.match(/Successful translations[:\s]*\*?\*?(\d+)/i); if(m2) nums.successfulTranslations=m2[1]; }
  if (!nums.modelsTranslated) { const m2=md.match(/Models translated[:\s]*\*?\*?([\d,]+)/i); if(m2) nums.modelsTranslated=m2[1]; }
  return nums;
}

function main() {
  console.log(`[generate-spice-translator-data] source: ${SOURCE_DIR}`);

  const files = indexRecursive(FINAL_DIR);
  const reportMd = files.markdowns.find(f=>f.name==="FINALBATCHRUN2.md");
  const batchJson = files.jsons.find(f=>f.name==="batch_all_summary.json");

  // Extract metadata from report
  const hero = reportMd ? extractHeroNumbers(reportMd.content) : {};
  // Extract from batch_all_summary.json
  if (batchJson?.parsed) {
    const s = batchJson.parsed.summary || {};
    if (!hero.pdks) hero.pdks = String(batchJson.parsed.pdks_processed||"");
    if (!hero.sourceFiles) hero.sourceFiles = String(s.total_source_files||"");
    if (!hero.successfulTranslations) hero.successfulTranslations = String(s.total_successful||"");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    reportMarkdown: reportMd?.content||"",
    reportHash: reportMd?.hash||"",
    hero,
    markdowns: files.markdowns.map(f=>({name:f.name,relPath:f.relPath,size:f.size,hash:f.hash,content:f.content})),
    jsons: files.jsons,
    csvs: files.csvs,
    texs: files.texs,
    plots: files.plots,
    others: files.others,
    totalPlots: files.plots.length,
    totalDataFiles: files.csvs.length + files.jsons.length + files.texs.length,
  };

  writeFileSync(JSON_FILE, JSON.stringify(manifest,null,2),"utf-8");

  // Write TS (without embedding full markdown content to avoid huge bundle — fetched separately)
  const tsManifest = {...manifest, markdowns:manifest.markdowns.map(f=>({...f,content:undefined}))};
  // Keep one markdown for inline rendering
  tsManifest.reportMarkdown = reportMd?.content||"";

  const ts = `// Auto-generated: ${new Date().toISOString()}
import type { SpiceTranslatorManifest } from "./SpiceTranslatorTypes";
export const TRANSLATOR_MANIFEST: SpiceTranslatorManifest = ${JSON.stringify(tsManifest,null,2)};
`;
  writeFileSync(OUT_FILE, ts, "utf-8");
  console.log(`✅ Written ${OUT_FILE} — ${files.markdowns.length} md, ${files.jsons.length} json, ${files.csvs.length} csv, ${files.plots.length} plots`);
}

main();
