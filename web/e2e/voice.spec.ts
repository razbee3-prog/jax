import { test,expect,chromium } from "@playwright/test";
import { mkdirSync,writeFileSync } from "node:fs";
import { resolve } from "node:path";
const flags=["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"];
test("voice lab displays later partial answers alongside committed history",async()=>{
  const browser=await chromium.launch({args:flags});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.route("**/api/stt-token",route=>route.fulfill({json:{token:"test-token",expires_in:900}}));
    await page.route("**/api/tts",route=>route.fulfill({contentType:"audio/pcm",body:Buffer.alloc(2400)}));
    await page.route("**/api/voice-events",route=>route.fulfill({json:{event_id:route.request().postDataJSON().event_id}}));
    let socket:import("@playwright/test").WebSocketRoute|undefined;
    await page.routeWebSocket(/wss:\/\/api\.elevenlabs\.io\//,ws=>{socket=ws;});
    await page.goto("http://127.0.0.1:3000/lab/voice");
    await expect(page.getByTestId("transcript")).toHaveText("Your answer will appear here.");
    await page.getByRole("button",{name:"Enable audio"}).click();await page.getByRole("button",{name:"Start microphone",exact:true}).click();
    await expect.poll(()=>Boolean(socket)).toBe(true);
    socket!.send(JSON.stringify({message_type:"session_started",session_id:"test-session"}));
    await expect(page.getByTestId("orb-state")).toHaveText("listening");
    socket!.send(JSON.stringify({message_type:"committed_transcript",text:"Full body please."}));
    await expect(page.getByTestId("transcript")).toHaveText("Full body please.");
    socket!.send(JSON.stringify({message_type:"partial_transcript",text:"My shoulder"}));
    await expect(page.getByTestId("transcript")).toHaveText("Full body please. My shoulder");
    const folder=process.env.VOICE_EVIDENCE_DIR||"test-results/voice";mkdirSync(folder,{recursive:true});await page.screenshot({path:resolve(folder,"partial-transcript-390x844.png")});
    socket!.send(JSON.stringify({message_type:"committed_transcript",text:"My shoulder feels fine."}));
    await expect(page.getByTestId("transcript")).toHaveText("Full body please. My shoulder feels fine.");
    await page.getByRole("button",{name:"Setup / stop mic",exact:true}).click();
  }finally{await browser.close();}
});
test("voice lab uses actual Web Audio and one orb; cached countdown is uninterrupted",async()=>{
  const browser=await chromium.launch({args:flags});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.route("**/api/tts",async route=>{const bytes=Buffer.alloc(24000);for(let i=0;i<12000;i++)bytes.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/24000)*12000),i*2);await route.fulfill({contentType:"audio/pcm",body:bytes,headers:{"X-TTS-Cache":"HIT"}});});
    await page.route("**/api/voice-events",async route=>route.fulfill({json:{event_id:route.request().postDataJSON().event_id}}));
    await page.goto("http://127.0.0.1:3000/lab/voice");await expect(page.locator("canvas")).toHaveCount(1);
    await page.getByRole("button",{name:"Enable audio"}).click();await expect(page.getByTestId("prefetch")).toHaveText("Ready");
    await page.getByRole("button",{name:"Speak line",exact:true}).click();await expect(page.getByTestId("orb-state")).toHaveText("talking");await expect(page.getByTestId("ttfa")).toContainText("HIT");
    await page.getByRole("button",{name:"Countdown",exact:true}).click();await expect(page.getByTestId("countdown")).toHaveText("3");
    await page.getByLabel("What should Jax say?").fill("A line after the countdown.");await page.getByRole("button",{name:"Speak line",exact:true}).click();await expect(page.getByTestId("countdown")).toHaveText("Go",{timeout:6000});
    await expect.poll(async()=>JSON.parse((await page.getByTestId("voice-ledger").textContent())!).events.length).toBe(3);
    await expect(page.getByTestId("ledger")).toHaveText("Trace ledger 3/3 acknowledged");
  }finally{await browser.close();}
});
test("real realtime Scribe transcribes fake WAV; streaming TTS reports miss/hit TTFA",async()=>{
  test.skip(!process.env.ELEVENLABS_API_KEY || !process.env.LANGSMITH_API_KEY,"Live ElevenLabs and LangSmith credentials required; no secrets in CI.");
  test.setTimeout(180000);
  const browser=await chromium.launch({args:[...flags,"--use-file-for-fake-audio-capture="+resolve("evals/fixtures/voice/known-phrase.wav")]});
  try{
    const context=await browser.newContext({permissions:["microphone"],viewport:{width:390,height:844}}),page=await context.newPage();
    await page.addInitScript(()=>{
      const root=window as typeof window & {audioContexts:number;voiceTracks:MediaStreamTrack[]};root.audioContexts=0;root.voiceTracks=[];
      const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(options?:AudioContextOptions){super(options);root.audioContexts++;}};
      const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const stream=await capture(options);root.voiceTracks.push(...stream.getAudioTracks());return stream;};
    });
    const login=await context.request.post("http://127.0.0.1:3000/api/invite",{data:{code:"e2e-invite"}});expect(login.status()).toBe(200);
    const pair=login.headers()["set-cookie"].split(";")[0];await context.addCookies([{name:"jax_invite",value:pair.slice(pair.indexOf("=")+1),url:"http://127.0.0.1:3000",sameSite:"Strict"}]);
    await page.goto("http://127.0.0.1:3000/lab/voice");
    await page.getByRole("button",{name:"Enable audio"}).click();await expect(page.getByTestId("prefetch")).toHaveText("Ready",{timeout:60000});
    const run=Date.now();
    for(let i=0;i<3;i++)for(let repeat=0;repeat<2;repeat++){
      await page.getByLabel("What should Jax say?").fill(`Jax audio check ${run%1000}, sample ${i+1}.`);
      await page.getByRole("button",{name:"Speak line",exact:true}).click();
      await expect.poll(async()=>JSON.parse((await page.getByTestId("voice-ledger").textContent())!).events.filter((e:{outcome:string})=>e.outcome==="played").length,{timeout:30000}).toBe(i*2+repeat+1);
      await expect(page.getByTestId("ttfa")).toContainText(repeat ? "HIT":"MISS");
    }
    await page.getByRole("button",{name:"Start microphone",exact:true}).click();
    await expect(page.getByTestId("orb-state")).toHaveText("listening",{timeout:20000});
    await expect(page.getByTestId("transcript")).toContainText(/full.body workout/i,{timeout:30000});
    await expect.poll(async()=>JSON.parse((await page.getByTestId("voice-ledger").textContent())!).events.filter((event:{type:string})=>event.type==="transcript").length,{timeout:10000}).toBe(1);
    const actual=await page.getByTestId("transcript").innerText(),normalize=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    expect(normalize(actual)).toBe(normalize("I would like a full body workout."));
    await page.getByRole("button",{name:"Setup / stop mic",exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as typeof window & {voiceTracks:MediaStreamTrack[]}).voiceTracks.every(track=>track.readyState==="ended"))).toBe(true);
    expect(await page.evaluate(()=>(window as typeof window & {audioContexts:number}).audioContexts)).toBe(1);
    await expect(page.getByTestId("ledger")).toHaveText("Trace ledger 7/7 acknowledged",{timeout:20000});
    const ledger=JSON.parse((await page.getByTestId("voice-ledger").textContent())!);
    const samples=(cache:string)=>ledger.events.filter((e:{cache?:string})=>e.cache===cache).map((e:{ttfa_ms:number})=>e.ttfa_ms).sort((a:number,b:number)=>a-b);
    const stats=(values:number[])=>({n:values.length,p50_ms:values[Math.ceil(values.length/2)-1],max_ms:Math.max(...values)});
    const evidence={expected:"I would like a full body workout.",actual,ttfa:{miss:stats(samples("MISS")),hit:stats(samples("HIT"))},ledger};
    console.log("VOICE EVIDENCE "+JSON.stringify(evidence));
    const folder=process.env.VOICE_EVIDENCE_DIR||"test-results/voice";mkdirSync(folder,{recursive:true});writeFileSync(resolve(folder,"voice-results.json"),JSON.stringify(evidence,null,2));await page.screenshot({path:resolve(folder,"voice-lab-390x844.png")});
  }finally{await browser.close();}
});
