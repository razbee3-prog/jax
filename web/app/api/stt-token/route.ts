import { voiceAccess } from "../../../lib/voice/access.server";
export async function POST(request:Request){
  if(!voiceAccess(request))return Response.json({error:"Invite required"},{status:401});
  if(!process.env.ELEVENLABS_API_KEY)return Response.json({error:"Voice service unavailable"},{status:503});
  try{
    const response=await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",{method:"POST",headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error("Token unavailable");
    const data=await response.json();if(typeof data.token!=="string" || !data.token)throw new Error("Token unavailable");
    return Response.json({token:data.token,expires_in:900},{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Transcription unavailable"},{status:502});}
}
