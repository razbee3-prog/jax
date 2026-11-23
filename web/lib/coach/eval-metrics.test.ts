import {describe,it,expect,vi} from "vitest";
import {runInNewContext} from "node:vm";
import {sessionMetrics,latencyPercentiles,type SimEvent} from "../../../evals/evaluators/session";
import {onlineCode} from "../../../evals/evaluators/online";
import {judgeMean,JUDGE_MODEL} from "../../../evals/evaluators/judge";
import {SpeechQueue} from "../voice/speechQueue";

function event(type:string,data:Record<string,unknown>):SimEvent{return {thread_id:"fixture",event_id:crypto.randomUUID(),type,data};}
describe("M8 measured session gates",()=>{
  it("requires complete samples, never substitutes zero for an empty latency sample",()=>{
    expect(latencyPercentiles([])).toBeNull();expect(()=>latencyPercentiles([NaN])).toThrow();expect(()=>latencyPercentiles([-1])).toThrow();
    const empty=sessionMetrics([]);expect(empty.latency_pass).toBe(false);expect(empty.talk_ratio_pass).toBe(false);expect(empty.gap_pass).toBe(false);
  });
  it("scores actual played reps per set and output-meter latency, not candidate cue counts",()=>{
    let at=0;const events:SimEvent[]=[];
    for(const exercise of ["rdl","push-press","curl","push-up"])for(let rep=1;rep<=10;rep++){
      at+=8000;events.push(event("rep.detected",{exercise,count:rep}));
      if([5,8,10].includes(rep))events.push(event("utterance",{exercise,rep,in_set:true,outcome:"played",rep_to_audio_ms:100,rep_at_ms:at,ttfa_ms:80,audio_started_at_ms:at+100,ended_at_ms:at+500}));
      else events.push(event("utterance",{exercise,rep,in_set:true,outcome:"dropped",reason:"silent decision"}));
    }
    const result=sessionMetrics(events);expect(result.reps).toBe(40);expect(result.per_set.every(set=>set.talk_ratio===0.3)).toBe(true);
    expect(result.latency_pass).toBe(true);expect(result.talk_ratio_pass).toBe(true);expect(result.gap_pass).toBe(true);expect(result.rep_to_audio?.p95_ms).toBe(100);
    expect(sessionMetrics([...events,...events]).per_set).toEqual(result.per_set);
    const missing=structuredClone(events);delete missing.find(e=>e.type==="utterance" && e.data.outcome==="played")!.data.rep_to_audio_ms;
    expect(sessionMetrics(missing).latency_pass).toBe(false);
    expect(sessionMetrics(missing).talk_ratio_pass).toBe(true);expect(sessionMetrics(missing).gap_pass).toBe(false);
    const slow=structuredClone(events);slow.filter(e=>e.data.outcome==="played").forEach(e=>{e.data.rep_to_audio_ms=2501;});expect(sessionMetrics(slow).latency_pass).toBe(false);
  });
  it("keeps the absolute audio-onset timestamp and rep context through the real queue",async()=>{
    const log=vi.fn(),queue=new SpeechQueue(async(_line,_signal,beforeAudio)=>{beforeAudio();return {ttfa_ms:90,cache:"MEMORY",audio_started_at_ms:190};},log,()=>100);
    queue.enqueue({id:"line",text:"Five. Halfway.",inSet:true,priority:"milestone",repAt:100,rep:5,exercise:"rdl"});
    await vi.waitFor(()=>expect(log).toHaveBeenCalledOnce());
    expect(log.mock.calls[0][0]).toMatchObject({outcome:"played",audio_started_at_ms:190,line:{repAt:100,rep:5,exercise:"rdl"}});queue.close();
  });
});
describe("M8 deployable online code",()=>{
  const evaluate=runInNewContext(`(${onlineCode()})`) as (run:Record<string,unknown>)=>Record<string,number>;
  const decision={speak:false,text:"",kind:"silence",fault_id:null,slots:null,reason:"Quiet",guidance:{action:"quiet",fault_id:null,text:""},summary:null};
  const run={outputs:decision,extra:{metadata:{event_type:"rep"}},start_time:"2026-01-01T00:00:00.000Z",end_time:"2026-01-01T00:00:02.000Z"};
  it("runs without imports and handles valid, empty, malformed and slow traces",()=>{
    expect(evaluate(run)).toMatchObject({coach_schema_valid:1,coach_inset_word_cap:1,coach_turn_latency_ms:2000,coach_turn_under_deadline:1});
    expect(evaluate({}).coach_schema_valid).toBe(0);
    expect(evaluate({...run,outputs:{...decision,extra:"invalid"}}).coach_schema_valid).toBe(0);
    expect(evaluate({...run,outputs:{...decision,guidance:{action:"quiet",fault_id:null,text:Array(15).fill("word").join(" ")}}}).coach_inset_word_cap).toBe(0);
    expect(evaluate({...run,end_time:"2026-01-01T00:00:04.001Z"}).coach_turn_under_deadline).toBe(0);
    expect(evaluate({...run,end_time:"invalid"}).coach_turn_latency_valid).toBe(0);
  });
});
describe("M8 Haiku judge",()=>{
  it("uses the required cheapest model and enforces four 1–5 dimensions",()=>{
    expect(JUDGE_MODEL).toBe("claude-haiku-5-5");
    expect(judgeMean({warmth:4,external_focus:5,fits_moment:4,not_annoying:5,explanation:"Appropriate restraint."})).toBe(4.5);
    expect(()=>judgeMean({warmth:6})).toThrow();
  });
});
