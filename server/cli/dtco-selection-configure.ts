import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../app/config.ts";
import { EdaDatabase } from "../app/db/database.ts";
import { makeRepositories } from "../app/db/repositories.ts";
import { SafeProcessRunner } from "../app/process/safeProcess.ts";
import { ToolHealthService } from "../app/tools/health.ts";
import type { ToolConfigurationV1 } from "../../shared/contracts/v1.ts";
const args=process.argv.slice(2);
if(args.includes("--help")){process.stdout.write("tsx server/cli/dtco-selection-configure.ts [--python /usr/bin/python3] [--probe] [--self-test]\n");process.exit(0);}
for(let i=0;i<args.length;i++){if(["--probe","--self-test"].includes(args[i]!))continue;if(args[i]==="--python"&&args[i+1]&&!args[i+1]!.startsWith("--")){i++;continue;}throw new Error("Unknown/incomplete argument: "+args[i]);}
const root=fileURLToPath(new URL("../..",import.meta.url)),python=path.resolve(args.includes("--python")?args[args.indexOf("--python")+1]!:"/usr/bin/python3"),entry=path.join(root,"scripts/dtco/selection.py");
await fs.access(python);await fs.access(entry);
const config=loadConfig(),database=new EdaDatabase(config.databasePath);
try{
 database.migrate();
 if(Number(database.sqlite.prepare("SELECT COUNT(*) count FROM jobs WHERE status IN ('running','queued','validating')").get()?.count))throw new Error("Wait for active jobs before configuring or probing selection tools");
 const repositories=makeRepositories(database);
 const definition:Omit<ToolConfigurationV1,"id"|"revision"|"createdAt"|"updatedAt"|"capturedAt">={toolId:"dtco-selection",moduleId:"dtco",adapterId:"dtco-selection-v1",adapterVersion:"1.0.0",enabled:true,executablePath:null,interpreterPath:python,entryPoint:entry,rootPath:root,workingDirectory:null,timeoutSeconds:600,maxConcurrency:1,environment:{},environmentNames:["PATH"],versionProbeArgv:["--version"]};
 const existing=repositories.tools.active("dtco").find(t=>t.toolId==="dtco-selection");
 const tool=existing&&Object.entries(definition).every(([key,value])=>JSON.stringify(existing[key as keyof ToolConfigurationV1])===JSON.stringify(value))?existing:repositories.tools.save(definition);
 process.stdout.write(JSON.stringify({toolId:tool.toolId,id:tool.id,revision:tool.revision})+"\n");
 const directory=path.join(config.storageRoot,".tool-probes");await fs.mkdir(directory,{recursive:true,mode:0o700});
 const health=new ToolHealthService(repositories.tools,new SafeProcessRunner(),directory);
 for(const operation of ["--probe","--self-test"].filter(flag=>args.includes(flag))){const result=operation==="--probe"?await health.probe(tool):await health.selfTest(tool);process.stdout.write(JSON.stringify(result)+"\n");if(result.status!=="healthy")process.exitCode=1;}
}finally{database.close();}
