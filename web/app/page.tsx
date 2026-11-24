import { uuid7 } from "langsmith";
import {cookies} from "next/headers";
import {inviteAccess} from "../lib/voice/access.server";
import AppShell from "../components/shell/appShell";
import type { Screen } from "../lib/session/shell";
export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{fake?:string;deny?:string;preview?:string;poseDelegate?:string}>}){
  const query=await searchParams;
  const preview=query.fake==="1" && /^S[0-8]$/.test(query.preview??"") ? query.preview as Screen:undefined;
  const sessionId=uuid7();
  return <AppShell key={sessionId} sessionId={sessionId} authenticated={inviteAccess((await cookies()).toString())} appVersion={process.env.APP_VERSION??"0.0.0"} fake={query.fake==="1"} simulateDenial={query.deny==="1"} preview={preview} poseDelegate={query.poseDelegate==="CPU" ? "CPU":"GPU"}/>;
}
