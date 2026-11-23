import {test,expect,chromium,type Page} from "@playwright/test";
import {mkdirSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {demoCamera} from "./coach-fixtures";
import type {CoachEvent} from "../../shared/coach-event";
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
test("agent debrief and calorie summary work after one real camera set",async()=>{
  test.skip(process.env.COACH_PARTIAL_LIVE_E2E!=="1","Explicit partial live-agent opt-in required");test.setTimeout(180000);
  const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844}}),events:{thread_id:string;event_id:string;type:string;data:Record<string,unknown>}[]=[],calls:{event:Record<string,unknown>;status:number;decision:Record<string,unknown>}[]=[];
  try{
    await prepare(page);await page.unroute("**/api/session/event");page.on("request",r=>{if(r.url().endsWith("/api/session/event"))events.push(r.postDataJSON());});
    await page.route("**/api/coach",async route=>{
      const {event}=route.request().postDataJSON();
      if(["set_end","session_end"].includes(event.type)){const response=await route.fetch(),body=await response.json();calls.push({event,status:response.status(),decision:body.decision});await route.fulfill({response,json:body});}
      else await route.fulfill({json:{decision:{...decision,text:event.next_question??"Ready.",...(event.type==="rep" ? {speak:false,text:"",kind:"silence",guidance:{action:"quiet",fault_id:null,text:""}}:{})}}});
    });
    await setup(page);await start(page);await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S7",{timeout:120000});
    await expect.poll(()=>events.some(e=>e.type==="coach.turn" && e.data.event_type==="set_end" && e.data.source==="agent"),{timeout:15000}).toBe(true);expect(calls[0].status).toBe(200);expect(calls[0].event.reports).toHaveLength(10);expect(String(calls[0].decision.text).length).toBeGreaterThan(String(calls[0].event.next_question).length);await expect(page.locator(".shell-caption")).toHaveText(String(calls[0].decision.text));await shot(page,"agent-set-feedback");await page.waitForTimeout(10000);
    await page.getByRole("button",{name:"End",exact:true}).click();await expect.poll(()=>events.some(e=>e.type==="coach.turn" && e.data.event_type==="session_end" && e.data.source==="agent"),{timeout:15000}).toBe(true);
    expect(calls.map(c=>c.event.type)).toEqual(["set_end","session_end"]);const end=calls[1],totals=end.event.totals as {kcal:number;elapsed_ms:number;weight_kg:number;met:number;reps:number},summary=end.decision.summary as {went_well:string;next_time:string};
    expect(totals.reps).toBe(10);expect(totals.weight_kg).toBe(68);expect(totals.met).toBe(3.5);expect(totals.kcal).toBe(Math.round(3.5*3.5*68/200*totals.elapsed_ms/60000));expect(totals.kcal).toBeGreaterThan(0);
    expect(totals.elapsed_ms).toBe(events.filter(e=>e.type==="rep.detected").at(-1)?.data.workout_ms);const endEvent=events.find(e=>e.type==="session.end")!;expect(Number(endEvent.data.elapsed_ms)-totals.elapsed_ms).toBeGreaterThan(9000);expect(endEvent.data.last_rep_elapsed_ms).toBe(totals.elapsed_ms);
    await expect(page.locator(".summary-card")).toContainText(summary.went_well);await expect(page.locator(".summary-card")).toContainText(summary.next_time);await expect(page.locator(".shell-caption")).toContainText(`approximately ${totals.kcal} calories, assuming a body weight of 68 kilograms`);await shot(page,"agent-partial-summary");
    console.log(`PARTIAL AGENT DEBRIEF: 10 camera reps, 10 reports, one set_end, agent summary, ${totals.elapsed_ms.toFixed(0)}ms, MET ${totals.met}, ${totals.weight_kg}kg, ${totals.kcal}kcal.`);
  }finally{mkdirSync(folder,{recursive:true});writeFileSync(resolve(folder,"partial-debrief.json"),JSON.stringify({events,calls},null,2));await browser.close();}
});
test("pending rep retention survives a timed-out in-flight browser request",async()=>{
  test.setTimeout(90000);const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844}}),sent:CoachEvent[]=[],events:{type:string;data:Record<string,unknown>}[]=[];
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  try{
    await prepare(page);page.on("request",r=>{if(r.url().endsWith("/api/session/event"))events.push(r.postDataJSON());});
    await page.route("**/api/coach",async route=>{
      const {event}:{event:CoachEvent}=route.request().postDataJSON();if(event.type==="rep"){sent.push(event);if(sent.length===1)await gate;}
      await route.fulfill({json:{decision:event.type==="rep" ? {...decision,speak:false,text:"",kind:"silence",guidance:{action:"quiet",fault_id:null,text:""}}:{...decision,text:event.next_question??"Ready."}}});
    });
    await setup(page);await start(page);await expect.poll(async()=>Number(await page.getByTestId("shell-reps").locator("strong").textContent()),{timeout:45000}).toBeGreaterThanOrEqual(3);
    expect(sent).toHaveLength(1);expect(events.some(e=>e.type==="coach.turn" && e.data.event_type==="rep" && e.data.reason==="four-second deadline")).toBe(true);expect(events.some(e=>e.type==="cue.decision" && e.data.source==="fallback")).toBe(true);
    release();await expect.poll(()=>sent.length).toBeGreaterThanOrEqual(2);expect(sent[1].reports?.map(r=>r.rep)).toEqual([2,3]);expect(sent.every(e=>JSON.stringify(e).length<64000)).toBe(true);await shot(page,"pending-reps-retained");await page.getByRole("button",{name:"End",exact:true}).click();
    console.log("PENDING REP RETENTION: camera reached rep 3 while request 1 was in flight; deadline fallback; next HTTP batch retained reps [2,3].");
  }finally{release();mkdirSync(folder,{recursive:true});writeFileSync(resolve(folder,"pending-reps.json"),JSON.stringify({sent,events},null,2));await browser.close();}
});
