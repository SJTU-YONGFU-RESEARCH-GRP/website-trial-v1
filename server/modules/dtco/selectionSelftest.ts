import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
import type { ToolRepository } from "../../app/db/repositories.ts";
import { SELECTION_LIBRARY_PATH, SELECTION_LIBRARY_SHA256, selectionExamples, validateSelectionResult } from "./selection.ts";
export async function buildSelectionSelfTest(_tool:ToolConfigurationV1,directory:string,tools:ToolRepository){
 const sta=tools.active("digital").find(t=>t.toolId==="opensta");if(!sta?.executablePath||sta.interpreterPath)throw new Error("Native OpenSTA must be configured for selection self-test");
 const sha=(value:Buffer)=>createHash("sha256").update(value).digest("hex");
 const library=await fs.readFile(SELECTION_LIBRARY_PATH);if(sha(library)!==SELECTION_LIBRARY_SHA256)throw new Error("Registered Liberty checksum changed");
 const request=structuredClone(selectionExamples[1]!.request);request.maxEvaluations=1;
 await fs.mkdir(path.join(directory,"input"),{recursive:true});
 await fs.writeFile(path.join(directory,"input/selection-request.json"),JSON.stringify(request));
 await fs.writeFile(path.join(directory,"input/selection-library.lib"),library);
 await fs.writeFile(path.join(directory,"input/selection-runtime.json"),JSON.stringify({openstaPath:sta.executablePath,openstaSha256:sha(await fs.readFile(sta.executablePath))}));
 return {argv:["--self-test","--workspace",directory],requiredFiles:["output/selection/result.json"],verifyOutput:async()=>{
  const result=validateSelectionResult(JSON.parse(await fs.readFile(path.join(directory,"output/selection/result.json"),"utf8")),request);
  if(result.status!=="ok"||!result.bestEvaluationId||result.evaluations[0]?.feasible!==true)throw new Error("Native sequential selection self-test produced no feasible measured baseline");
 }};
}
