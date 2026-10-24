import fs from "node:fs/promises";
import type { JsonObject } from "../../../shared/contracts/v1.ts";
import { AcgError, regular } from "../acg/types.ts";
export async function readDtcoMetrics(root:string):Promise<JsonObject> {
 const data=JSON.parse(await fs.readFile(await regular(root,"output/dtco/metrics.json"),"utf8")) as JsonObject;
 if(data.schemaVersion!=="dtco.measurements.v1")throw new AcgError("DTCO_METRICS_SCHEMA","Invalid measurement schema","parser");
 for(const key of ["delayPs","delayRisePs","delayFallPs","averagePowerW","energyPerCycleJ","areaUm2"]) {
  if(typeof data[key]!=="number"||!Number.isFinite(data[key])||data[key]<=0)throw new AcgError("DTCO_METRICS_NONFINITE","Missing, nonfinite or nonpositive metric "+key,"parser");
 }
 if(typeof data.selectedGdsPath!=="string"||typeof data.selectedGdsSha256!=="string")throw new AcgError("DTCO_GDS_EVIDENCE","Selected GDS evidence missing","parser");
 return data;
}
