import {timingSafeEqual} from "node:crypto";
import {Client} from "langsmith";
import {z} from "zod";
import {readSession} from "../../../../lib/session/audit.server";
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const key=process.env.ADMIN_KEY,authorization=request.headers.get("authorization")??"",credentials=authorization.startsWith("Basic ") ? Buffer.from(authorization.slice(6),"base64").toString():"",provided=credentials.slice(credentials.indexOf(":")+1);
  if(!key || !credentials.startsWith("admin:") || Buffer.byteLength(key)!==Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(key),Buffer.from(provided)))return new Response("Admin authentication required",{status:401,headers:{"WWW-Authenticate":'Basic realm="Jax sessions"',"Cache-Control":"no-store"}});
  const {id}=await params;if(!z.uuidv7().safeParse(id).success)return new Response("Invalid session",{status:400});
  try{const {result,runs}=await readSession(new Client(),id);if(!runs.length)return new Response("Session not found",{status:404});
    return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jax · Session audit</title><style>body{background:#0c0c10;color:#f5f5f7;font:16px system-ui;margin:24px;overflow-wrap:anywhere}h1{font-size:30px}p{line-height:1.6}.fail{color:#ff8585}.pass{color:#caddfc}li{margin:12px 0}small{color:#aaa}</style><h1>Session audit</h1><p><small>${escape(id)}</small></p><h2 class="${result.pass ? "pass":"fail"}">${result.pass ? "PASS":"FAIL"} · ${result.recorded} of ${result.expected} recorded</h2>${"reason" in result ? `<p>${escape(result.reason)}</p>`:""}<h2>Missing events</h2><ul>${result.missing.map(e=>`<li>${escape(e.type)}<br><small>${escape(e.event_id)}</small></li>`).join("") || "<li>None</li>"}</ul><h2>Recorded runs</h2><ul>${runs.map(r=>`<li>${escape(r.name)}${r.error ? " · error":""}</li>`).join("")}</ul></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'","X-Robots-Tag":"noindex"}});
  }catch{return new Response("Audit service unavailable",{status:503});}
}
