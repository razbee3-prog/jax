import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const name="jax_invite";
export function inviteCookie() {
  const secret=process.env.SESSION_SECRET;
  if(!secret)throw new Error("SESSION_SECRET is required");
  const value=`${Date.now()+86400000}.${randomBytes(16).toString("hex")}`;
  const signed=`${value}.${createHmac("sha256",secret).update(value).digest("hex")}`;
  return `${name}=${signed}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export function voiceAccess(request:Request) {
  const origin=request.headers.get("origin"),url=new URL(request.url);
  const host=request.headers.get("x-forwarded-host")??request.headers.get("host")??url.host;
  const protocol=request.headers.get("x-forwarded-proto")??url.protocol.slice(0,-1);
  if(origin && origin !== `${protocol}://${host}`)return false;
  return inviteAccess(request.headers.get("cookie")??"");
}
export function inviteAccess(cookie:string){
  const secret=process.env.SESSION_SECRET;if(!secret)return false;
  const token=cookie.split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="))?.slice(name.length+1) ?? "";
  const [expires,nonce,signature,...extra]=token.split(".");
  if(extra.length || !expires || !nonce || !signature || !/^[a-f0-9]{64}$/.test(signature) || !/^\d+$/.test(expires) || Number(expires)<=Date.now())return false;
  const expected=createHmac("sha256",secret).update(`${expires}.${nonce}`).digest("hex");
  return signature.length===expected.length && timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
