// Lance le serveur (rechargé à chaque modification) et l'interface Vite ensemble.
import { spawn } from "node:child_process";

const procs = [
  spawn(process.execPath, ["--watch", "--env-file-if-exists=.env", "server/index.js"], { stdio: "inherit" }),
  spawn("npx", ["vite"], { stdio: "inherit", shell: process.platform === "win32" }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", (code) => { stop(); process.exit(code ?? 0); }));
