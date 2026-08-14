#!/usr/bin/env node

/**
 * Test-only executable used by integration and browser tests.
 *
 * The adapter argv is deliberately left untouched. Behaviour is selected by
 * allow-listed environment variables on the test ToolConfiguration:
 *   FAKE_EDA_TOOL=yosys|opensta|iverilog|vvp|generic
 *   FAKE_EDA_MODE=success|fail|timeout|partial|cancel
 *
 * Production rejects paths below test/fixtures/fake-tools unless
 * NODE_ENV=test. This program therefore models a process boundary; it is not
 * a mock API and it is never a production result source.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const inferredTool = argv.includes("-ql") && argv.some((value) => value.endsWith(".ys"))
  ? "yosys"
  : argv.length === 1 && argv[0].endsWith(".tcl")
    ? "opensta"
    : argv.includes("-g2012")
      ? "iverilog"
      : argv.length === 1 && argv[0].endsWith(".vvp")
        ? "vvp"
        : "generic";
const tool = process.env.FAKE_EDA_TOOL || inferredTool;
const mode = process.env.FAKE_EDA_MODE || "success";

function ensureParent(filename) {
  fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
}

function write(filename, contents) {
  ensureParent(filename);
  fs.writeFileSync(filename, contents);
}

function option(name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function versionProbe() {
  return argv.some((value) => value === "--version" || value === "-version" || value === "version" || value === "-V");
}

if (versionProbe()) {
  process.stdout.write(`${tool} fake-eda-tool 1.0.0-test\n`);
  process.exit(0);
}

if (mode === "fail") {
  process.stderr.write(`${tool}: requested test failure\n`);
  process.exit(17);
}

if (argv[0] === "run" && argv.includes("--flow")) {
  const parserFlow = option("--flow", "openroad");
  process.stdout.write(`${JSON.stringify({
    flow: parserFlow,
    design: "fixture-ppa",
    normalized: { area_um2: 123.5, setup_wns_ns: 0.12, hold_wns_ns: 0.04, power_mw: 1.5 },
    source_bundle: { flow: parserFlow, fixture: true },
  })}\n`);
  process.exit(0);
}

if (mode === "timeout" || mode === "cancel") {
  fs.mkdirSync("output", { recursive: true });
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: false,
    stdio: "ignore",
  });
  write("output/fake-child.pid", `${child.pid}\n`);
  process.stdout.write(`${tool}: long-running pid=${process.pid} child=${child.pid}\n`);
  const stop = () => {
    process.stdout.write(`${tool}: received termination\n`);
    process.exit(143);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  setInterval(() => process.stdout.write(`${tool}: heartbeat\n`), 250);
} else {
  const output = option("--output", "output/fake-result.json");
  if (mode === "partial") {
    write(output, "{\"schemaVersion\":\"fake.eda.v1\",\"status\":");
    process.stdout.write(`${tool}: partial output emitted\n`);
    process.exit(0);
  }

  if (tool === "iverilog") {
    write(option("-o", "work/simulation.vvp"), "fake vvp image\n");
  } else if (tool === "vvp") {
    process.stdout.write("PASS: fake RTL simulation\n");
  } else if (tool === "yosys") {
    const script = argv.at(-1) || "";
    if (!script.endsWith(".ys")) {
      process.stderr.write("yosys fake expected a .ys script\n");
      process.exit(2);
    }
    write("logs/yosys.log", "Yosys fake synthesis completed\n");
    write("output/mapped.v", "module top(input clk, output q); assign q = clk; endmodule\n");
    write("output/mapped.json", JSON.stringify({ modules: { top: { cells: { u0: { type: "INVX1" } } } } }, null, 2));
    write("output/yosys-stat.json", JSON.stringify({ modules: { top: { area: 1.25 } } }, null, 2));
  } else if (tool === "opensta") {
    if (!(argv.at(-1) || "").endsWith(".tcl")) {
      process.stderr.write("opensta fake expected a generated .tcl script\n");
      process.exit(2);
    }
    write("output/setup-wns.rpt", "worst slack 0.40\n");
    write("output/hold-wns.rpt", "worst slack 0.08\n");
    write("output/setup-tns.rpt", "tns 0.00\n");
    write("output/hold-tns.rpt", "tns 0.00\n");
    write("output/setup-checks.rpt", "setup checks: met\n");
    write("output/hold-checks.rpt", "hold checks: met\n");
    write("output/min-period.rpt", "minimum period 9.60\n");
    process.stdout.write("OpenSTA fake timing completed\n");
  }

  write(output, `${JSON.stringify({ schemaVersion: "fake.eda.v1", tool, status: "succeeded", argv }, null, 2)}\n`);
  process.stdout.write(`${tool}: completed\n`);
  process.exit(0);
}
