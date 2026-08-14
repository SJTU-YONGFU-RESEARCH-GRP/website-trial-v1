import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npmCommand, ["run", "dev"], { stdio: "inherit", env: process.env, shell: false }),
  spawn(npmCommand, ["run", "dev:server"], {
    stdio: "inherit",
    env: { ...process.env, EDA_PORT: process.env.EDA_PORT || "3001" },
    shell: false,
  }),
  spawn(npmCommand, ["run", "dev:worker"], { stdio: "inherit", env: process.env, shell: false }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => stop(signal));
for (const child of children) {
  child.once("exit", (code, signal) => {
    if (!stopping && (code !== 0 || signal)) {
      stop("SIGTERM");
      process.exitCode = code ?? 1;
    }
  });
}

await Promise.all(children.map((child) => new Promise((resolve) => child.once("close", resolve))));
