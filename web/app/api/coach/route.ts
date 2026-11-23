import {Client} from "langsmith";
import {traceable} from "langsmith/traceable";
import {z} from "zod";
import {CoachEventSchema} from "../../../../shared/coach-event";
import {agentClient,parseDecision,repRunConfig} from "../../../lib/coach/agent.server";
import {voiceAccess} from "../../../lib/voice/access.server";
import {userIdentity} from "../../../lib/coach/identity.server";
export const maxDuration=90;
const input=z.object({thread_id:z.uuidv7(),event_id:z.uuid(),event:CoachEventSchema}).strict();
const active=new Set<string>();
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  const user=userIdentity(request);if(!user)return Response.json({error:"Identity required"},{status:401});
  const text=await request.text();if(text.length>64000)return Response.json({error:"Event too large"},{status:413});
  let body:unknown;try{body=JSON.parse(text);}catch{return Response.json({error:"Invalid event"},{status:400});}
  const parsed=input.safeParse(body);if(!parsed.success)return Response.json({error:"Invalid event"},{status:400});
  const {thread_id,event_id,event}=parsed.data,key=`${user}:${thread_id}`;
  if(active.has(key))return Response.json({error:"Turn in flight"},{status:409});
  active.add(key);let traces:Client|undefined;
  try{
    const client=agentClient(user);traces=new Client();
    const start=performance.now();
    const decision=await traceable(async()=>{
      const thread=await client.threads.create({threadId:thread_id,ifExists:"do_nothing",metadata:{user_id:user}});
      if(thread.metadata?.user_id!==user)throw new Error("Thread identity mismatch");
      const state=await client.runs.wait(thread_id,"jax-coach",{input:{messages:[{role:"user",content:JSON.stringify(event)}]},metadata:{thread_id,session_id:thread_id,event_id,event_type:event.type},multitaskStrategy:"reject",...repRunConfig(event.type,process.env.JAX_AGENT_PROFILE??"trim") });
      return parseDecision(state as Record<string,unknown>);
    },{name:"coach.request",client:traces,tracingEnabled:true,project_name:process.env.LANGSMITH_PROJECT,metadata:{thread_id,event_id,source:"agent",event_type:event.type}})();
    return Response.json({decision,latency_ms:performance.now()-start},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Coach unavailable",source:"fallback"},{status:502});}
  finally{active.delete(key);await traces?.awaitPendingTraceBatches().catch(()=>{});}
}
