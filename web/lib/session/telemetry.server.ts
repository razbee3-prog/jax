import {Client} from "langsmith";
import {traceable} from "langsmith/traceable";
import {eventSchema,runName,type TraceEvent} from "./events";
import {feedbackReceipt} from "./feedback.server";
import {userIdentity} from "../coach/identity.server";
export async function recordEvents(events:TraceEvent[],request:Request){
  const client=new Client();
  try{
    for(const event of events){
      const data={...event.data};
      if(event.type==="session.start")Object.assign(data,{user_id:userIdentity(request)??"invited",device:/iPhone|iPad/i.test(request.headers.get("user-agent")??"") ? "ios":"desktop",browser:(request.headers.get("user-agent")??"unknown").slice(0,512),app_version:process.env.APP_VERSION??"0.0.0"});
      if(event.type==="onboarding.answer")Object.assign(data,{transcript:data.transcript??data.answer??"",extracted_slot:data.answer??null});
      await traceable(async()=>data,{id:event.event_id,name:runName(event.type),client,tracingEnabled:true,project_name:process.env.LANGSMITH_PROJECT,metadata:{thread_id:event.thread_id,event_id:event.event_id,event_type:event.type,source:event.data.source??"shell",scripted:event.data.scripted??false}})();
    }
  }finally{await client.awaitPendingTraceBatches();}
  const end=events.find(e=>e.type==="session.end");
  return {acknowledged:events.map(e=>e.event_id),...(end ? {run_id:end.event_id,receipt:feedbackReceipt(end.thread_id,end.event_id)}:{})};
}
export async function parseEvents(request:Request,batch:boolean){
  const text=await request.text();if(Buffer.byteLength(text)>256000)throw new Error("Payload too large");
  const body=JSON.parse(text);return batch ? eventSchema.array().min(1).max(100).parse(body.events):[eventSchema.parse(body)];
}
