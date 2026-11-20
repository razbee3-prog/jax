import { test, expect } from "@playwright/test";
test("rewinding mid-video starts a new monotonic recording", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/lab");
  await page.getByLabel("Delegate",{exact:true}).selectOption("CPU");
  await page.getByRole("button",{name:"Load demo",exact:true}).click();
  await page.locator("video").evaluate(async v=>{ await (v as HTMLVideoElement).play(); });
  await expect.poll(()=>page.locator("video").evaluate(v=>(v as HTMLVideoElement).currentTime),{timeout:30000}).toBeGreaterThan(2.5);
  await page.locator("video").evaluate(v=>{(v as HTMLVideoElement).currentTime=1;});
  await expect.poll(()=>page.locator("video").evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(1.5);
  await page.getByRole("button",{name:"Stop",exact:true}).click();
  const downloaded=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export JSON",exact:true}).click(); await downloaded;
  const fixture=JSON.parse(await page.getByLabel("Fixture JSON").inputValue());
  expect(fixture.frames.length).toBeGreaterThan(2);
  expect(fixture.frames[0].t).toBeGreaterThanOrEqual(900);
  expect(fixture.frames[0].t).toBeLessThan(2000);
  for(let i=1;i<fixture.frames.length;i++) expect(fixture.frames[i].t).toBeGreaterThan(fixture.frames[i-1].t);
});
