#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, basename, extname } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
const __dirname=fileURLToPath(new URL(".",import.meta.url)),ROOT=resolve(__dirname,".."),PUBLIC=resolve(ROOT,"public/expansion"),OUT=resolve(ROOT,"src/data/generatedExpansionManifest.ts"),JSONF=resolve(ROOT,"src/data/generatedExpansionManifest.json");
const SOURCES=[process.env.EXPANSION_SOURCE,resolve(ROOT,"..","spice_model_expansion")].filter(Boolean);
let SD=null;for(const p of SOURCES){if(existsSync(p)){SD=p;break;}}if(!SD){console.error("No source");process.exit(1);}
function h(p){try{return createHash("md5").update(readFileSync(p)).digest("hex").slice(0,8)}catch{return"unknown"}}
function sz(b){return b<1024?`${b} B`:`${(b/1024).toFixed(1)} KB`}
function cp(src,sub){const d=resolve(PUBLIC,sub);mkdirSync(d,{recursive:true});const n=`${basename(src,extname(src))}_${h(src)}${extname(src)}`;try{copyFileSync(src,resolve(d,n));return`expansion/${sub}/${n}`}catch{return null}}
function pp(fp){try{const b=readFileSync(fp);if(b[0]!==0x89||b[1]!==0x50)return null;return{width:b.readUInt32BE(16),height:b.readUInt32BE(20),aspectRatio:+(b.readUInt32BE(16)/b.readUInt32BE(20)).toFixed(3)}}catch{return null}}
function section(n){const l=n.toLowerCase();if(l.includes("_iv")||l.includes("iv_"))return"iv";if(l.includes("_cv")||l.includes("cv_"))return"cv";if(l.includes("mc")||l.includes("monte_carlo")||l.includes("histogram"))return"mc";return"other"}
function caption(n){const l=n.toLowerCase();if(l.includes("iv_")&&l.includes("curves")){const d=n.split("_")[1]||"MOS";return{title:`IV Curves — ${d}`,what:`T/S/F corner IV characteristics for ${d}.`,why:"Validates that corner models produce physically correct I-V behavior across all process corners.",device:d}}if(l.includes("cv_")&&l.includes("c_vs_f")){const d=n.split("_")[1]||"MOS";return{title:`C-V — ${d}`,what:`T/S/F corner C-V characteristics for ${d}.`,why:"Verifies gate capacitance behavior across corners for timing and power analysis.",device:d}}if(l.includes("mc")){const d=n.split("_").slice(2,4).join("_")||"MOS";return{title:`Monte Carlo — ${n.split("_")[1]||"param"}`,what:`MC distribution for ${d}.`,why:"Shows process variation impact on device parameters for design margin analysis.",device:d}}return{title:n.replace(/_[a-f0-9]{8}\.(png|svg)$/i,"").replace(/[_-]/g," "),what:"Original tool output.",why:"Part of the expansion verification pipeline."}}
function main(){console.log(`[gen-expansion] src:${SD}`);
const results=[];const allMd=[],allPlots=[],allData=[],allOther=[];
const idx=(dir,prefix="")=>{if(!existsSync(dir))return;for(const e of readdirSync(dir)){const fp=resolve(dir,e);let st;try{st=statSync(fp)}catch{continue}if(st.isDirectory()){idx(fp,prefix+e+"/");continue}const ext=extname(e).toLowerCase(),rp=prefix+e,s=sz(st.size),hh=h(fp);if(e==="SUMMARY.md"){allMd.push({name:e,relPath:rp,size:s,hash:hh,fetchUrl:cp(fp,"reports"),content:readFileSync(fp,"utf-8")})}else if(ext===".png"||ext===".svg"){const u=cp(fp,"plots"),d=ext===".png"?pp(fp):null;allPlots.push({name:e,relPath:rp,format:ext.slice(1),size:s,hash:hh,displayUrl:u,...(d||{}),caption:caption(e),section:section(e)})}else if(ext===".json"||ext===".csv"){allData.push({name:e,relPath:rp,format:ext.slice(1),size:s,hash:hh})}else{allOther.push({name:e,relPath:rp,size:s,hash:hh,format:ext||"unknown"})}}};
// Index output dirs
for(const d of readdirSync(SD)){const fp=resolve(SD,d);if(!statSync(fp).isDirectory()||!d.startsWith("output"))continue;allPlots.length=allData.length=allOther.length=allMd.length=0;idx(fp);
  const smd=allMd.find(f=>f.name==="SUMMARY.md");const smdTxt=smd?.content||"";
  // Parse corners from SUMMARY
  const corners=[];const mcStats=[];
  const devicesFromMd=[...new Set([...smdTxt.matchAll(/###\s+(\w+_\w+)/g)].map(m=>m[1]))];
  // Parse corner tables
  for(const dev of devicesFromMd){const sec=smdTxt.split(`### ${dev}`)[1]?.split("###")[0]||"";const rows=[...sec.matchAll(/\|\s*([tfs])\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g)];for(const r of rows){corners.push({device:dev,corner:r[1],ion:parseFloat(r[2])||undefined,ioff:parseFloat(r[3])||undefined,ionIoff:parseFloat(r[4])||undefined,idens:parseFloat(r[5])||undefined,vth:parseFloat(r[6])||r[6].trim()==="—"?undefined:parseFloat(r[6])||undefined})}}
  // Parse MC stats
  for(const dev of devicesFromMd){const sec=smdTxt.split(`### ${dev}`)[1]?.split("## Monte Carlo")[1]?.split("###")[0]||"";const sM=sec.match(/\*\*Samples:\*\*\s*(\d+)/);const idM=sec.match(/\*\*Id mean[^:]*:\*\*\s*([-\d.e+]+)/);const sigM=sec.match(/\*\*Id 1[σs][^:]*:\*\*\s*([-\d.e+]+)/);const pars=[...sec.matchAll(/\|\s*(\w+)\s*\|\s*([-\d.e+]+)\s*\|\s*([-\d.e+]+)\s*\|/g)].map(r=>({name:r[1],mean:parseFloat(r[2]),sigma:parseFloat(r[3])}));if(sM)mcStats.push({device:dev,samples:parseInt(sM[1]),idMean:idM?parseFloat(idM[1]):undefined,idSigma:sigM?parseFloat(sigM[1]):undefined,params:pars})}
  const sigM=smdTxt.match(/n_σ\s*=\s*([\d.]+)/)||smd.match(/n_σ\s*=\s*([\d.]+)/);
  results.push({resultId:d,title:d.replace("output-","").toUpperCase()+" Expansion",model:d.includes("bsim3")?"BSIM3":"Level 1",sigma:parseFloat(sigM?.[1]||"3"),devices:devicesFromMd,kpis:{sourceTT:d.includes("bsim3")?"BSIM3 TT model":"Level 1 TT model",sigma:parseFloat(sigM?.[1]||"3"),devices:devicesFromMd,coverage:"T/S/F corners",mcSamples:mcStats[0]?.samples||1000,distribution:smdTxt.match(/distribution\s*=\s*(\w+)/)?.[1]||"normal",seed:"42"},corners,mcStats,reports:smd?[{name:"SUMMARY.md",relPath:smd.relPath,size:smd.size,hash:smd.hash,fetchUrl:smd.fetchUrl}]:[],plots:[...allPlots],dataArtifacts:[...allData],otherArtifacts:[...allOther],summary:{totalReports:1,totalPlots:allPlots.length,totalData:allData.length+allOther.length}})}
const m={generatedAt:new Date().toISOString(),results,defaultResultId:results[0]?.resultId||"",allModels:[...new Set(results.map(r=>r.model))]};
writeFileSync(JSONF,JSON.stringify(m,null,2),"utf-8");
writeFileSync(OUT,`// Auto-generated: ${new Date().toISOString()}\nimport type { Manifest } from "./ExpansionTypes";\nexport const EXPANSION_MANIFEST: Manifest = ${JSON.stringify(m,null,2)};\n`,"utf-8");
console.log(`✅ ${results.length} results, ${results.reduce((s,r)=>s+r.plots.length,0)} plots, ${results.reduce((s,r)=>s+r.dataArtifacts.length,0)} data`);
}main();
