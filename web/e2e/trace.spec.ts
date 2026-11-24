import {test,expect,chromium} from "@playwright/test";
import {mockSessionEvents} from "./telemetry-fixtures";
for(const mode of ["pass","fail","error"])test(`summary displays the server audit ${mode}`,async()=>{
  const pass=mode==="pass";
  const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  try{
    await mockSessionEvents(page,r=>{const e=r.request().postDataJSON();return r.fulfill({json:{event_id:e.event_id,...(e.type==="session.end" ? {run_id:e.event_id,receipt:"fixture"}:{})}});});
    await page.route("**/api/session/audit",r=>{const body=r.request().postDataJSON();return mode==="error" ? r.fulfill({status:502,json:{error:"Unavailable"}}):r.fulfill({json:{thread_id:body.thread_id,pass,expected:body.ledger.length,recorded:body.ledger.length-(pass ? 0:1),missing:pass ? []:[body.ledger[0]]}});});
    await page.goto("/?fake=1");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"End",exact:true}).click();await expect(page.getByTestId("trace-check")).toContainText(mode==="error" ? "Trace check unavailable.":pass ? /Trace check: \d+ of \d+ recorded/:"Trace check failed",{timeout:10000});if(!pass)await expect(page.getByTestId("trace-check")).toHaveCSS("color","rgb(255, 133, 133)");if(mode==="fail"){await page.getByText(/Missing events \(/).click();await expect(page.locator("details")).toContainText("session.start");}if(mode==="error")await expect(page.locator("details")).toHaveCount(0);
    if(mode==="error")await page.screenshot({path:"test-results/trace-unavailable.png"});
  }finally{await browser.close();}
});
test("page hide and visibility hide beacon the unacknowledged session ledger",async()=>{
  const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  try{
    await page.addInitScript(()=>{const root=window as typeof window & {traceBeacons:Promise<{url:string;events:{type:string;thread_id:string}[]}>[]};root.traceBeacons=[];Object.defineProperty(navigator,"sendBeacon",{value:(url:string,data:Blob)=>{root.traceBeacons.push(data.text().then(text=>({url,...JSON.parse(text)})));return true;}});});
    await page.route("**/api/telemetry",r=>r.fulfill({status:503,json:{error:"offline"}}));await page.goto("/?fake=1");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S1");
    const beacons=await page.evaluate(async()=>{window.dispatchEvent(new PageTransitionEvent("pagehide"));Object.defineProperty(document,"visibilityState",{get:()=>"hidden"});document.dispatchEvent(new Event("visibilitychange"));return Promise.all((window as typeof window & {traceBeacons:Promise<{url:string;events:{type:string;thread_id:string}[]}>[]}).traceBeacons);});
    expect(beacons).toHaveLength(2);expect(beacons.every(b=>b.url==="/api/telemetry" && b.events.some(e=>e.type==="session.start"))).toBe(true);expect(new Set(beacons.flatMap(b=>b.events.map(e=>e.thread_id))).size).toBe(1);
  }finally{await browser.close();}
});
