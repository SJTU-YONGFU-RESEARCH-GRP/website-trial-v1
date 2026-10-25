import fs from "node:fs/promises";
import type { JsonObject } from "../../../shared/contracts/v1.ts";
import { AcgError, regular } from "../acg/types.ts";
export async function readDtcoMetrics(root:string):Promise<JsonObject> {
 const data=JSON.parse(await fs.readFile(await regular(root,"output/dtco/metrics.json"),"utf8")) as JsonObject;
 if(data.schemaVersion!=="dtco.measurements.v1")throw new AcgError("DTCO_METRICS_SCHEMA","Invalid measurement schema","parser");
 for(const key of ["delayPs","delayRisePs","delayFallPs","averagePowerW","energyPerCycleJ","areaUm2"]) {
  if(typeof data[key]!=="number"||!Number.isFinite(data[key])||data[key]<=0)throw new AcgError("DTCO_METRICS_NONFINITE","Missing, nonfinite or nonpositive metric "+key,"parser");
 }
 if(typeof data.selectedGdsPath!=="string"||typeof data.selectedGdsSha256!=="string"||!/^[a-f0-9]{64}$/.test(data.selectedGdsSha256))throw new AcgError("DTCO_GDS_EVIDENCE","Selected GDS evidence missing","parser");
 if(data.electricalMode==="extracted"){
  const proof=data.extraction as JsonObject|null;
  const devices=proof?.devices;
  if(!proof||proof.status!=="validated"||proof.drcCount!==0||proof.drcStyle!=="drc(full)"||proof.sourceGeometryMatched!==true||proof.finalGdsRoundtrip!==true||proof.resistanceExtracted!==false||!Array.isArray(devices)||devices.length!==2||typeof proof.capacitorCount!=="number"||!Number.isInteger(proof.capacitorCount)||proof.capacitorCount<1||data.selectedGdsPath!=="output/dtco/physical/completed.gds")throw new AcgError("DTCO_EXTRACTION_EVIDENCE","Missing validated final-GDS extraction evidence","parser");
  for(const item of devices){const device=item as JsonObject;for(const key of ["w","l"])if(typeof device[key]!=="number"||!Number.isFinite(device[key])||device[key]<=0)throw new AcgError("DTCO_EXTRACTION_GEOMETRY","Invalid measured device geometry","parser");}
  for(const key of ["validationSha256","electricalNetlistSha256"])if(typeof proof[key]!=="string"||!/^[a-f0-9]{64}$/.test(proof[key] as string))throw new AcgError("DTCO_EXTRACTION_HASH","Missing physical evidence checksum","parser");
 }
 return data;
}
