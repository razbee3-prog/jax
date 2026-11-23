import {mockSessionEvents} from "./telemetry-fixtures";
import {test,expect,chromium} from "@playwright/test";
const flags=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
for(const fake of [false,true])test(`restart preserves ${fake ? "fake":"live"} mode`,async()=>{
  const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>new MediaStream();});
    await page.route("**/api/tts",r=>r.abort());await page.route("**/api/stt-token",r=>r.abort());await mockSessionEvents(page,r=>r.fulfill({json:{event_id:r.request().postDataJSON().event_id}}));await page.route("**/api/coach",r=>r.fulfill({json:{decision:{speak:false,text:"",kind:"silence",fault_id:null,slots:null,guidance:null,summary:null,reason:"Test"}}}));
    await page.goto(fake ? "/?fake=1&preview=S8":"/?poseDelegate=CPU");
    if(!fake){await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"Turn on camera and mic"}).click();await page.getByRole("button",{name:"End",exact:true}).click();}
    await page.getByRole("button",{name:fake ? "Start another preview":"Start another workout"}).click();
    await expect.poll(()=>new URL(page.url()).searchParams.get("fake")).toBe(fake ? "1":null);await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S0");await expect(page.getByRole("link",{name:fake ? "Scripted preview · no camera or agent":"Try a scripted session",exact:true})).toBeVisible();
  }finally{await browser.close();}
});
