import { test,expect,chromium,type Page } from "@playwright/test";
import { mkdirSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
const flags=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
const folder=process.env.SHELL_EVIDENCE_DIR||"test-results/shell";
async function mocks(page:Page){
  await page.addInitScript(()=>{const state={requested:0,released:0};(window as typeof window & {shellWake:typeof state}).shellWake=state;Object.defineProperty(navigator,"wakeLock",{value:{request:async()=>{state.requested++;return {release:async()=>{state.released++;}};}}});});
  await page.route("**/api/session/event",route=>{const data=route.request().postDataJSON();return route.fulfill({json:{event_id:data.event_id,...(data.type==="session.end" ? {run_id:data.event_id,receipt:"test-receipt"}:{})}});});
  await page.route("**/api/session/feedback",route=>route.fulfill({json:{ok:true}}));
  await page.route("**/api/tts",route=>route.abort());
}
async function screen(page:Page,name:string){await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen",name);}
async function shot(page:Page,name:string){mkdirSync(folder,{recursive:true});await expect(page.locator(".shell-screen")).toHaveCount(1);await expect(page.locator(".shell-screen")).toHaveCSS("opacity","1");await page.screenshot({path:resolve(folder,`${name}.png`)});}
async function invite(page:Page,url="/?fake=1") {await page.goto(url);await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await screen(page,"S1");}
test("full scripted session at 390x844: all screens, pauses, rest, floor setup and feedback",async()=>{
  test.setTimeout(240000);
  const browser=await chromium.launch({args:flags}),context=await browser.newContext({viewport:{width:390,height:844},recordVideo:process.env.SHELL_RECORD ? {dir:folder,size:{width:390,height:844}}:undefined}),page=await context.newPage();
  try{
    await mocks(page);
    page.on("console",message=>{if(message.text().startsWith("SHIFT "))console.log(message.text());});
    await page.addInitScript(()=>{new PerformanceObserver(list=>{for(const entry of list.getEntries()){const shift=entry as PerformanceEntry & {value:number;sources:{node:Element;previousRect:DOMRectReadOnly;currentRect:DOMRectReadOnly}[]};console.log("SHIFT "+JSON.stringify({value:shift.value,sources:shift.sources.map(source=>({node:source.node?.tagName,classes:source.node?.parentElement?.className,before:source.previousRect,after:source.currentRect}))}));}}).observe({type:"layout-shift",buffered:true});});
    await page.addInitScript(()=>{const root=window as typeof window & {shellShifts:{value:number;time:number;recent:boolean}[];orbNode:Element|null};root.shellShifts=[];new PerformanceObserver(list=>{for(const entry of list.getEntries()){const shift=entry as PerformanceEntry & {value:number;hadRecentInput:boolean};root.shellShifts.push({value:shift.value,time:shift.startTime,recent:shift.hadRecentInput});}}).observe({type:"layout-shift",buffered:true});Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:()=>{throw new Error("Fake mode must not open capture");}});});
    await page.goto("/?fake=1");await screen(page,"S0");await page.waitForTimeout(1000);await shot(page,"S0");
    await page.getByLabel("Enter invite code to get started").fill("e2e-invite");await page.getByRole("button",{name:"Get started"}).click();await screen(page,"S1");await shot(page,"S1");
    await page.getByRole("button",{name:"Turn on camera and mic"}).click();await screen(page,"S2");await shot(page,"S2");
    for(const answer of ["full body","10","No injuries","Yes"])await page.getByRole("button",{name:answer,exact:true}).click();
    await screen(page,"S3");await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled();await shot(page,"S3");
    await page.getByRole("button",{name:"Continue",exact:true}).click();await screen(page,"S4");await shot(page,"S4");
    await page.evaluate(()=>{(window as typeof window & {orbNode:Element|null}).orbNode=document.querySelector(".shell-orb canvas");});
    const moveStart=await page.evaluate(()=>performance.now());
    await page.getByRole("button",{name:"Let’s get started"}).click();await screen(page,"S5");
    await expect.poll(()=>page.evaluate(()=>document.querySelector(".shell-orb")!.getBoundingClientRect().width)).toBeLessThan(50);
    await shot(page,"S5");
    expect(await page.evaluate(()=>(window as typeof window & {orbNode:Element|null}).orbNode===document.querySelector(".shell-orb canvas"))).toBe(true);
    const moveEnd=await page.evaluate(()=>performance.now());
    const moveShifts=await page.evaluate(({start,end})=>(window as typeof window & {shellShifts:{value:number;time:number}[]}).shellShifts.filter(s=>s.time>=start&&s.time<=end).reduce((sum,s)=>sum+s.value,0),{start:moveStart,end:moveEnd});
    expect(moveShifts).toBe(0);
    await screenEventually(page,"S6");await expect(page.getByTestId("shell-reps").locator("strong")).toHaveCSS("font-size","160px");
    await expect(page.getByTestId("shell-reps").locator("strong")).toHaveText("1",{timeout:6000});await shot(page,"S6");
    await expect(page.locator(".shell-orb canvas")).toHaveCSS("width","260px");
    await page.getByTestId("pause-set").click();await expect(page.getByRole("heading",{name:"Paused",exact:true})).toBeVisible();const reps=await page.getByTestId("shell-reps").innerText();await page.waitForTimeout(1700);expect(await page.getByTestId("shell-reps").innerText()).toBe(reps);await page.getByRole("button",{name:"Resume",exact:true}).click();
    for(let exercise=0;exercise<4;exercise++){
      await screenEventually(page,exercise===3 ? "S8":"S7",25000);
      if(exercise===3)break;
      if(exercise===0){await shot(page,"S7");await expect(page.getByRole("timer")).toBeVisible();}
      if(exercise===2){await expect(page.getByRole("button",{name:"Check floor framing"})).toBeVisible({timeout:25000});await page.getByRole("button",{name:"Check floor framing"}).click();await screen(page,"S3");await expect(page.getByRole("button",{name:"Start push-ups"})).toBeEnabled();await shot(page,"S3-floor");await page.getByRole("button",{name:"Start push-ups"}).click();}
      await screenEventually(page,"S5",25000);await screenEventually(page,"S6");
    }
    await expect(page.getByText("You completed all four scripted sets.")).toBeVisible();
    await page.getByRole("button",{name:"Thumbs up"}).click();await expect(page.getByRole("status")).toHaveText("Thanks for your feedback.");await shot(page,"S8");
    const shifts=await page.evaluate(()=>(window as typeof window & {shellShifts:{value:number;time:number;recent:boolean}[]}).shellShifts);
    const result={orbMoveCLS:moveShifts,totalLayoutShift:shifts.reduce((sum,s)=>sum+s.value,0),cls:shifts.filter(s=>!s.recent).reduce((sum,s)=>sum+s.value,0),shifts};writeFileSync(resolve(folder,"layout-shift.json"),JSON.stringify(result,null,2));console.log("SHELL CLS "+JSON.stringify(result));
    await page.getByRole("button",{name:"Start another preview"}).click();await screen(page,"S0");
  }finally{await context.close();await browser.close();}
});
async function screenEventually(page:Page,name:string,timeout=10000){await expect(page.getByTestId("app-shell")).toHaveAttribute("data-screen",name,{timeout});}
test("permissions denied/retry, portrait overlay, reduced motion and Skip",async()=>{
  const browser=await chromium.launch({args:flags}),page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
  try{await mocks(page);await invite(page,"/?fake=1&deny=1");await page.getByRole("button",{name:"Turn on camera and mic"}).click();await expect(page.getByRole("heading",{name:"Camera or microphone blocked"})).toBeVisible();await shot(page,"S1-denied");await page.getByRole("button",{name:"Try again"}).click();await screen(page,"S2");
    await page.setViewportSize({width:844,height:390});await expect(page.getByRole("heading",{name:"Turn your phone upright"})).toBeVisible();await shot(page,"portrait-overlay-landscape");await page.setViewportSize({width:390,height:844});
    for(const answer of ["full body","10","No injuries","Yes"])await page.getByRole("button",{name:answer,exact:true}).click();await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeEnabled();await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("button",{name:"Let’s get started"}).click();await screenEventually(page,"S6");await page.getByRole("button",{name:"Skip",exact:true}).click();await screen(page,"S7");await page.getByRole("button",{name:"End",exact:true}).click();await screen(page,"S8");
    await expect.poll(()=>page.evaluate(()=>(window as typeof window & {shellWake:{requested:number;released:number}}).shellWake)).toEqual({requested:1,released:1});
  }finally{await browser.close();}
});
