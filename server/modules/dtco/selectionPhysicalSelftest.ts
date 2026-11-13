import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ToolConfigurationV1 } from "../../../shared/contracts/v1.ts";
import type { ToolRepository } from "../../app/db/repositories.ts";
import type { SafeProcessRunner } from "../../app/process/safeProcess.ts";
import { buildSelectionSelfTest } from "./selectionSelftest.ts";
import { physicalConfiguration, mergePhysicalResult } from "./selectionPhysical.ts";
import { selectionExamples, validateSelectionResult } from "./selection.ts";
export async function buildSelectionPhysicalSelfTest(_tool:ToolConfigurationV1,directory:string,tools:ToolRepository,runner:SafeProcessRunner){
 const configuration=await physicalConfiguration(tools,false),timing=tools.active("dtco").find(t=>t.toolId==="dtco-selection");
 if(!timing)throw new Error("Selection timing helper must be configured for physical self-test");
 const specification=await buildSelectionSelfTest(timing,directory,tools);
 const result=await runner.run("physical-timing-selftest:"+randomUUID(),{tool:timing,argv:specification.argv,cwd:directory,allowedCwdRoot:directory,timeoutSeconds:45});
 if(result.exitCode!==0||result.timedOut||result.outputLimitExceeded)throw new Error("Physical self-test native timing fixture failed");
 await specification.verifyOutput();
 await fs.writeFile(path.join(directory,"input/selection-physical-runtime.json"),JSON.stringify(configuration.runtime));
 return {argv:["--self-test","--workspace",directory],requiredFiles:["output/selection/physical-result.json","output/selection/eval-0000/physical/routed.gds","output/selection/eval-0000/physical/routed.def"],verifyOutput:async()=>{
  const request=structuredClone(selectionExamples[1]!.request);request.maxEvaluations=1;
  const timingResult=validateSelectionResult(JSON.parse(await fs.readFile(path.join(directory,"output/selection/result.json"),"utf8")),request);
  const completed=await mergePhysicalResult(directory,timingResult,configuration.runtime);if(completed.evaluations.length!==1||completed.evaluations[0]?.physical?.status!=="succeeded")throw new Error("Physical native route/GDS self-test incomplete");
 }};
}
