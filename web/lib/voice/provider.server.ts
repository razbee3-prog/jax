import { createHash } from "node:crypto";
const fallback="eleven_flash_v2_5",limit=16*1024*1024;
const cache=new Map<string,{bytes:Uint8Array;at:number}>();
const resolved=new Map<string,{model:string;until:number}>();
let total=0;
export function clearVoiceCache(){cache.clear();resolved.clear();total=0;}
export function voiceCacheKey(text:string,voice:string,model:string){return createHash("sha256").update(JSON.stringify([text,voice,model])).digest("hex");}
function put(key:string,bytes:Uint8Array){
  if(bytes.length>limit)return;
  const old=cache.get(key);if(old)total-=old.bytes.length;
  cache.delete(key);cache.set(key,{bytes,at:Date.now()});total+=bytes.length;
  while(total>limit){const first=cache.keys().next().value!;total-=cache.get(first)!.bytes.length;cache.delete(first);}
}
export async function synthesize(text:string,signal?:AbortSignal){
  const key=process.env.ELEVENLABS_API_KEY,voice=process.env.ELEVENLABS_VOICE_ID;
  if(!key || !voice)throw new Error("Voice service unavailable");
  const configured=process.env.ELEVENLABS_TTS_MODEL || "eleven_v4_turbo";
  const resolution=resolved.get(`${voice}:${configured}`);
  let model=resolution && resolution.until>Date.now() ? resolution.model : configured;
  const headers=()=>({"Content-Type":"audio/pcm","Cache-Control":"private, no-store","X-TTS-Model":model,"X-TTS-Key":voiceCacheKey(text,voice,model),"X-Audio-Sample-Rate":"24000"});
  const cached=cache.get(voiceCacheKey(text,voice,model));
  if(cached && Date.now()-cached.at<86400000){put(voiceCacheKey(text,voice,model),cached.bytes);return new Response(cached.bytes.slice(),{headers:{...headers(),"X-TTS-Cache":"HIT"}});}
  async function upstream(id:string){return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice!)}/stream?output_format=pcm_24000`,{method:"POST",headers:{"xi-api-key":key!,"Content-Type":"application/json"},body:JSON.stringify({text,model_id:id}),signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)});}
  let response=await upstream(model);
  if(!response.ok && model!==fallback){
    const detail=await response.text();
    if([400,404,422].includes(response.status) && /model.{0,60}(not|invalid|unavailable|unsupported|error)|invalid_model/i.test(detail)){
      model=fallback;resolved.set(`${voice}:${configured}`,{model,until:Date.now()+300000});
      const hit=cache.get(voiceCacheKey(text,voice,model));
      if(hit && Date.now()-hit.at<86400000)return new Response(hit.bytes.slice(),{headers:{...headers(),"X-TTS-Cache":"HIT"}});
      response=await upstream(model);
    }
  }
  if(!response.ok || !response.body)throw new Error("Speech provider unavailable");
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  const body=new ReadableStream<Uint8Array>({
    async pull(controller){try{
      const {done,value}=await reader.read();
      if(done){if(size && size<=limit){const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}put(voiceCacheKey(text,voice,model),bytes);}controller.close();return;}
      size+=value.length;if(size<=limit)chunks.push(value.slice());else chunks.length=0;
      controller.enqueue(value);
    }catch{controller.error(new Error("Speech stream interrupted"));}},
    cancel(){chunks.length=0;return reader.cancel();},
  });
  return new Response(body,{headers:{...headers(),"X-TTS-Cache":"MISS"}});
}
