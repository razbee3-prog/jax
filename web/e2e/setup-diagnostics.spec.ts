import {test,expect,devices} from "@playwright/test";
import {mockSessionEvents} from "./telemetry-fixtures";
test.use({...devices["iPhone 13"],viewport:{width:390,height:844},browserName:"webkit"});
test("WebKit simulated setup permits Continue and traces API failures and the S3 to S4 transition",async({page})=>{
  test.setTimeout(90000);const events:{type:string;data:Record<string,unknown>}[]=[];
  await mockSessionEvents(page,r=>{const event=r.request().postDataJSON();events.push(event);return r.fulfill({json:{event_id:event.event_id}});});
  await page.route("**/api/tts",r=>r.fulfill({status:502,json:{error:"Fixture speech outage"}}));await page.route("**/api/stt-token",r=>r.fulfill({status:502,json:{error:"Fixture token outage"}}));
  await page.route("**/api/coach",r=>r.fulfill({json:{decision:{speak:true,text:r.request().postDataJSON().event.next_question??"Ready.",kind:"question",fault_id:null,slots:null,guidance:null,summary:null,reason:"Browser fixture"}}}));
  await page.goto("/?fake=1");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).tap();await page.getByRole("button",{name:"Turn on camera and mic"}).tap();
  await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S2",{timeout:10000});
  for(const answer of ["full body","10","No injuries","Yes"])await page.getByRole("button",{name:answer,exact:true}).tap();
  await page.evaluate(()=>fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"Fixture speech"})}));
  const next=page.getByRole("button",{name:"Continue",exact:true});await expect(next).toBeEnabled({timeout:45000});await next.tap();await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S4");
  await expect.poll(()=>events.some(e=>e.type==="setup.pass" && e.data.phase==="continue")).toBe(true);
  expect(events.some(e=>e.type==="setup.check" && e.data.ready===true)).toBe(true);expect(events.some(e=>e.type==="client.error" && e.data.path==="/api/tts" && e.data.status===502)).toBe(true);
  await page.screenshot({path:"test-results/setup-continue-WebKit-390x844.png"});
});
test("React failures retain their session ledger after the workout subtree unmounts",async({page})=>{
  const events:{type:string;data:Record<string,unknown>}[]=[];
  await mockSessionEvents(page,r=>{const event=r.request().postDataJSON();events.push(event);return r.fulfill({json:{event_id:event.event_id}});});
  await page.addInitScript(()=>{Object.defineProperty(screen,"orientation",{configurable:true,value:Object.assign(new EventTarget(),{type:"portrait-primary"})});});
  await page.goto("/?fake=1&preview=S3");await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled();await expect.poll(()=>events.some(e=>e.type==="setup.check" && e.data.screen==="S3")).toBe(true);
  await page.evaluate(()=>{Object.defineProperty(screen.orientation,"type",{configurable:true,get(){throw new Error("Injected orientation render failure");}});screen.orientation.dispatchEvent(new Event("change"));});
  await expect(page.getByRole("button",{name:"Reload Jax"})).toBeVisible();await expect.poll(()=>events.find(e=>e.type==="client.error" && e.data.phase==="react")?.data).toMatchObject({screen:"S3",error_message:"Injected orientation render failure"});
});
