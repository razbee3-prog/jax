import { uuid7 } from "langsmith";
import AppShell from "../components/shell/appShell";
import type { Screen } from "../lib/session/shell";
export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{fake?:string;deny?:string;preview?:string}>}){
  const query=await searchParams;
  const preview=query.fake==="1" && /^S[0-8]$/.test(query.preview??"") ? query.preview as Screen:undefined;
  const sessionId=uuid7();
  return <AppShell key={sessionId} sessionId={sessionId} fake={query.fake==="1"} simulateDenial={query.deny==="1"} preview={preview}/>;
}
