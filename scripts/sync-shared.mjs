import { cp, readdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = fileURLToPath(new URL("../shared/", import.meta.url));
const target = fileURLToPath(new URL("../agent/shared/", import.meta.url));
async function snapshot(dir) {
  const result = {};
  async function walk(path, prefix = "") {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) await walk(path + "/" + entry.name, relative + "/");
      else result[relative] = (await readFile(path + "/" + entry.name)).toString("base64");
    }
  }
  await walk(dir);
  return JSON.stringify(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
if (process.argv.includes("--check")) {
  try {
    if (await snapshot(source) !== await snapshot(target)) throw new Error("different");
    console.log("Shared copies match.");
  } catch { console.error("Shared copies differ. Run npm run sync:shared."); process.exitCode = 1; }
} else {
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
  console.log("Shared files synced.");
}
