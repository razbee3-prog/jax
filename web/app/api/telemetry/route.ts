import {voiceAccess} from "../../../lib/voice/access.server";
import {parseEvents,recordEvents} from "../../../lib/session/telemetry.server";
import {logApiError} from "../../../lib/session/errors.server";
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  let events;try{events=await parseEvents(request,true);}catch(error){logApiError("/api/telemetry",error,request,{status:400});return Response.json({error:"Invalid telemetry"},{status:400});}
  if(!process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT)return Response.json({error:"Tracing unavailable"},{status:503});
  if(new Set(events.map(e=>e.thread_id)).size!==1)return Response.json({error:"Mixed sessions"},{status:400});
  if(new Set(events.map(e=>e.event_id)).size!==events.length)return Response.json({error:"Duplicate event IDs"},{status:400});
  try{return Response.json(await recordEvents(events,request),{headers:{"Cache-Control":"no-store"}});}catch(error){logApiError("/api/telemetry",error,request,{thread_id:events[0].thread_id,status:502});return Response.json({error:"Trace not recorded"},{status:502});}
}
