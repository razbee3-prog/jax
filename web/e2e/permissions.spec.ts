import {test,expect,devices} from "@playwright/test";
import {mockSessionEvents} from "./telemetry-fixtures";
test.use({...devices["iPhone 13"],viewport:{width:390,height:844},browserName:"webkit"});
for(const [name,title,blocked] of [
  ["NotAllowedError","Camera or microphone blocked",true],
  ["SecurityError","Camera or microphone blocked",true],
  ["NotReadableError","Camera or microphone is busy",false],
  ["OverconstrainedError","Camera settings unavailable",false]
] as const){
  test(`capture failure ${name} has accurate help and traced diagnostics`,async({page})=>{
    const events:{type:string;data:Record<string,unknown>}[]=[];
    await mockSessionEvents(page,route=>{const event=route.request().postDataJSON();events.push(event);return route.fulfill({json:{event_id:event.event_id}});});
    await page.addInitScript(({name})=>{
      const audioSession={type:"playback"};
      Object.defineProperty(navigator,"audioSession",{configurable:true,value:audioSession});
      Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async()=>{
        if(audioSession.type!=="play-and-record")throw new DOMException("Wrong audio session type","InvalidStateError");
        throw new DOMException("Capture test detail",name);
      }}});
    },{name});
    await page.goto("/");
    await page.getByLabel("Enter invite code to get started").fill("e2e-invite");
    await page.getByRole("button",{name:"Get started"}).tap();
    await page.getByRole("button",{name:"Turn on camera and mic"}).tap();
    await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();
    if(!blocked)await expect(page.getByText("Website Settings",{exact:false})).toHaveCount(0);
    await expect.poll(()=>events.find(event=>event.type==="permissions" && event.data.outcome===(blocked ? "denied":"error"))?.data).toMatchObject({error_name:name,error_message:"Capture test detail"});
    if(!blocked)expect(events.some(event=>event.type==="permissions" && event.data.outcome==="retrying")).toBe(true);
    await expect(page.getByRole("button",{name:"Try again"})).toBeEnabled();
    await page.screenshot({path:`test-results/permissions-${name}-390x844.png`});
  });
}
