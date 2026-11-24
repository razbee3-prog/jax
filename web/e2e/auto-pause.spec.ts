import {mockSessionEvents} from "./telemetry-fixtures";
import {test,expect,chromium} from "@playwright/test";
import {mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {demoCamera} from "./coach-fixtures";
test("auto-pause plays its prefetched fixed line once through real Web Audio",async()=>{
  test.setTimeout(90000);const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true}),text="Step back into frame when you're ready.",requested:string[]=[],events:{type:string;data:Record<string,unknown>}[]=[];
  try{
    await demoCamera(page);await page.route("**/api/stt-token",r=>r.abort());await mockSessionEvents(page,r=>{const e=r.request().postDataJSON();events.push(e);return r.fulfill({json:{event_id:e.event_id}});});
    await page.route("**/api/tts",r=>{requested.push(r.request().postDataJSON().text);const pcm=Buffer.alloc(24000);for(let i=0;i<12000;i++)pcm.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/24000)*12000),i*2);return r.fulfill({contentType:"audio/pcm",body:pcm,headers:{"X-TTS-Cache":"HIT"}});});
    await page.route("**/api/coach",r=>r.fulfill({json:{decision:{speak:true,text:r.request().postDataJSON().event.next_question??"Ready.",kind:"question",fault_id:null,slots:null,guidance:null,summary:null,reason:"Fixture"}}}));
    await page.goto("/?poseDelegate=CPU");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"Turn on camera and mic"}).click();for(const answer of ["full body","10","No injuries","Yes"])await page.getByRole("button",{name:answer,exact:true}).click();await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("button",{name:"Let’s get started"}).click();await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S6",{timeout:20000});expect(requested.filter(t=>t===text)).toHaveLength(1);
    await page.evaluate(()=>{(window as typeof window & {coachOutOfFrame:boolean}).coachOutOfFrame=true;});await expect(page.getByRole("button",{name:"Resume",exact:true})).toBeDisabled({timeout:15000});await expect.poll(()=>events.filter(e=>e.type==="utterance" && e.data.text===text && e.data.outcome==="played").length).toBe(1);expect(requested.filter(t=>t===text)).toHaveLength(1);
    await page.evaluate(()=>{(window as typeof window & {coachOutOfFrame:boolean}).coachOutOfFrame=false;});await expect(page.getByRole("button",{name:"Resume",exact:true})).toBeEnabled({timeout:10000});expect(events.filter(e=>e.type==="utterance" && e.data.text===text)).toHaveLength(1);const folder=process.env.COACH_EVIDENCE_DIR??"test-results/coach-review";mkdirSync(folder,{recursive:true});await page.screenshot({path:resolve(folder,"spoken-auto-pause.png")});await page.getByRole("button",{name:"End",exact:true}).click();console.log("AUTO-PAUSE AUDIO: fixed line prefetched once, played once through Web Audio, no playback-time TTS request.");
  }finally{await browser.close();}
});
