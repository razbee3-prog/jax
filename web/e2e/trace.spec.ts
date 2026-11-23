import {test,expect,chromium} from "@playwright/test";
import {mockSessionEvents} from "./telemetry-fixtures";
for(const pass of [true,false])test(`summary displays the server audit ${pass ? "PASS":"FAIL with missing events"}`,async()=>{
  const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}),page=await browser.newPage();
  try{
    await mockSessionEvents(page,r=>{const e=r.request().postDataJSON();return r.fulfill({json:{event_id:e.event_id,...(e.type==="session.end" ? {run_id:e.event_id,receipt:"fixture"}:{})}});});
    await page.route("**/api/session/audit",r=>{const body=r.request().postDataJSON();return r.fulfill({json:{thread_id:body.thread_id,pass,expected:body.ledger.length,recorded:body.ledger.length-(pass ? 0:1),missing:pass ? []:[body.ledger[0]]}});});
    await page.goto("/?fake=1");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"End",exact:true}).click();await expect(page.getByTestId("trace-check")).toContainText(pass ? /Trace check: \d+ of \d+ recorded/:"Trace check failed",{timeout:10000});if(!pass){await expect(page.getByTestId("trace-check")).toHaveCSS("color","rgb(255, 133, 133)");await page.getByText(/Missing events \(/).click();await expect(page.locator("details")).toContainText("session.start");}
  }finally{await browser.close();}
});
