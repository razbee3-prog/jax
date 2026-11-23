import { voiceAccess } from "../../../../lib/voice/access.server";
import {parseEvents,recordEvents} from "../../../../lib/session/telemetry.server";
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  let events;try{events=await parseEvents(request,false);}catch{return Response.json({error:"Invalid event"},{status:400});}
  if(!process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT)return Response.json({error:"Tracing unavailable"},{status:503});
  try{
    const result=await recordEvents(events,request);
    return Response.json({event_id:events[0].event_id,...(result.run_id ? {run_id:result.run_id,receipt:result.receipt}:{})},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Trace not recorded"},{status:502});}
}
