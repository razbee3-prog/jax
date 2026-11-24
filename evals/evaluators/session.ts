export type SimEvent={thread_id:string;event_id:string;type:string;data:Record<string,unknown>};
export function latencyPercentiles(values:number[]){
  if(!values.length)return null;
  if(values.some(v=>!Number.isFinite(v) || v<0))throw new Error("Latency samples must be finite and nonnegative");
  const sorted=[...values].sort((a,b)=>a-b),q=(p:number)=>sorted[Math.ceil(sorted.length*p)-1];
  return {n:sorted.length,p50_ms:q(0.5),p95_ms:q(0.95),max_ms:sorted.at(-1)!};
}
export function sessionMetrics(input:SimEvent[]){
  const events=[...new Map(input.map(event=>[event.event_id,event])).values()];
  const reps=events.filter(e=>e.type==="rep.detected"),utterances=events.filter(e=>e.type==="utterance" && e.data.outcome==="played" && e.data.in_set===true);
  const exercises=["rdl","push-press","curl","push-up"];
  const tagged=utterances.filter(e=>exercises.includes(String(e.data.exercise)) && Number.isInteger(e.data.rep) && Number(e.data.rep)>=1 && Number(e.data.rep)<=10);
  const valid=tagged.filter(e=>{
    const d=e.data,finite=(key:string)=>typeof d[key]==="number" && Number.isFinite(d[key]);
    return exercises.includes(String(d.exercise)) && Number.isInteger(d.rep) && Number(d.rep)>=1 && Number(d.rep)<=10 && ["rep_to_audio_ms","rep_at_ms","audio_started_at_ms","ended_at_ms","ttfa_ms"].every(finite) && Number(d.rep_to_audio_ms)>=0 && Number(d.ttfa_ms)>=0 && Number(d.ended_at_ms)>=Number(d.audio_started_at_ms) && Math.abs(Number(d.audio_started_at_ms)-Number(d.rep_at_ms)-Number(d.rep_to_audio_ms))<1;
  });
  const per_set=exercises.map(exercise=>{
    const counted=reps.filter(e=>e.data.exercise===exercise),spoken=new Set(tagged.filter(e=>e.data.exercise===exercise).map(e=>Number(e.data.rep)));
    return {exercise,reps:counted.length,spoken_reps:spoken.size,talk_ratio:counted.length ? spoken.size/counted.length:0};
  });
  const ordered=[...valid].sort((a,b)=>Number(a.data.audio_started_at_ms)-Number(b.data.audio_started_at_ms));
  const gaps=ordered.slice(1).map((event,i)=>Number(event.data.audio_started_at_ms)-Number(ordered[i].data.ended_at_ms));
  const samples=(type:string,key:string)=>events.filter(e=>e.type===type && typeof e.data[key]==="number").map(e=>Number(e.data[key]));
  const guidance=events.filter(e=>e.type==="coach.turn" && e.data.event_type==="rep" && e.data.source==="agent").map(e=>Number(e.data.latency_ms));
  return {
    reps:reps.length,per_set,played_inset_lines:utterances.length,measured_inset_lines:valid.length,
    rep_to_audio:latencyPercentiles(valid.map(e=>Number(e.data.rep_to_audio_ms))),
    ttfa:latencyPercentiles(valid.map(e=>Number(e.data.ttfa_ms))),
    local_decision:latencyPercentiles(samples("cue.decision","latency_ms")),
    background_guidance:latencyPercentiles(guidance),
    fallback_rep_turns:events.filter(e=>e.type==="coach.turn" && e.data.event_type==="rep" && e.data.source==="fallback").length,
    min_gap_ms:gaps.length ? Math.min(...gaps):null,
    talk_ratio_pass:tagged.length===utterances.length && per_set.every(set=>set.reps===10 && set.talk_ratio>=0.25 && set.talk_ratio<=0.55),
    latency_pass:utterances.length>0 && valid.length===utterances.length && latencyPercentiles(valid.map(e=>Number(e.data.rep_to_audio_ms)))!.p95_ms<=2500,
    gap_pass:valid.length===utterances.length && gaps.length>0 && gaps.every(gap=>gap>=3500),
    measurement:"browser output-volume meter; not iPhone acoustic latency",
  };
}
