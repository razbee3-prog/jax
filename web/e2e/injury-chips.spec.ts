import {test,expect,chromium} from "@playwright/test";
import {mkdirSync} from "node:fs";
import {resolve} from "node:path";
import type {CoachEvent} from "../../shared/coach-event";
const flags=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
for(const answer of ["Yes, still","No, it's better"])test(`remembered injury chips support ${answer}`,async()=>{
  const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844}}),answers:CoachEvent[]=[];
  try{
    await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>new MediaStream();});await page.route("**/api/tts",r=>r.abort());await page.route("**/api/stt-token",r=>r.abort());await page.route("**/api/session/event",r=>r.fulfill({json:{event_id:r.request().postDataJSON().event_id}}));
    await page.route("**/api/coach",r=>{const {event}:{event:CoachEvent}=r.request().postDataJSON();if(event.type==="onboarding_answer")answers.push(event);return r.fulfill({json:{decision:{speak:true,text:event.type==="session_start" ? "Welcome back.":event.next_question??"Ready.",kind:"question",fault_id:null,slots:{focus:null,duration_min:null,injuries:["Shoulder discomfort"],has_dumbbells:null},guidance:null,summary:null,reason:"Remembered injury fixture"}}});});
    await page.goto("/");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"Turn on camera and mic"}).click();await expect(page.locator(".shell-caption")).toHaveText("Welcome back.");
    await page.getByRole("button",{name:"full body",exact:true}).click();await page.getByRole("button",{name:"10",exact:true}).click();await expect(page.locator(".shell-caption")).toContainText("Last time you mentioned Shoulder discomfort");await expect(page.getByRole("button",{name:"Yes, still",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"No, it's better",exact:true})).toBeVisible();
    if(answer==="Yes, still"){const folder=process.env.COACH_EVIDENCE_DIR??"test-results/coach-review";mkdirSync(folder,{recursive:true});await page.screenshot({path:resolve(folder,"returning-injury-chips.png")});}
    await page.getByRole("button",{name:answer,exact:true}).click();await expect.poll(()=>answers.filter(e=>e.question==="injuries").length).toBe(1);expect(answers.at(-1)).toMatchObject({question:"injuries",transcript:answer,known_injuries:["Shoulder discomfort"],returning:true});await expect(page.locator(".shell-caption")).toContainText("dumbbells");await page.getByRole("button",{name:"End",exact:true}).click();
  }finally{await browser.close();}
});
