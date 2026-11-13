import fs from "node:fs/promises";
import path from "node:path";
import type { ToolConfigurationSnapshotV1 } from "../../../shared/contracts/v1.ts";
import { object, projectRoot, type Engine, type Preset } from "./types.ts";
export async function presetCatalog(configuration: ToolConfigurationSnapshotV1, engine: Engine): Promise<Preset[]> {
  const root = await projectRoot(configuration, engine); const result: Preset[] = [];
  const baseFile = path.join(root, "config/config.json");
  const base = await fs.readFile(baseFile, "utf8").then(x => object(JSON.parse(x))).catch(() => null);
  if (base) {
    const technology = String(base.tech ?? "asap7");
    const candidates = ["config/rules_" + technology + ".json", "config/rules_" + technology.replace(/_cfet$/, "") + ".json", "config/rules_cfet.json"];
    for (const rulesFilename of candidates) if (await fs.stat(path.join(root,rulesFilename)).then(x => x.isFile()).catch(() => false)) {
      result.push({ id: engine+":default", label: "Repository default / " + technology, engine, technology, trackNum: Number(base.track_num ?? 9),
        numRows: engine === "mr" ? Number(base.num_rows ?? 1) : engine === "dr" && base.enable_double_row === true ? 2 : 1,
        modes:["placement","routed"],configFilename:"config/config.json",rulesFilename,description:"Repository default configuration; research checks are not foundry signoff." }); break;
    }
  }
  for (const technology of ["gf180", "sky130", "asap7", "freepdk45", "freepdk15"]) {
    const directory = path.join(root, "config", technology);
    const files = await fs.readdir(directory).catch(() => [] as string[]);
    const rulesFilename = "config/" + technology + "/rules_" + technology + ".json";
    const fallbackRules = "config/rules_" + technology + ".json";
    const rules = await fs.stat(path.join(root, rulesFilename)).then(x => x.isFile()).catch(() => false) ? rulesFilename : fallbackRules;
    if (!(await fs.stat(path.join(root, rules)).then(x => x.isFile()).catch(() => false))) continue;
    for (const filename of files.filter(x => /^config(?:_[A-Za-z0-9_]+)?\.json$/.test(x)).sort()) {
      const config = object(JSON.parse(await fs.readFile(path.join(directory, filename), "utf8")));
      const trackNum = typeof config.track_num === "number" ? config.track_num : 9;
      const rows = engine === "mr" ? Number(config.num_rows ?? 1) : engine === "dr" && config.enable_double_row === true ? 2 : 1;
      result.push({ id: engine + ":" + technology + ":" + filename.replace(/\.json$/, ""), engine, technology,
        label: technology.toUpperCase() + " / " + filename, trackNum, numRows: rows,
        modes: ["placement", "routed"],
        configFilename: "config/" + technology + "/" + filename, rulesFilename: rules,
        description: "Repository configuration preset; research output is not foundry signoff." });
    }
  }
  return result;
}
export async function loadPreset(configuration: ToolConfigurationSnapshotV1, engine: Engine, id: string) {
  const preset = (await presetCatalog(configuration, engine)).find(x => x.id === id);
  if (!preset) throw new Error("Unknown preset for selected engine: " + id);
  const root = await projectRoot(configuration, engine);
  return { preset, config: object(JSON.parse(await fs.readFile(path.join(root, preset.configFilename), "utf8"))),
    rules: object(JSON.parse(await fs.readFile(path.join(root, preset.rulesFilename), "utf8"))) };
}
