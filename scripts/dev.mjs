import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error("Node.js 24 krävs. Kör med Node 24 eller: npx --package=node@24 node scripts/dev.mjs");
  process.exit(1);
}
if (existsSync(".env")) process.loadEnvFile(".env");
const processes = [];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of processes) child.kill();
  process.exitCode = code;
}
for (const [entry, args] of [
  ["node_modules/eve/bin/eve.js", ["dev", "--resume", "--no-ui", "--no-default-extensions", "--host", "127.0.0.1", "--port", "2002"]],
  ["node_modules/vite/bin/vite.js", ["--host", "127.0.0.1", "--port", "5173", "--strictPort"]],
]) {
  const child = spawn(process.execPath, [entry, ...args], { stdio: "inherit", env: process.env });
  processes.push(child);
  child.on("error", (error) => { console.error(error.message); close(1); });
  child.on("exit", (code) => close(code ?? 1));
}
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
