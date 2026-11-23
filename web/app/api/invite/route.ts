import { inviteCookie } from "../../../lib/voice/access.server";
import {identifyUser} from "../../../lib/coach/identity.server";
export async function POST(request: Request) {
  const expected = process.env.INVITE_CODE;
  if (!expected) return Response.json({ error: "Invite service unavailable" }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("code" in body) || typeof body.code !== "string" || !body.code.trim()) {
    return Response.json({ error: "Invite code required" }, { status: 400 });
  }
  if (body.code.trim().toLowerCase() !== expected.trim().toLowerCase()) return Response.json({ error: "That code didn't work." }, { status: 401 });
  if(!process.env.SESSION_SECRET)return Response.json({error:"Invite service unavailable"},{status:503});
  const user=identifyUser(request),headers=new Headers();headers.append("Set-Cookie",inviteCookie());headers.append("Set-Cookie",user.cookie);
  return Response.json({ ok:true,user_id:user.id },{headers});
}
