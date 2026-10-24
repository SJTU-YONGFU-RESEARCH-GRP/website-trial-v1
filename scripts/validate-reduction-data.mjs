#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const JSON_PATH = resolve(ROOT, "src/data/generatedReductionManifest.json");
let errors=0,warnings=0;
function fail(m){console.error(`  ❌ ${m}`);errors++;}
function warn(m){console.warn(`  ⚠️  ${m}`);warnings++;}
function ok(m){console.log(`  ✅ ${m}`);}

function main(){
  console.log("🔍 validate:reduction-data\n");
  if(!existsSync(JSON_PATH)){fail("Manifest not found");process.exit(1);}
  let d;try{d=JSON.parse(readFileSync(JSON_PATH,"utf-8"));}catch(e){fail(`JSON:${e.message}`);process.exit(1);}
  const rs=d.results||[];
  ok(`${rs.length} result(s)`);
  for(const r of rs){
    if(!r.resultId){fail("Missing resultId");continue;}
    const rpt=r.reports?.length||0,plt=r.plots?.length||0,dat=(r.dataArtifacts?.length||0)+(r.otherArtifacts?.length||0);
    ok(`${r.resultId}: ${rpt} reports, ${plt} plots, ${dat} data, ${r.iterations?.length||0} iterations`);
    if(!r.kpis)warn(`${r.resultId}: no kpis`);
    for(const p of(r.plots||[])){if(!p.displayUrl)fail(`${r.resultId}: plot ${p.name} no displayUrl`);}
    for(const rp of(r.reports||[])){if(!rp.fetchUrl)warn(`${r.resultId}: report ${rp.name} no fetchUrl`);}
  }
  console.log(`\n${errors>0?"❌":"✅"} Validation: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(errors>0?1:0);
}
main();
