import type { JobRecordV1 } from "../../../shared/contracts/v1";
import type { SelectionEvaluation, SelectionRequest } from "../../../shared/contracts/dtcoSelection";

export function selectionActive(status: string): boolean {
  return ["created", "queued", "validating", "preparing", "running", "cancel_requested", "cancelling"].includes(status);
}
export function selectionMetric(value: number | null | undefined, unit = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unknown";
  const formatted = value !== 0 && Math.abs(value) < .001 ? value.toPrecision(4) : value.toFixed(3);
  return `${formatted}${unit ? ` ${unit}` : ""}`;
}
export function selectionFeasible(row: SelectionEvaluation): boolean {
  const passes = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  return row.feasible === true && row.status === "feasible" && passes(row.maxSlackNs) && passes(row.minSlackNs)
    && (row.timingKind === "combinational" || row.timingKind === "sequential" && passes(row.setupSlackNs) && passes(row.holdSlackNs));
}
export function toggleSelectionDrive(request: SelectionRequest, id: string, drive: number): SelectionRequest {
  return { ...request, circuit: { ...request.circuit, instances: request.circuit.instances.map(instance => {
    if (instance.id !== id) return instance;
    const allowedDrives = instance.allowedDrives.includes(drive) ? instance.allowedDrives.filter(item => item !== drive) : [...instance.allowedDrives, drive].sort((a,b) => a-b);
    if (!allowedDrives.length) return instance;
    return { ...instance, allowedDrives, initialDrive: allowedDrives.includes(instance.initialDrive) ? instance.initialDrive : allowedDrives[0] };
  }) } };
}
export function validateSelection(request: SelectionRequest): string | null {
  if (!request.name.trim() || request.name.length > 120) return "Selection name must contain 1 to 120 characters.";
  const validName = (value: unknown) => typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) && value.length <= 64;
  const circuit = request.circuit;
  if (!validName(circuit.name)) return "Circuit names must be Verilog identifiers up to 64 characters.";
  if (circuit.inputs.length > 256 || circuit.outputs.length > 256 || circuit.instances.length > 256) return "Circuit limits: 256 instances and 256 input or output ports.";
  if (![...circuit.inputs,...circuit.outputs,...(circuit.clock ? [circuit.clock] : [])].every(validName)) return "Ports must be Verilog identifiers up to 64 characters.";
  if (new Set(circuit.inputs).size !== circuit.inputs.length || new Set(circuit.outputs).size !== circuit.outputs.length) return "Primary ports must be unique.";
  if (circuit.inputs.some(port => circuit.outputs.includes(port)) || circuit.clock && circuit.outputs.includes(circuit.clock)) return "Inputs, outputs and clock must have valid port mapping.";
  if (!Number.isInteger(request.maxEvaluations) || request.maxEvaluations < 1 || request.maxEvaluations > 256) return "Evaluation budget must be an integer from 1 to 256.";
  if (!request.circuit?.instances?.length || !request.circuit.outputs?.length) return "A circuit requires outputs and instances.";
  const ids = new Set<string>();
  for (const row of request.circuit.instances) {
    if (!validName(row.id) || ids.has(row.id)) return "Instance IDs must be unique Verilog identifiers up to 64 characters.";
    ids.add(row.id);
    if (!["INV", "NAND", "NOR", "AND", "DFF"].includes(row.family)) return `Unsupported family for ${row.id}.`;
    if (!row.allowedDrives?.length || row.allowedDrives.length > 3 || new Set(row.allowedDrives).size !== row.allowedDrives.length || row.allowedDrives.some(drive => ![1,2,4].includes(drive)) || !row.allowedDrives.includes(row.initialDrive)) return `Choose unique legal drives and a baseline for ${row.id}.`;
    if (!Array.isArray(row.inputs) || row.inputs.length !== (["NAND","NOR","AND"].includes(row.family) ? 2 : 1) || ![...row.inputs,row.output].every(validName)) return `Invalid connections for ${row.id}.`;
    if (row.locked !== undefined && typeof row.locked !== "boolean") return `Lock must be a boolean for ${row.id}.`;
  }
  if (request.circuit.instances.some(row => row.family === "DFF") && !request.circuit.clock) return "Sequential circuits require a clock port.";
  if (circuit.clock && !circuit.instances.some(row => row.family === "DFF")) return "Clock requires sequential instances.";
  if (circuit.clock && circuit.instances.some(row => row.inputs.includes(circuit.clock!))) return "Clock connects implicitly to DFF clock pins, not data pins.";
  const drivers = new Map<string, typeof circuit.instances[number]>();
  for (const row of circuit.instances) { if (circuit.inputs.includes(row.output) || row.output === circuit.clock || drivers.has(row.output)) return `Multiple drivers for ${row.output}.`; drivers.set(row.output,row); }
  for (const net of [...circuit.instances.flatMap(row => row.inputs),...circuit.outputs]) if (!circuit.inputs.includes(net) && !drivers.has(net)) return `Undriven net: ${net}.`;
  const netNames = new Set([...circuit.inputs,...circuit.outputs,...circuit.instances.flatMap(row => [...row.inputs,row.output]),...(circuit.clock ? [circuit.clock] : [])]);
  if (circuit.instances.some(row => netNames.has(row.id))) return "Instance IDs cannot collide with net names.";
  const visiting = new Set<string>(), visited = new Set<string>();
  const cyclic = (net: string): boolean => { const row = drivers.get(net); if (!row || row.family === "DFF" || visited.has(net)) return false; if (visiting.has(net)) return true; visiting.add(net); if (row.inputs.some(cyclic)) return true; visiting.delete(net); visited.add(net); return false; };
  if (circuit.instances.some(row => cyclic(row.output))) return "Combinational cycles are not supported.";
  const reached = new Set<string>();
  const reach = (net: string) => { const row = drivers.get(net); if (!row || reached.has(row.id)) return; reached.add(row.id); row.inputs.forEach(reach); };
  circuit.outputs.forEach(reach);
  if (reached.size !== circuit.instances.length) return "Every instance must contribute to a primary output.";
  const bounds = { clockPeriodNs: 1e4, inputDelayNs: 1e4, outputDelayNs: 1e4, inputSlewNs: 4, outputLoadPf: 1, clockUncertaintyNs: 1e4, holdUncertaintyNs: 1e4 };
  for (const [key,max] of Object.entries(bounds)) { const value = request.constraints[key as keyof typeof bounds]; if (!Number.isFinite(value) || value < 0 || value > max || (["clockPeriodNs", "inputSlewNs"].includes(key) && value === 0)) return `Enter a valid ${key}, at most ${max} (period and slew must be positive).`; }
  return null;
}
export function parseSelectionCircuit(json: string): SelectionRequest["circuit"] {
  if (new TextEncoder().encode(json).length > 262144) throw new Error("Circuit JSON must be at most 256 KiB.");
  const value = JSON.parse(json) as SelectionRequest["circuit"];
  if (!value || typeof value !== "object" || typeof value.name !== "string" || !Array.isArray(value.inputs) || !Array.isArray(value.outputs) || !Array.isArray(value.instances) || !(value.clock === null || typeof value.clock === "string")) throw new Error("JSON must contain a circuit with name, inputs, outputs, clock and instances.");
  if (![...value.inputs,...value.outputs].every(port => typeof port === "string") || value.instances.some(row => !row || typeof row.id !== "string" || !Array.isArray(row.inputs) || row.inputs.some(port => typeof port !== "string") || typeof row.output !== "string" || !Array.isArray(row.allowedDrives))) throw new Error("Circuit ports and instance connections must be strings; every instance needs allowedDrives.");
  return value;
}

export function selectionName(job: JobRecordV1): string {
  const snapshot = job.parameters.dtcoSelectionSnapshot as { request?: { name?: string } } | undefined;
  return snapshot?.request?.name ?? job.id;
}
