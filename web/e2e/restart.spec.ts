import {mockSessionEvents,observeSessionEvents} from "./telemetry-fixtures";
import {test,expect,chromium} from "@playwright/test";
const flags=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
test("restart waits for the final coach turn and completed trace audit",async()=>{
  const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true}),events:{type:string;event_id:string}[]=[];
  let releaseSummary!:()=>void,releaseAudit!:()=>void;const summary=new Promise<void>(r=>{releaseSummary=r;}),audit=new Promise<void>(r=>{releaseAudit=r;});let auditStarted=false;
  try{
    await page.route("**/api/tts",r=>r.abort());observeSessionEvents(page,events);await mockSessionEvents(page,r=>{const e=r.request().postDataJSON();return r.fulfill({json:{event_id:e.event_id,...(e.type==="session.end" ? {run_id:e.event_id,receipt:"fixture"}:{})}});});
    await page.route("**/api/coach",async r=>{await summary;return r.fulfill({json:{decision:{speak:false,text:"",kind:"silence",fault_id:null,slots:null,guidance:null,summary:null,reason:"Test"}}});});
    await page.route("**/api/session/audit",async r=>{auditStarted=true;await audit;const body=r.request().postDataJSON();return r.fulfill({json:{pass:true,thread_id:body.thread_id,expected:body.ledger.length,recorded:body.ledger.length,missing:[]}});});
    await page.goto("/");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"End",exact:true}).click();
    const restart=page.getByRole("button",{name:"Start another workout"});await expect(restart).toBeDisabled();expect(events.some(e=>e.type==="session.end")).toBe(false);
    await expect(page.locator(".shell-screen")).toHaveCount(1);await expect(page.locator(".screen-S8")).toHaveCSS("opacity","1");await page.screenshot({path:"test-results/restart-finalizing.png"});releaseSummary();await expect.poll(()=>auditStarted).toBe(true);await expect(restart).toBeDisabled();expect(events.filter(e=>e.type==="session.end")).toHaveLength(1);
    releaseAudit();await expect(restart).toBeEnabled();await restart.click();await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S0");
  }finally{releaseSummary();releaseAudit();await browser.close();}
});
for(const fake of [false,true])test(`restart preserves ${fake ? "fake":"live"} mode`,async()=>{
  const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  try{
    await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>new MediaStream();});
    await page.route("**/api/tts",r=>r.abort());await page.route("**/api/stt-token",r=>r.abort());await mockSessionEvents(page,r=>r.fulfill({json:{event_id:r.request().postDataJSON().event_id}}));await page.route("**/api/coach",r=>r.fulfill({json:{decision:{speak:false,text:"",kind:"silence",fault_id:null,slots:null,guidance:null,summary:null,reason:"Test"}}}));
    await page.goto(fake ? "/?fake=1&preview=S8":"/?poseDelegate=CPU");
    if(!fake){await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"Turn on camera and mic"}).click();await page.getByRole("button",{name:"End",exact:true}).click();}
    await page.getByRole("button",{name:fake ? "Start another preview":"Start another workout"}).click();
    await expect.poll(()=>new URL(page.url()).searchParams.get("fake")).toBe(fake ? "1":null);await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S0");await expect(page.getByRole("link",{name:fake ? "Scripted preview · no camera or agent":"Try a scripted session",exact:true})).toBeVisible();
  }finally{await browser.close();}
});
