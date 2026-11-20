import { test, expect, chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
test("fake webcam counts two Romanian deadlifts", async () => {
  test.setTimeout(90000);
  mkdirSync("test-results", { recursive: true });
  const clip = resolve("test-results/rdl.y4m");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", "web/public/videos/rdl.mp4", "-vf", "tpad=start_duration=3:start_mode=clone,scale=640:-2", "-pix_fmt", "yuv420p", clip]);
  const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-file-for-fake-video-capture=" + clip, "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    const context = await browser.newContext({ permissions: ["camera"], viewport: { width:390,height:844 } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/lab");
    await page.getByLabel("Delegate", { exact: true }).selectOption("CPU");
    await page.getByRole("button", { name:"Start camera",exact:true }).click();
    await expect(page.getByTestId("rep-count")).toHaveText("2", { timeout: 20000 });
    await page.screenshot({path:"test-results/fake-camera-count.png"});
    await page.getByRole("button", { name:"Stop",exact:true }).click();
    await expect(page.getByRole("status").filter({hasText:/^Stopped$/})).toBeVisible();
    await expect(page.getByTestId("rep-count")).toHaveText("2");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name:"Export JSON",exact:true }).click();
    const exported = await download;
    expect(exported.suggestedFilename()).toBe("rdl.json");
    const fixture = JSON.parse(await page.getByLabel("Fixture JSON").inputValue());
    expect(fixture.frames.length).toBeGreaterThan(100);
    expect(fixture.expected).toBe(2);
    expect(fixture.width).toBeGreaterThan(0); expect(fixture.height).toBeGreaterThan(0);
  } finally { await browser.close(); rmSync(clip, { force: true }); }
});
