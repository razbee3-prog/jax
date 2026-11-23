import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {chromium,expect} from "@playwright/test";
import {Client} from "langsmith";
import {demoCamera} from "../../web/e2e/coach-fixtures";
import {readSession} from "../../web/lib/session/audit.server";
import {sessionMetrics,type SimEvent} from "../evaluators/session";
import type {SessionInput} from "../datasets/sessions";
import {evaluationBase,type AppConfig} from "./app";

export async function sessionTarget(input:SessionInput,config:AppConfig,folder:string){
  const base=evaluationBase(config.base);
  await mkdir(folder,{recursive:true});
  const browser=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
  const page=await browser.newPage({viewport:{width:390,height:844}}),events:SimEvent[]=[],responses:Promise<void>[]=[];
  let invited=false,audit:{pass:boolean;expected:number;recorded:number;missing:unknown[]}|undefined,receipt:{run_id:string;receipt:string}|undefined;
  page.on("request",request=>{if(request.url().endsWith("/api/telemetry"))events.push(...request.postDataJSON().events);});
  page.on("response",response=>{
    if(response.url().endsWith("/api/telemetry") && response.ok())responses.push(response.json().then(body=>{if(body.run_id && body.receipt)receipt={run_id:body.run_id,receipt:body.receipt};}));
    if(response.url().endsWith("/api/session/audit") && response.ok())responses.push(response.json().then(body=>{audit=body;}));
  });
  try{
    await demoCamera(page);
    await page.route("**/api/stt-token",route=>route.abort());
    if(input.agent_outage)await page.route("**/api/coach",route=>route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({error:"Deliberate evaluation outage",source:"fallback"})}));
    await page.goto(base+"/?poseDelegate=CPU");
    await page.getByLabel("Enter invite code to get started").fill(config.invite);
    await page.getByRole("button",{name:"Get started"}).click();
    await page.getByRole("button",{name:"Turn on camera and mic"}).waitFor();invited=true;
    await page.getByRole("button",{name:"Turn on camera and mic"}).click();
    for(const answer of ["full body","10","No injuries","Yes"])await page.locator(".screen-S2").getByRole("button",{name:answer,exact:true}).click({timeout:45000});
    await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled({timeout:45000});
    await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("button",{name:"Let’s get started"}).click();
    for(let exercise=0;exercise<4;exercise++){
      await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen","S6",{timeout:60000});
      await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen",exercise===3 ? "S8":"S7",{timeout:130000});
      if(exercise===2){
        await page.getByRole("button",{name:"Set up for push-ups"}).click({timeout:45000});
        await page.getByRole("button",{name:"Start push-ups"}).click();
      }
    }
    await expect(page.getByTestId("trace-check")).toContainText(/recorded|unavailable/u,{timeout:120000});
    await page.getByRole("button",{name:"Thumbs up: Helpful"}).click();
    await expect(page.getByText("Thanks for your feedback.",{exact:true})).toBeVisible({timeout:20000});
    await Promise.all(responses);
    if(!receipt || !audit || !events[0])throw new Error("Session evaluation did not receive an audit receipt");
    const smith=new Client(),thread_id=events[0].thread_id,independent=await readSession(smith,thread_id);
    const feedback=[];for await(const item of smith.listFeedback({runIds:[receipt.run_id],feedbackKeys:["coaching_helpful"]}))feedback.push(item);
    const feedback_pass=feedback.some(item=>item.score===1 && item.run_id===receipt!.run_id);
    const project=await smith.readProject({projectName:process.env.LANGSMITH_PROJECT!});
    const trace=await smith.runs.getURL(receipt.run_id,{project_id:project.id,trace_id:receipt.run_id});
    const metrics=sessionMetrics(events),mode_pass=events.some(e=>e.type==="coach.turn" && e.data.source===(input.agent_outage ? "fallback":"agent")) && events.filter(e=>e.type==="coach.turn" && e.data.event_type==="session_end").some(e=>e.data.source===(input.agent_outage ? "fallback":"agent"));
    const result={thread_id,run_id:receipt.run_id,trace,metrics,audit,feedback_pass,mode_pass,trace_pass:audit.pass && independent.current.pass && audit.expected===audit.recorded,iphone_latency_verified:false};
    await writeFile(resolve(folder,"result.json"),JSON.stringify(result,null,2)+"\n");
    await page.screenshot({path:resolve(folder,"summary.png"),mask:[page.locator("input")]});
    return result;
  }finally{
    await Promise.allSettled(responses);
    await writeFile(resolve(folder,"events.json"),JSON.stringify(events,null,2)+"\n");
    if(invited && !page.isClosed())await page.screenshot({path:resolve(folder,"last-state.png"),mask:[page.locator("input")]}).catch(()=>{});
    await browser.close();
  }
}
