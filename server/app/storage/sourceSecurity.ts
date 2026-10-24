import path from "node:path";
import { normalizeRelativePath } from "./storage.ts";

export const MAX_ACTIVE_SOURCE_TEXT_BYTES = 16 * 1024 * 1024;

export class SourceSecurityError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

/** Validate active Verilog/SystemVerilog text before any compiler sees it. */
export function validateHdlSource(relativePath: string, source: string, availablePaths: ReadonlySet<string>): string[] {
  if (/\$(?:system|fopen|fclose|fread|fwrite|fdisplay|fmonitor|readmemb|readmemh|writememb|writememh|dumpfile|dumpvars)\s*\(|\bimport\s+["']DPI|\bexport\s+["']DPI/i.test(source)) {
    throw new SourceSecurityError("HDL_EXTERNAL_PRIMITIVE", `${relativePath} uses a host-process, host-file, waveform-dump, or DPI primitive that is forbidden`);
  }
  const dependencies: string[] = [];
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, " ")).replace(/\/\/[^\r\n]*/g, "");
  const expression = /`include\b([^\r\n]*)/gi;
  for (const match of withoutComments.matchAll(expression)) {
    const line = withoutComments.slice(0, match.index).split(/\r?\n/).length;
    const quoted = /^\s*"([^"]+)"\s*$/.exec(match[1]);
    if (!quoted) throw new SourceSecurityError("HDL_INCLUDE_UNSUPPORTED", `${relativePath}:${line}: include target must be a literal quoted relative path`);
    const target = quoted[1].replaceAll("\\", "/");
    if (path.posix.isAbsolute(target) || target.startsWith("~") || /^[A-Za-z]:\//.test(target) || target.split("/").includes("..")) {
      throw new SourceSecurityError("HDL_INCLUDE_ESCAPE", `${relativePath}:${line}: include target must stay inside the uploaded input tree`);
    }
    let resolved: string;
    try { resolved = normalizeRelativePath(path.posix.join(path.posix.dirname(relativePath), target)); }
    catch { throw new SourceSecurityError("HDL_INCLUDE_ESCAPE", `${relativePath}:${line}: include target is unsafe`); }
    if (!availablePaths.has(resolved)) throw new SourceSecurityError("HDL_INCLUDE_UNRESOLVED", `${relativePath}:${line}: include target ${target} was not uploaded`);
    dependencies.push(resolved);
  }
  return dependencies;
}
