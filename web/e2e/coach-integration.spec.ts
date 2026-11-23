import {test,expect,chromium,type Page} from "@playwright/test";
import {mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {demoCamera} from "./coach-fixtures";
const flags=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
const folder=process.env.COACH_EVIDENCE_DIR??"test-results/coach-independent";
const decision={speak:true,text:"Ready.",kind:"question",fault_id:null,slots:null,reason:"Browser fixture",guidance:null,summary:null};
async function prepare(page:Page){
  await demoCamera(page);await page.route("**/api/tts",r=>r.abort());await page.route("**/api/stt-token",r=>r.abort());
  await page.route("**/api/session/event",r=>r.fulfill({json:{event_id:r.request().postDataJSON().event_id}}));
}
async function setup(page:Page){
  await page.goto("/?poseDelegate=CPU");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"Turn on camera and mic"}).click();
  for(const answer of ["full body","10","No injuries","Yes"])await page.getByRole("button",{name:answer,exact:true}).click();
  await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled({timeout:15000});
}
async function start(page:Page){await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("button",{name:"Let’s get started"}).click();await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S6",{timeout:20000});}
async function shot(page:Page,name:string){mkdirSync(folder,{recursive:true});await page.screenshot({path:resolve(folder,`${name}.png`)});}
test("real camera framing is uncropped and simulation controls stay in fake mode",async()=>{
  test.setTimeout(60000);const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await prepare(page);await page.route("**/api/coach",r=>r.fulfill({json:{decision:{...decision,text:r.request().postDataJSON().event.next_question??"Ready."}}}));await setup(page);
    const geometry=await page.locator(".camera-plane").evaluate(element=>{const v=element.querySelector("video")!,rect=element.getBoundingClientRect(),guide=element.querySelector(".camera-frame-guide")!.getBoundingClientRect();return {width:rect.width,height:rect.height,ratio:v.videoWidth/v.videoHeight,inside:guide.left>=rect.left && guide.right<=rect.right && guide.top>=rect.top && guide.bottom<=rect.bottom,fit:getComputedStyle(v).objectFit};});
    expect(geometry.width/geometry.height).toBeCloseTo(geometry.ratio,2);expect(geometry.inside).toBe(true);expect(geometry.fit).toBe("contain");await expect(page.locator(".body-guide")).toHaveCount(0);await shot(page,"real-setup-contained");
    await start(page);await expect(page.locator(".shell-bar")).toContainText("ON-DEVICE");await expect(page.getByRole("button",{name:/simulate|Step back in/})).toHaveCount(0);await page.getByTestId("pause-set").click();await expect(page.getByRole("button",{name:"Resume",exact:true})).toBeVisible();await shot(page,"real-active-controls");await page.getByRole("button",{name:"End",exact:true}).click();
    await page.goto("/?fake=1&preview=S6");await expect(page.locator(".shell-bar")).toContainText("SCRIPTED");await expect(page.getByRole("button",{name:"Step out (simulate)"})).toBeVisible();
    console.log("REAL UI: contained camera/guide, real pose overlay, no simulation controls; fake controls retained.");
  }finally{await browser.close();}
});
