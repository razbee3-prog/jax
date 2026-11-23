import {createHmac,randomUUID,timingSafeEqual} from "node:crypto";
export function userIdentity(request:Request){
  const value=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith("jax_user="))?.slice(9);
  const [id,signature,...extra]=(value??"").split(".");
  if(!process.env.SESSION_SECRET || extra.length || !/^[0-9a-f-]{36}$/.test(id??"") || !/^[a-f0-9]{64}$/.test(signature??""))return null;
  const expected=createHmac("sha256",process.env.SESSION_SECRET).update(id).digest("hex");
  return timingSafeEqual(Buffer.from(signature),Buffer.from(expected)) ? id:null;
}
export function identifyUser(request:Request){
  if(!process.env.SESSION_SECRET)throw new Error("SESSION_SECRET required");
  const id=userIdentity(request)??randomUUID(),signature=createHmac("sha256",process.env.SESSION_SECRET).update(id).digest("hex");
  return {id,cookie:`jax_user=${id}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${process.env.NODE_ENV==="production" ? "; Secure":""}`};
}
