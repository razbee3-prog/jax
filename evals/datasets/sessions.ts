export type SessionInput={id:string;agent_outage:boolean;reps_per_set:10;exercises:["rdl","push-press","curl","push-up"];onboarding:"chips";camera:"demo-clips"};
export function buildSessionRows(){
  return [false,true].map(agent_outage=>({inputs:{id:agent_outage ? "agent-outage":"healthy-agent",agent_outage,reps_per_set:10 as const,exercises:["rdl","push-press","curl","push-up"] as SessionInput["exercises"],onboarding:"chips" as const,camera:"demo-clips" as const},outputs:{reps:40,talk_ratio_min:0.25,talk_ratio_max:0.55,rep_to_audio_p95_ms:2500,audit_pass:true},metadata:{provenance:"demo-replay",real_device:false,live_tts:true,live_telemetry:true,live_agent:!agent_outage}}));
}
