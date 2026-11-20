import { chromium } from "playwright";
import { mkdir, rename, writeFile } from "node:fs/promises";
const output = process.env.EVIDENCE_DIR ?? "/home/ubuntu/jax-evidence/m2";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const exercise of process.env.EXERCISE ? process.env.EXERCISE.split(",") : ["rdl", "push-press", "curl", "push-up"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: output, size: { width: 390, height: 844 } } });
    const page = await context.newPage();
    await page.goto((process.env.LAB_URL ?? "http://127.0.0.1:3000") + "/lab");
    await page.getByLabel("Exercise", { exact: true }).selectOption(exercise);
    await page.getByLabel("Delegate", { exact: true }).selectOption("CPU");
    await page.getByRole("button", { name: "Load demo", exact: true }).click();
    await page.locator("video").evaluate(async video => { await new Promise(resolve => video.readyState >= 2 ? resolve() : video.addEventListener("loadeddata", resolve, { once:true })); await video.play(); });
    await page.getByRole("status").filter({ hasText: /^Complete$/ }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(800);
    console.log(exercise + ": live counted " + await page.getByTestId("rep-count").textContent());
    await writeFile(output + "/" + exercise + "-live.json", await page.getByLabel("Fixture JSON").inputValue());
    await page.screenshot({ path: output + "/" + exercise + "-lab.png" });
    const recording = page.video();
    await context.close();
    await rename(await recording.path(), output + "/" + exercise + "-lab.webm");
  }
} finally { await browser.close(); }
