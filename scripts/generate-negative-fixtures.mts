import { mkdir, writeFile } from "node:fs/promises";
import type { Fixture, Landmark } from "../web/lib/pose/types";
const out = "evals/fixtures/negative";
await mkdir(out, { recursive: true });
for (const name of ["standing-still", "walking-in", "setup-picking-up"]) {
  const frames = Array.from({ length: 181 }, (_, i) => {
    const t = Math.round(i * 1000 / 30);
    const bend = name === "setup-picking-up" ? Math.max(0, 1 - Math.max(0, t - 1500) / 1500) : 0;
    const shift = name === "walking-in" ? -0.4 * Math.max(0, 1-t/3000) : 0;
    const visibility = name === "walking-in" && t < 1500 ? 0.2 : 0.99;
    const points: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5 + shift, y: 0.2, visibility }));
    for (const offset of [0, 1]) {
      const dx = offset * 0.015 + shift;
      for (const [index, x, y] of [[11,0.5-bend*0.22,0.3+bend*0.22],[13,0.5-bend*0.22,0.42+bend*0.23],[15,0.5-bend*0.22,0.55+bend*0.23],[23,0.5,0.5+bend*0.02],[25,0.5,0.7],[27,0.5,0.9],[29,0.51,0.91],[31,0.46,0.91]]) points[index+offset] = { x: +(x+dx).toFixed(6), y: +y.toFixed(6), visibility };
    }
    return { t, landmarks: points };
  });
  const fixture: Fixture = { version: 1, exercise: "rdl", width: 1280, height: 720, source: "synthetic:" + name, expected: 0, frames };
  await writeFile(out + "/" + name + ".json", JSON.stringify(fixture));
  console.log(name + ": " + frames.length + " synthetic frames");
}
