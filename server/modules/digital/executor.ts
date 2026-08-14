import fs from "node:fs/promises";
import type { JsonObject } from "../../../shared/contracts/v1.js";
import { DigitalAdapterError, runConfiguredProcess, workspacePath, writeUtf8Atomic } from "./helpers.js";
import { resolveHierarchy } from "./hierarchy.js";
import { mapDigitalInputs } from "./inputs.js";
import { parseComputedDigitalResult } from "./parsers/computed.js";
import { parseCompletedDigitalFiles } from "./parsers/import.js";
import { parsedDigitalResult, validateParsedDigitalResult } from "./parsers/result.js";
import { materializeSafeSdc, validateWorkspaceInputs } from "./security.js";
import { generateOpenStaScript, generateYosysScript } from "./scripts.js";
import type { DigitalExecutionContext, DigitalToolId } from "./types.js";

function plannedArgv(context: DigitalExecutionContext): string[] {
  const planned = context.job.plan.steps.find((step) => step.id === context.step.stepKey);
  if (!planned?.process) throw new DigitalAdapterError("DIGITAL_PLAN_PROCESS_MISSING", `${context.step.stepKey} has no frozen process plan`, "internal");
  return planned.process.argv;
}

async function runToolStep(context: DigitalExecutionContext, toolId: DigitalToolId, logName: string): Promise<JsonObject> {
  const result = await runConfiguredProcess(context, toolId, plannedArgv(context));
  await writeUtf8Atomic(workspacePath(context.workspacePath, "logs", logName), `${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}`);
  if (result.exitCode !== 0) throw new DigitalAdapterError("DIGITAL_TOOL_EXIT", `${toolId} exited with code ${result.exitCode}`, "tool_exit");
  return { toolId, exitCode: result.exitCode, log: `logs/${logName}` };
}

export async function executeDigitalStep(context: DigitalExecutionContext): Promise<{ exitCode: number; outputs: JsonObject }> {
  await fs.mkdir(workspacePath(context.workspacePath, "work"), { recursive: true });
  await fs.mkdir(workspacePath(context.workspacePath, "output"), { recursive: true });
  await fs.mkdir(workspacePath(context.workspacePath, "logs"), { recursive: true });
  switch (context.step.stepKey) {
    case "validate-input":
      await validateWorkspaceInputs(context);
      return { exitCode: 0, outputs: { validated: true, fileCount: context.job.inputManifest.fileCount } };
    case "resolve-hierarchy":
      return { exitCode: 0, outputs: { hierarchy: await resolveHierarchy(context) as JsonObject } };
    case "simulation-compile":
      return { exitCode: 0, outputs: await runToolStep(context, "iverilog", "iverilog.log") };
    case "simulation-run":
      return { exitCode: 0, outputs: await runToolStep(context, "vvp", "vvp.log") };
    case "synthesis":
      await generateYosysScript(context);
      return { exitCode: 0, outputs: await runToolStep(context, "yosys", "yosys-process.log") };
    case "timing":
      await materializeSafeSdc(context);
      await generateOpenStaScript(context);
      {
        const outputs = await runToolStep(context, "opensta", "opensta.log");
        const log = await fs.readFile(workspacePath(context.workspacePath, "logs", "opensta.log"), "utf8");
        if (/^(?:%\s*)?Error:/m.test(log)) throw new DigitalAdapterError("DIGITAL_OPENSTA_ERROR", "OpenSTA reported an error despite a zero exit status", "tool_exit");
        return { exitCode: 0, outputs };
      }
    case "normalize": {
      const rows = context.job.operation === "import"
        ? await parseCompletedDigitalFiles(mapDigitalInputs(context.job.inputManifest.files).completedResults.map((file) => workspacePath(context.workspacePath, "input", file.relativePath)))
        : [await parseComputedDigitalResult(context)];
      const title = context.job.operation === "import"
        ? `Imported Digital results (${rows.length})`
        : `${rows[0].design} · ${rows[0].architecture} · ${rows[0].processTechnology}`;
      const result = parsedDigitalResult(rows, title);
      validateParsedDigitalResult(result);
      await writeUtf8Atomic(workspacePath(context.workspacePath, "output", "digital-result.json"), `${JSON.stringify(result, null, 2)}\n`);
      return { exitCode: 0, outputs: { normalizedRows: rows.length, result: "output/digital-result.json" } };
    }
    case "publish": {
      const result = JSON.parse(await fs.readFile(workspacePath(context.workspacePath, "output", "digital-result.json"), "utf8"));
      validateParsedDigitalResult(result);
      return { exitCode: 0, outputs: { validatedForPublication: true } };
    }
    default:
      throw new DigitalAdapterError("DIGITAL_STEP_UNKNOWN", `unsupported Digital step ${context.step.stepKey}`, "internal");
  }
}
