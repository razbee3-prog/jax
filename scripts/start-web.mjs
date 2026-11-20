import { cp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
try {
  await cp(new URL("web/public/", root), new URL("web/.next/standalone/web/public/", root), { recursive: true });
  await cp(new URL("web/.next/static/", root), new URL("web/.next/standalone/web/.next/static/", root), { recursive: true });
} catch (error) {
  console.error("Standalone assets unavailable. Run npm run build first.");
  throw error;
}
const child = spawn(process.execPath, [fileURLToPath(new URL("web/.next/standalone/web/server.js", root))], { stdio: "inherit", env: { ...process.env, HOSTNAME: "0.0.0.0" } });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
