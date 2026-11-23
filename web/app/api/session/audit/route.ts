import {z} from "zod";
import {voiceAccess} from "../../../../lib/voice/access.server";
import {validReceipt} from "../../../../lib/session/feedback.server";
import {finishAudit} from "../../../../lib/session/audit.server";
import {ledgerItem} from "../../../../lib/session/events";
export const maxDuration=90;
const input=z.object({thread_id:z.uuidv7(),run_id:z.uuid(),receipt:z.string(),ledger:z.array(ledgerItem).min(1).max(3000)}).strict();
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  const text=await request.text();if(text.length>256000)return Response.json({error:"Ledger too large"},{status:413});
  let body;try{body=input.parse(JSON.parse(text));}catch{return Response.json({error:"Invalid ledger"},{status:400});}
  if(!validReceipt(body.thread_id,body.run_id,body.receipt))return Response.json({error:"Invalid receipt"},{status:403});
  if(!body.ledger.some(e=>e.type==="session.end" && e.event_id===body.run_id) || new Set(body.ledger.map(e=>e.event_id)).size!==body.ledger.length)return Response.json({error:"Invalid manifest"},{status:400});
  try{return Response.json(await finishAudit(body.thread_id,body.run_id,body.ledger),{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Audit or alert service unavailable"},{status:502});}
}
