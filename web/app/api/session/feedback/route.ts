import { Client } from "langsmith";
import { z } from "zod";
import { voiceAccess } from "../../../../lib/voice/access.server";
import { validReceipt } from "../../../../lib/session/feedback.server";
const input=z.object({thread_id:z.uuidv7(),run_id:z.uuid(),receipt:z.string(),score:z.union([z.literal(0),z.literal(1)])}).strict();
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid feedback"},{status:400});
  const data=parsed.data;if(!validReceipt(data.thread_id,data.run_id,data.receipt))return Response.json({error:"Invalid session receipt"},{status:403});
  if(!process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT)return Response.json({error:"Feedback unavailable"},{status:503});
  try{const client=new Client(),project=await client.readProject({projectName:process.env.LANGSMITH_PROJECT});await client.createFeedback({runId:data.run_id,traceId:data.run_id,sessionId:project.id,key:"coaching_helpful",score:data.score,feedbackSourceType:"app",sourceInfo:{thread_id:data.thread_id,source:"shell"}});await client.awaitPendingTraceBatches();return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({error:"Feedback not recorded"},{status:502});}
}
