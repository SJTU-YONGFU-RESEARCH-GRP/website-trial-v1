import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
import { projectRoot, object } from "./types.ts";
export async function buildAcgSelfTest(tool: ToolConfigurationV1, directory: string) {
  if (tool.toolId === "acg-renderer") return {argv:["--self-test"],requiredFiles:["renderer-output/SELFTEST.png"],verifyOutput:()=>{}};
  if (tool.toolId === "acg-research") return {argv:["--self-test"],requiredFiles:[],verifyOutput:(stdout:string)=>{if(!stdout.split(/\r?\n/).some(line=>{try{const v=JSON.parse(line);return v.status==="passed" && v.version==="acg.research-workflow.v1";}catch{return false;}}))throw new Error("README research wrapper self-test failed");}};
  if (tool.toolId === "acg-replay") return {argv:["--self-test"],requiredFiles:[],verifyOutput:(stdout:string)=>{if(!stdout.split(/\r?\n/).some(line=>{try{const value=JSON.parse(line);return value.status==="passed" && value.version==="acg.replay-preparation.v1";}catch{return false;}})) throw new Error("MR replay preparation self-test did not confirm readiness");}};
  if (tool.toolId === "acg-lvs1") return {argv:["--self-test","--engine-root",tool.rootPath ?? ""],requiredFiles:[],verifyOutput:(stdout:string)=>{if(!stdout.split(/\r?\n/).some(line=>{try{const value=JSON.parse(line);return value.healthy===true && value.version==="acg.research-lvs1.v1" && ["wrapperSha256","driverSha256","extractorSha256","technologySha256"].every(key=>/^[a-f0-9]{64}$/.test(value[key]));}catch{return false;}})) throw new Error("Research LVS1 dependency self-test did not confirm readiness");}};
  if (tool.toolId === "acg-pv") return {argv:["--self-test","--engine-root",tool.rootPath ?? ""],requiredFiles:[],verifyOutput:(stdout:string)=>{if(!stdout.split(/\r?\n/).some(line=>{try{return JSON.parse(line).healthy===true;}catch{return false;}})) throw new Error("PV dependency self-test did not confirm readiness");}};
  const engine = tool.toolId.replace("acg-","") as "cmos"|"dr"|"mr";
  const project = await projectRoot(tool,engine);
  const configFile = engine === "dr" ? "config/config_cfet.json" : "config/gf180/config.json";
  const rulesFile = engine === "dr" ? "config/rules_cfet.json" : "config/gf180/rules_gf180.json";
  const sourceFile = engine === "dr" ? "input/inv.sp" : "input/benchmark/inv_x1.sp";
  const config = object(JSON.parse(await fsp.readFile(path.join(project,configFile),"utf8")));
  Object.assign(config,{placement_only:true,placement_only_num_gds:0,gen_gds:false,num_solutions:4,placement_timeout_ms:10000,placer_search_node_budget:10000,placer_backtrack_budget:5000});
  if(engine==="mr") Object.assign(config,{num_rows:2,track_num:9,placement_algorithm:"sa",placement_random_seed:17,sa_iter_per_temp:10,sa_t0:2,sa_t_min:1,sa_alpha:0.5});
  await fsp.writeFile(path.join(directory,"config.json"),JSON.stringify(config));
  await fsp.copyFile(path.join(project,rulesFile),path.join(directory,"rules.json"));
  await fsp.copyFile(path.join(project,sourceFile),path.join(directory,"netlist.sp"));
  return {argv:["--config","config.json","--rules","rules.json","--netlist","netlist.sp","--output","output"],requiredFiles:["output/summary.txt"],
    verifyOutput:()=>{const text=fs.readFileSync(path.join(directory,"output/summary.txt"),"utf8");if(!/Cell name\s*:\s*\S+/.test(text)||!/Min #CPP\s*=\s*[1-9]\d*/.test(text)) throw new Error("Native self-test did not prove a real cell placement");}};
}
