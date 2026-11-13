import type { JsonObject, ParameterDefinitionV1 } from "./contracts/v1.ts";
export const ACG_RESEARCH_SCHEMA = "acg.research-workflow.v1";
export const ACG_RESEARCH_OPERATIONS = ["algorithm-matrix","algorithm-report","known-feasible"] as const;
export type AcgResearchOperation = typeof ACG_RESEARCH_OPERATIONS[number];
export const ACG_BENCHMARK_TRANSISTORS: Record<string,number> = {inv_x1:2,nand2_x1:4,aoi21_x1:6,mux2_x1:6,ldnq_x1:12,xor2_x1:16,mux4_x1:16,addh_x1:22,fdp_x1:24,oai222_x1:24,maj3_x1:30,fsdp_x1:30,mux8_x1:38,xor4_x1:48,addf_x1:62};
export const ACG_RESEARCH_ALGORITHMS = {cmos:["auto","dp","sa","sa_exp","sa_lin","sa_log"],mr:["auto","dp","sa","sa_exp","sa_lin","sa_log","greedy_min","greedy_max","greedy_deg","greedy_rnd","hc_fi","hc_bi","ga","random"]};
export function researchOperation(value:string): value is AcgResearchOperation { return (ACG_RESEARCH_OPERATIONS as readonly string[]).includes(value); }
export function nativeCellTimeout(cell:string): number { const count=ACG_BENCHMARK_TRANSISTORS[cell];return count<=8?120:count<=24?180:count<=48?300:600; }
export function researchParameters(operation:AcgResearchOperation,engine:"cmos"|"mr"): ParameterDefinitionV1[] {
 const field=(id:string,type:ParameterDefinitionV1["type"],defaultValue:ParameterDefinitionV1["defaultValue"],minimum:number|null=null,maximum:number|null=null):ParameterDefinitionV1=>({id,label:id,description:id,type,defaultValue,minimum,maximum,unit:id.endsWith("Seconds")?"s":null,required:false,enumValues:[],sweepable:false,toolVersionRange:null,mapping:{kind:"generated-config",key:id}});
 if(operation==="algorithm-report")return [field("maxCols","integer",8,4,32),field("sourceResultId","string",null)];
 if(operation==="algorithm-matrix")return [field("cells","string-list",["inv_x1"]),field("algorithms","string-list",["dp","sa"]),field("rowCounts","number-list",engine==="mr"?[1,2,3]:[1],1,engine==="mr"?4:1),field("trials","integer",1,1,10),field("threads","integer",1,1,4),field("maxCols","integer",8,4,32)];
 return [field("cells","string-list",["inv_x1"]),field("numRows","integer",1,1,3),field("tracks","number-list",[9,12,16],5,16),field("extraCpp","number-list",[0,2,4,8,16],0,16),field("maxAttempts","integer",30,1,100),field("totalTimeoutSeconds","integer",3600,1,86400),field("attemptTimeoutSeconds","integer",900,1,3600),field("resumeResultId","string",null)];
}
export function researchRoles(operation:AcgResearchOperation) {
 return (operation==="algorithm-matrix"?[["algorithm-config",false,true,[".json"]],["rules",false,false,[".json"]]]:operation==="algorithm-report"?[["aggregate",false,false,[".json"]]]:[["netlist",false,true,[".sp",".spi",".cdl",".cir",".spice",".net"]],["config",false,false,[".json"]],["rules",false,false,[".json"]]]).map(([id,required,multiple,extensions])=>({id:id as string,label:id as string,description:id as string,required:required as boolean,multiple:multiple as boolean,extensions:extensions as string[],recognizedTypes:[]}));
}
export interface AcgResearchSummary extends JsonObject { schemaVersion:typeof ACG_RESEARCH_SCHEMA; operation:AcgResearchOperation; engine:"cmos"|"mr"; }
