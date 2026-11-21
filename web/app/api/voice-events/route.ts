import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";
import { z } from "zod";
import { voiceAccess } from "../../../lib/voice/access.server";
const event=z.object({thread_id:z.uuidv7(),event_id:z.string().min(1).max(120),type:z.enum(["utterance","transcript"]),text:z.string().max(2000),outcome:z.string().max(40),reason:z.string().max(120),ttfa_ms:z.number().nonnegative().nullable(),cache:z.string().max(20).optional()}).strict();
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  const parsed=event.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Invalid voice event"},{status:400});
  if(!process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT)return Response.json({error:"Trace service unavailable"},{status:503});
  try{
    const data=parsed.data,client=new Client();
    await traceable(async()=>data,{name:data.type==="utterance" ? "utterance" : "onboarding.turn",client,tracingEnabled:true,project_name:process.env.LANGSMITH_PROJECT,metadata:{thread_id:data.thread_id,event_id:data.event_id,source:"voice-lab"}})();
    await client.awaitPendingTraceBatches();
    return Response.json({event_id:data.event_id},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Voice trace failed"},{status:502});}
}
