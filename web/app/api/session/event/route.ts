import { Client } from "langsmith";
import { traceable } from "langsmith/traceable";
import { z } from "zod";
import { voiceAccess } from "../../../../lib/voice/access.server";
import { feedbackReceipt } from "../../../../lib/session/feedback.server";
const event=z.object({thread_id:z.uuidv7(),event_id:z.uuid(),type:z.enum(["session.start","screen.view","permissions","onboarding.answer","setup.pass","set.start","rep.detected","set.end","session.pause","session.resume","session.end","utterance"]),data:z.record(z.string().max(60),z.union([z.string().max(2000),z.number().finite(),z.boolean()]))}).strict();
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  const parsed=event.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid event"},{status:400});
  if(!process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT)return Response.json({error:"Tracing unavailable"},{status:503});
  try{
    const data=parsed.data,client=new Client();
    await traceable(async()=>data.data,{id:data.event_id,name:data.type,client,tracingEnabled:true,project_name:process.env.LANGSMITH_PROJECT,metadata:{thread_id:data.thread_id,event_id:data.event_id,source:"shell",scripted:true}})();
    await client.awaitPendingTraceBatches();
    return Response.json({event_id:data.event_id,...(data.type==="session.end" ? {run_id:data.event_id,receipt:feedbackReceipt(data.thread_id,data.event_id)}:{})},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Trace not recorded"},{status:502});}
}
