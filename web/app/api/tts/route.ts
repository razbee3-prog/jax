import { voiceAccess } from "../../../lib/voice/access.server";
import { synthesize } from "../../../lib/voice/provider.server";
import { z } from "zod";
import {logApiError} from "../../../lib/session/errors.server";
const input=z.object({text:z.string().trim().min(1).max(500)}).strict();
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Provide 1–500 characters of text"},{status:400});
  try{return await synthesize(parsed.data.text,request.signal);}catch(error){logApiError("/api/tts",error,request);return Response.json({error:"Voice service unavailable"},{status:502});}
}
