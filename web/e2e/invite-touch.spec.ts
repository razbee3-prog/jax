import {test,expect,devices} from "@playwright/test";

test.use({...devices["iPhone 13"],viewport:{width:390,height:844},browserName:"webkit"});

type InviteWindow=typeof window & {inviteEvents:string[]};

test("keyboard viewport resize keeps portrait focus; physical rotation blocks the stage",async({page})=>{
  await page.addInitScript(()=>{
    const orientation=Object.assign(new EventTarget(),{type:"portrait-primary"});
    Object.defineProperty(screen,"orientation",{configurable:true,value:orientation});
  });
  await page.goto("/");
  await page.waitForFunction(()=>document.documentElement.classList.contains("dark"));
  const input=page.getByLabel("Enter invite code to get started"),overlay=page.locator(".shell-landscape"),stage=page.locator(".shell-stage");
  await input.tap();
  await expect(input).toBeFocused();
  const margin=await page.locator(".shell-invite").evaluate(element=>getComputedStyle(element).marginTop);
  await page.setViewportSize({width:390,height:300});
  expect(await page.evaluate(()=>matchMedia("(orientation: landscape)").matches)).toBe(true);
  await expect(overlay).toBeHidden();
  expect(await stage.evaluate(element=>(element as HTMLElement).inert)).toBe(false);
  await expect(input).toBeFocused();
  expect(await page.locator(".shell-invite").evaluate(element=>getComputedStyle(element).marginTop)).toBe(margin);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:"test-results/invite-keyboard-portrait-390x844.png"});
  await page.evaluate(()=>{
    Object.defineProperty(screen.orientation,"type",{configurable:true,value:"landscape-primary"});
    screen.orientation.dispatchEvent(new Event("change"));
  });
  await expect(overlay).toBeVisible();
  expect(await stage.evaluate(element=>(element as HTMLElement).inert)).toBe(true);
  await expect(input).not.toBeFocused();
  await page.screenshot({path:"test-results/invite-device-landscape-390x844.png"});
  await page.evaluate(()=>{
    Object.defineProperty(screen.orientation,"type",{configurable:true,value:"portrait-primary"});
    screen.orientation.dispatchEvent(new Event("change"));
  });
  await expect(overlay).toBeHidden();
  expect(await stage.evaluate(element=>(element as HTMLElement).inert)).toBe(false);
  await input.tap();
  await expect(input).toBeFocused();
});

for(const browser of ["Safari","Chrome"]){
  test.describe(browser,()=>{
  test.use({userAgent:browser==="Chrome" ? devices["iPhone 13"].userAgent.replace(/Version\/\S+/,"CriOS/131.0.6778.154"):devices["iPhone 13"].userAgent});
  test("iPhone tap focuses the invite field before and through hydration",async({page})=>{
    await page.addInitScript(()=>{
      const state=window as InviteWindow;state.inviteEvents=[];
      const prevent=Event.prototype.preventDefault;
      Event.prototype.preventDefault=function(){
        if(["touchstart","touchend","pointerdown","pointerup","mousedown","mouseup","click","submit"].includes(this.type))state.inviteEvents.push(`prevent:${this.type}`);
        return prevent.call(this);
      };
      const resume=AudioContext.prototype.resume;
      AudioContext.prototype.resume=function(){state.inviteEvents.push("audio:resume");return resume.call(this);};
    });
    let release=()=>{};
    const scripts=new Promise<void>(resolve=>{release=resolve;});
    await page.route("**/_next/static/**/*.js",async route=>{await scripts;await route.continue().catch(()=>{});});
    try{
      await page.goto("/?fake=1",{waitUntil:"commit"});
      const input=page.getByLabel("Enter invite code to get started");
      await expect(input).toBeEnabled();
      await input.tap();
      await expect(input).toBeFocused();
      await input.pressSequentially("wrong");
      const field=await input.elementHandle();
      expect(await page.evaluate(()=>(window as InviteWindow).inviteEvents)).toEqual([]);
      release();
      await page.waitForFunction(()=>document.documentElement.classList.contains("dark"));
      await expect(input).toBeFocused();
      await expect(input).toHaveValue("wrong");
      expect(await field!.evaluate(element=>element.isConnected)).toBe(true);
      await page.getByRole("heading",{name:"Jax",exact:true}).tap();
      await input.tap();
      await expect(input).toBeFocused();
      const beforeSubmit=await page.evaluate(()=>(window as InviteWindow).inviteEvents);
      expect(beforeSubmit.filter(event=>event.startsWith("prevent:"))).toEqual([]);
      await page.screenshot({path:`test-results/invite-touch-${browser.toLowerCase()}-390x844.png`});
      const response=page.waitForResponse(response=>response.url().endsWith("/api/invite") && response.request().method()==="POST");
      await page.getByRole("button",{name:"Get started"}).tap();
      expect((await response).status()).toBe(401);
      await expect(page.locator("#error")).toHaveText("That code didn't work.");
      const afterSubmit=await page.evaluate(()=>(window as InviteWindow).inviteEvents);
      expect(afterSubmit.filter(event=>event.startsWith("prevent:"))).toEqual(["prevent:submit"]);
      expect(afterSubmit.filter(event=>event==="audio:resume")).toHaveLength(beforeSubmit.filter(event=>event==="audio:resume").length+1);
    }finally{release();}
  });
  });
}

test("without JavaScript the invite remains editable and submits a native POST",async({browser})=>{
  const context=await browser.newContext({...devices["iPhone 13"],javaScriptEnabled:false});
  const page=await context.newPage();
  try{
    await page.goto("/");
    const input=page.getByLabel("Enter invite code to get started");
    await input.tap();
    await expect(input).toBeFocused();
    await input.fill("E2E-INVITE");
    const response=page.waitForResponse(response=>response.url().endsWith("/api/invite") && response.request().method()==="POST");
    await page.getByRole("button",{name:"Get started"}).tap();
    const result=await response;
    expect(result.status()).toBe(200);
    expect(result.request().postData()).toBe("code=E2E-INVITE");
    expect((await result.json()).ok).toBe(true);
    expect((await result.headerValues("set-cookie")).some(cookie=>cookie.startsWith("jax_invite="))).toBe(true);
  }finally{await context.close();}
});
