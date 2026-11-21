import { uuid7 } from "langsmith";
import VoiceLab from "./voiceLab";
export const dynamic="force-dynamic";
export default function Page(){return <VoiceLab sessionId={uuid7()}/>;}
