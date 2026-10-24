import fs from "node:fs/promises";

export interface LibertyCellData {
  areaUm2: number | null;
  leakageMw: number | null;
  leakageSource: "cell_leakage_power" | "conditional_average" | "missing";
}

export interface LibertyData {
  cells: Map<string, LibertyCellData>;
  leakageUnitToMw: number | null;
}

function matchingBrace(text: string, opening: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = opening; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("unbalanced Liberty braces");
}

function unitToMw(text: string): number | null {
  const match = /leakage_power_unit\s*:\s*"?\s*([0-9.eE+-]+)\s*(pW|nW|uW|mW|W)\s*"?/i.exec(text);
  if (!match) return null;
  const unit = match[2]?.toLowerCase();
  const scale = unit ? ({ pw: 1e-9, nw: 1e-6, uw: 1e-3, mw: 1, w: 1e3 } as Record<string, number>)[unit] : undefined;
  if (scale === undefined) return null;
  const factor = Number(match[1]) * scale;
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

export async function parseLiberty(filename: string): Promise<LibertyData> {
  const text = await fs.readFile(filename, "utf8");
  const leakageUnitToMw = unitToMw(text);
  const cells = new Map<string, LibertyCellData>();
  const pattern = /^\s*cell\s*\(\s*"?([^"\)\s]+)"?\s*\)\s*\{/gm;
  for (const match of text.matchAll(pattern)) {
    const opening = text.indexOf("{", match.index);
    const body = text.slice(opening + 1, matchingBrace(text, opening));
    const areaMatch = /\barea\s*:\s*([0-9.eE+-]+)\s*;/.exec(body);
    const directMatch = /\bcell_leakage_power\s*:\s*([0-9.eE+-]+)\s*;/.exec(body);
    let rawLeakage = directMatch ? Number(directMatch[1]) : null;
    let leakageSource: LibertyCellData["leakageSource"] = directMatch ? "cell_leakage_power" : "missing";
    if (rawLeakage === null) {
      const conditional = [...body.matchAll(/leakage_power\s*\(\s*\)\s*\{[^{}]*?\bvalue\s*:\s*"?([0-9.eE+-]+)"?\s*;[^{}]*?\}/gs)]
        .map((item) => Number(item[1]))
        .filter(Number.isFinite);
      if (conditional.length > 0) {
        rawLeakage = conditional.reduce((sum, value) => sum + value, 0) / conditional.length;
        leakageSource = "conditional_average";
      }
    }
    const areaUm2 = areaMatch ? Number(areaMatch[1]) : null;
    cells.set(match[1], {
      areaUm2: areaUm2 !== null && Number.isFinite(areaUm2) ? areaUm2 : null,
      leakageMw: rawLeakage !== null && leakageUnitToMw !== null ? rawLeakage * leakageUnitToMw : null,
      leakageSource,
    });
  }
  if (cells.size === 0) throw new Error(`no Liberty cells found in ${filename}`);
  return { cells, leakageUnitToMw };
}
