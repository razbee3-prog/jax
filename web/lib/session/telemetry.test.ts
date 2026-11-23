import {it,expect,vi,afterEach} from "vitest";
import {SessionLedger} from "./ledger";
import {landmarkSeries,LANDMARK_IDS} from "./landmarks";
import {eventSchema} from "./events";
import {compareLedger,pollAudit} from "./audit.server";
import type {Client} from "langsmith";
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const thread="01a1fbca-bc9c-773c-8811-18f65a5a4ff4";
it("does not invoke the browser's native fetch with the ledger as its receiver",async()=>{
  const calls:unknown[]=[];vi.stubGlobal("fetch",function(this:unknown){calls.push(this);return Promise.resolve(Response.json({acknowledged:[]}));});const ledger=new SessionLedger(thread);ledger.emit("session.start");await ledger.flush();expect(calls).toHaveLength(1);expect(calls[0]).not.toBe(ledger);
});
it("batches events, waits for flush, preserves IDs and signs off with the complete manifest",async()=>{
  const send=vi.fn<typeof fetch>(async(_url,init)=>{const {events}=JSON.parse(init!.body as string);return Response.json({acknowledged:events.map((e:{event_id:string})=>e.event_id),run_id:"end",receipt:"receipt"});}),ledger=new SessionLedger(thread,send);
  ledger.emit("session.start");ledger.emit("session.end");expect(send).not.toHaveBeenCalled();await ledger.flush();expect(send).toHaveBeenCalledOnce();expect(ledger.acknowledged.size).toBe(2);expect(ledger.receipt?.receipt).toBe("receipt");expect(JSON.parse(send.mock.calls[0][1]!.body as string).events[1].data.manifest).toEqual(ledger.events);await ledger.flush();expect(send).toHaveBeenCalledOnce();
});
it("keeps failed posts in the ledger and failed beacons available for normal flush",async()=>{
  const send=vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Response.json({acknowledged:[]})),ledger=new SessionLedger(thread,send);
  ledger.emit("session.start");ledger.beacon(()=>false);await ledger.flush();expect(ledger.events).toHaveLength(1);expect(ledger.acknowledged.size).toBe(0);ledger.emit("session.end");await ledger.flush();expect(send).toHaveBeenCalledTimes(2);expect(JSON.parse(send.mock.calls[1][1]!.body as string).events[0].data.manifest).toHaveLength(2);
});
it("does not send empty batches, and bounds ordinary beacon batch size",async()=>{
  const send=vi.fn<typeof fetch>(),ledger=new SessionLedger(thread,send);await ledger.flush();expect(send).not.toHaveBeenCalled();for(let i=0;i<20;i++)ledger.emit("screen.view",{text:"x".repeat(6000)});const blobs:Blob[]=[];ledger.beacon((_url,blob)=>{blobs.push(blob);return true;});expect(blobs.length).toBeGreaterThan(1);expect(blobs.every(b=>b.size<=48000)).toBe(true);
});
it("matches ledger IDs and canonical run names, rejecting errors and empty ledgers",()=>{
  const ledger=[{event_id:crypto.randomUUID(),type:"setup.pass" as const}],run={id:ledger[0].event_id,name:"setup.check"};expect(compareLedger(thread,ledger,[run]).pass).toBe(true);expect(compareLedger(thread,ledger,[{...run,error:"offline"}]).missing).toEqual(ledger);expect(compareLedger(thread,[],[]).pass).toBe(false);
});
it("polls through indexing lag and returns missing IDs on timeout",async()=>{
  vi.useFakeTimers();const ledger=[{event_id:crypto.randomUUID(),type:"rep" as const}],list=vi.fn().mockImplementationOnce(async function*(){}).mockImplementation(async function*(){yield {id:ledger[0].event_id,name:"rep"};});
  const client={listRuns:list} as unknown as Client,result=pollAudit(client,thread,ledger,60000);await vi.advanceTimersByTimeAsync(2000);expect((await result).pass).toBe(true);list.mockImplementation(async function*(){throw new Error("offline");});const missing=pollAudit(client,thread,ledger,60000);await vi.advanceTimersByTimeAsync(60000);expect((await missing).missing).toEqual(ledger);
});
it("cannot report PASS by omitting events from the persisted session.end manifest",async()=>{
  const end={event_id:crypto.randomUUID(),type:"session.end" as const},rep={event_id:crypto.randomUUID(),type:"rep" as const};const client={listRuns:async function*(){yield {id:end.event_id,name:"session.end",outputs:{manifest:[rep,end]}};}} as unknown as Client;
  const result=await pollAudit(client,thread,[end],0);expect(result.pass).toBe(false);expect(result.expected).toBe(2);expect(result.missing).toEqual([rep]);
});
it("resamples only 13 image-coordinate landmarks at 10 Hz and hides missing/long gaps",()=>{
  const points=Array.from({length:33},()=>({x:0,y:0,visibility:1})),frames=[{t:0,landmarks:points},{t:200,landmarks:points.map(p=>({...p,x:1}))}];const series=landmarkSeries(frames);expect(LANDMARK_IDS).toHaveLength(13);expect(series.map(s=>s.t)).toEqual([0,100,200]);expect(series[1].lm[0]).toEqual([0.5,0,1]);expect(landmarkSeries([])).toEqual([]);expect(landmarkSeries([{t:0,landmarks:[]},{t:100,landmarks:[]}])[0].lm[0]).toEqual([0,0,0]);expect(landmarkSeries([frames[0],{...frames[1],t:1000}])[1].lm[0][2]).toBe(0);
});
it("accepts numeric replay series but rejects media and malformed coordinates",()=>{
  const event={thread_id:thread,event_id:crypto.randomUUID(),type:"rep",data:{landmark_series:[{t:0,lm:Array.from({length:13},()=>[0.1,0.2,0.9])}]}};expect(eventSchema.safeParse(event).success).toBe(true);expect(eventSchema.safeParse({...event,data:{video:[1,2]}}).success).toBe(false);expect(eventSchema.safeParse({...event,data:{landmark_series:[{t:0,lm:[]}]}}).success).toBe(false);
});
