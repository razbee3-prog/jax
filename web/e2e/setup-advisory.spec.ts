import {test,expect,devices} from "@playwright/test";
import {mockSessionEvents} from "./telemetry-fixtures";
test.use({...devices["iPhone 13"],browserName:"webkit"});
test("setup Continue advances in landscape with readiness false and traces that choice",async({page})=>{
  const events:{type:string;data:Record<string,unknown>}[]=[];
  await mockSessionEvents(page,r=>{const event=r.request().postDataJSON();events.push(event);return r.fulfill({json:{event_id:event.event_id}});});
  await page.addInitScript(()=>Object.defineProperty(screen,"orientation",{configurable:true,value:Object.assign(new EventTarget(),{type:"portrait-primary"})}));
  await page.goto("/?fake=1");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).tap();await page.getByRole("button",{name:"Turn on camera and mic"}).tap();
  for(const answer of ["full body","10","No injuries"])await page.getByRole("button",{name:answer,exact:true}).tap();
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+100));await page.getByRole("button",{name:"Yes",exact:true}).tap({force:true});await page.clock.runFor(300);
  await page.evaluate(()=>{Object.assign(screen.orientation,{type:"landscape-primary"});screen.orientation.dispatchEvent(new Event("change"));});
  await expect(page.locator(".shell-stage")).not.toHaveAttribute("inert","");await expect(page.locator(".shell-landscape")).toBeHidden();const next=page.getByRole("button",{name:"Continue",exact:true});await expect(next).toBeEnabled();await next.tap({force:true});await page.clock.runFor(2100);
  await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S4");await expect.poll(()=>events.find(e=>e.type==="setup.pass")?.data).toMatchObject({phase:"continue",readiness_passed:false,ready:false,advisory:true});
});
