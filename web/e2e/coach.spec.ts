import {test,expect,chromium} from "@playwright/test";
import {mkdirSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {demoCamera} from "./coach-fixtures";
import {uuid7} from "langsmith";
test("real hybrid coach completes forty camera reps with WAV onboarding",async()=>{
  test.skip(process.env.COACH_LIVE_E2E!=="1","Explicit real-agent/voice opt-in required");test.setTimeout(720000);
  const fallback=process.env.COACH_EXPECT_FALLBACK==="1",folder=process.env.COACH_EVIDENCE_DIR??"test-results/coach";mkdirSync(folder,{recursive:true});
  const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream","--use-file-for-fake-audio-capture="+resolve("evals/fixtures/voice/coach-answers.wav")]}),page=await browser.newPage({viewport:{width:390,height:844}});
  const events:{thread_id:string;event_id:string;type:string;data:Record<string,unknown>}[]=[],acknowledged=new Set<string>();
  page.on("request",request=>{if(request.url().endsWith("/api/session/event"))events.push(request.postDataJSON());});
  page.on("response",response=>{if(response.url().endsWith("/api/session/event") && response.ok())void response.json().then(body=>acknowledged.add(body.event_id)).catch(()=>{});});
  async function shot(name:string){await page.screenshot({path:resolve(folder,`${name}.png`)});}
  try{
    await demoCamera(page,true);await page.goto("/?poseDelegate=CPU");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await page.getByRole("button",{name:"Turn on camera and mic"}).click();
    await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S2");await shot("S2");
    await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S3",{timeout:180000});expect(events.filter(e=>e.type==="onboarding.answer")).toHaveLength(4);
    await expect.poll(()=>page.evaluate(()=>(window as typeof window & {coachMicrophoneTracks:MediaStreamTrack[]}).coachMicrophoneTracks.every(track=>track.readyState==="ended"))).toBe(true);
    await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled({timeout:30000});await shot("S3");await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("button",{name:"Let’s get started"}).click();
    for(let exercise=0;exercise<4;exercise++){
      await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S6",{timeout:60000});await shot(`S6-${exercise}`);
      await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen",exercise===3 ? "S8":"S7",{timeout:120000});
      const count=events.filter(e=>e.type==="rep.detected" && e.data.exercise===["rdl","push-press","curl","push-up"][exercise]).length;expect(count).toBe(10);
      if(exercise<3)await shot(`S7-${exercise}`);
      if(exercise===2){await expect(page.getByRole("button",{name:"Check floor framing"})).toBeVisible({timeout:30000});await page.getByRole("button",{name:"Check floor framing"}).click();await expect(page.getByRole("button",{name:"Start push-ups"})).toBeEnabled({timeout:30000});await page.getByRole("button",{name:"Start push-ups"}).click();}
    }
    await expect.poll(()=>events.some(e=>e.type==="coach.turn" && e.data.event_type==="session_end"),{timeout:30000}).toBe(true);await shot("S8");
    expect(events.filter(e=>e.type==="rep.detected")).toHaveLength(40);expect(events.filter(e=>e.type==="cue.decision")).toHaveLength(40);
    expect(events.some(e=>e.type==="coach.turn" && e.data.source===(fallback ? "fallback":"agent"))).toBe(true);
    if(fallback)expect(events.some(e=>e.type==="cue.decision" && e.data.source==="fallback")).toBe(true);
    else expect(events.find(e=>e.type==="coach.turn" && e.data.event_type==="session_end")?.data.source).toBe("agent");
    await expect.poll(()=>acknowledged.size,{timeout:30000}).toBe(events.length);
    console.log(`COACH SESSION ${fallback ? "fallback":"agent"}: 40 reps, four WAV answers, microphone stopped at setup, ${acknowledged.size}/${events.length} events acknowledged.`);
  }finally{
    if(!page.isClosed())await shot("last-state");const thread_id=events[0]?.thread_id;writeFileSync(resolve(folder,"session.json"),JSON.stringify({fallback,events,acknowledged:[...acknowledged],ledger:{thread_id,events:events.map(({event_id,type})=>({event_id,type}))}},null,2));await browser.close();
  }
});
test("returning user hears the remembered injury on a new agent thread",async()=>{
  test.skip(process.env.COACH_LIVE_E2E!=="1" || process.env.COACH_EXPECT_FALLBACK==="1","Real agent required");test.setTimeout(120000);
  const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]}),page=await browser.newPage({viewport:{width:390,height:844}}),events:{type:string;data:Record<string,unknown>}[]=[];
  try{
    await demoCamera(page);page.on("request",r=>{if(r.url().endsWith("/api/session/event"))events.push(r.postDataJSON());});
    await page.goto("/?poseDelegate=CPU");await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();
    const seed=await page.request.post("/api/coach",{data:{thread_id:uuid7(),event_id:crypto.randomUUID(),event:{type:"onboarding_answer",question:"injuries",transcript:"Shoulder discomfort",next_question:"Last one: do you have a pair of dumbbells with you?"}}});expect(seed.status()).toBe(200);
    await page.getByRole("button",{name:"Turn on camera and mic"}).click();for(const answer of ["full body","10"])await page.getByRole("button",{name:answer,exact:true}).click();
    await expect(page.locator(".shell-caption")).toContainText(/Last time you mentioned .*shoulder/i);
    await expect.poll(()=>events.some(e=>e.type==="utterance" && e.data.outcome==="played" && /Last time you mentioned .*shoulder/i.test(String(e.data.text))),{timeout:45000}).toBe(true);
    const folder=process.env.COACH_EVIDENCE_DIR??"test-results/coach";mkdirSync(folder,{recursive:true});await page.screenshot({path:resolve(folder,"returning-injury.png")});writeFileSync(resolve(folder,"returning-injury.json"),JSON.stringify({seed_status:seed.status(),events},null,2));console.log("RETURNING INJURY: new-thread hot memory recalled shoulder discomfort; recall utterance played.");
  }finally{await browser.close();}
});
