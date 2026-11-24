import {test,expect,devices,type Page} from "@playwright/test";
import {mockSessionEvents} from "./telemetry-fixtures";
import {mkdirSync} from "node:fs";
test.use({...devices["iPhone 13"],browserName:"webkit"});
const folder=process.env.M9_LAYOUT_EVIDENCE??"test-results/self-view-layout";
async function controlsClear(page:Page){
  const self=page.locator(".shell-self");if(!await self.isVisible())return;
  const controls=page.locator("button,a,input,select,textarea,summary,[role=button]");
  for(const control of await controls.all()){
    if(!await control.isVisible())continue;
    await control.scrollIntoViewIfNeeded();const tile=await self.boundingBox(),box=await control.boundingBox();if(!tile || !box)continue;
    const overlap=Math.min(tile.x+tile.width,box.x+box.width)-Math.max(tile.x,box.x)>0.5 && Math.min(tile.y+tile.height,box.y+box.height)-Math.max(tile.y,box.y)>0.5;
    expect(overlap,`Self-view covers ${await control.getAttribute("aria-label") || await control.textContent()}`).toBe(false);
  }
}
for(const [width,height] of [[390,844],[375,667],[390,664]])test.describe(`${width}x${height}`,()=>{
  test.use({viewport:{width,height},screen:{width,height:height===664 ? 844:height}});
  for(let i=0;i<=8;i++)test(`S${i}: controls stay clear of self-view`,async({page})=>{
    mkdirSync(folder,{recursive:true});await mockSessionEvents(page,r=>r.fulfill({json:{event_id:r.request().postDataJSON().event_id}}));
    await page.goto(`/?fake=1&preview=S${i}`);await expect(page.locator(".shell-screen")).toHaveCSS("opacity","1");
    await controlsClear(page);await page.screenshot({path:`${folder}/${width}x${height}-S${i}.png`});
    if(i===2)for(const [question,answer] of ["full body","10","No injuries"].entries()){
      await page.getByRole("button",{name:answer,exact:true}).tap();await controlsClear(page);await page.screenshot({path:`${folder}/${width}x${height}-S2-question${question+1}.png`});
    }
    if(i===6){await page.getByTestId("pause-set").tap();await expect(page.getByRole("heading",{name:"Paused",exact:true})).toBeVisible();await controlsClear(page);await page.screenshot({path:`${folder}/${width}x${height}-S6-paused.png`});}
    if(![2,3,6].includes(i))await expect(page.locator(".shell-self")).toHaveCount(0);
  });
});
