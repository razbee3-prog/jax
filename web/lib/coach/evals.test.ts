import {describe,it,expect} from "vitest";
import {buildCoachRows,contractReport,repEvent} from "../../../evals/datasets/coach";
import {aggregateHard,hardChecks,type EvaluatedTurn} from "../../../evals/evaluators/coach";
import {asksExpectedQuestion} from "../../../evals/evaluators/questions";
import {CoachEventSchema} from "../../../shared/coach-event";
import type {CoachDecision} from "../../../shared/coach-decision";
import {CUES} from "../../../shared/cues";
import {FAULTS,FAULT_IDS} from "../../../shared/faults";
import {FAULT_EVIDENCE} from "../pose/evidence";

const quiet:CoachDecision={speak:false,text:"",kind:"silence",fault_id:null,slots:null,reason:"No eligible fault",guidance:{action:"quiet",fault_id:null,text:""},summary:null};
const turn=(patch:Partial<EvaluatedTurn>={}):EvaluatedTurn=>({event:repEvent(contractReport("rdl",1)),decision:quiet,latency_ms:100,local:[],prior_corrections:{},previous_faults:[],...patch});
describe("M8 decision coverage",()=>{
  it("covers all potential Tier A faults and every negative gate without unlocking detectors",()=>{
    const evidence=structuredClone(FAULT_EVIDENCE),rows=buildCoachRows();expect(rows).toHaveLength(78);
    for(const id of FAULT_IDS){
      if(FAULTS[id].tier==="A")for(const suffix of ["first","fixed","persists","third"])expect(rows.some(row=>row.inputs.id===`${id}-${suffix}`)).toBe(true);
      else expect(rows.find(row=>row.inputs.id===`${id}-tier-b`)?.outputs.guidance).toBe("quiet");
    }
    for(const row of rows){
      expect(row.metadata.provenance).toBe("synthetic-contract");
      for(const event of [...row.inputs.history,row.inputs.event,...(row.inputs.followup??[]).map(s=>s.event)])expect(CoachEventSchema.safeParse(event).success).toBe(true);
    }
    expect(FAULT_EVIDENCE).toEqual(evidence);
  });
});
describe("M8 hard code checks",()=>{
  it.each([
    ["How much time do you have: 5, 10, or 20 minutes?","Would you like to start in 5, 10, or 20 mins?"],
    ["How much time do you have: 5, 10, or 20 minutes?","How about 5, 10, or 20 minutes?"],
    ["Do you have dumbbells with you?","Do you have dumbbells of any kind?"],
    ["Do you have dumbbells with you?","What kind of dumbbells do you have?"],
    ["How much time do you have: 5, 10, or 20 minutes?","Would you prefer a 5-, 10-, or 20-minute workout?"],
  ])("requires canonical copy instead of interpreting %s / %s",(expected,paraphrase)=>{
    expect(asksExpectedQuestion(paraphrase,expected)).toBe(false);
    expect(asksExpectedQuestion("Got it. "+expected,expected)).toBe(true);
  });
  it("matches only a normalized complete canonical question suffix",()=>{
    const expected="Do you have dumbbells with you?";
    expect(asksExpectedQuestion("Thanks! DO you have dumbbells, with   you?!",expected)).toBe(true);
    expect(asksExpectedQuestion(expected+" Thanks.",expected)).toBe(false);
    expect(asksExpectedQuestion("Do you have dumbbells?",expected)).toBe(false);
    expect(asksExpectedQuestion("",expected)).toBe(false);
    expect(asksExpectedQuestion("Anything?","")).toBe(false);
    expect(asksExpectedQuestion("anything","thing")).toBe(false);
  });
  it("requires the expected next onboarding question, not just correct slots and nonempty speech",()=>{
    const check=(next_question:string,text:string)=>hardChecks(turn({event:{type:"onboarding_answer",question:"injuries",transcript:"No injuries",next_question},decision:{...quiet,speak:true,kind:"question",guidance:null,text,slots:{focus:null,duration_min:null,injuries:[],has_dumbbells:null}}}),{speak:true,slot:{name:"injuries",value:[]}}).behavior;
    const dumbbells="Last one: do you have a pair of dumbbells with you?";
    expect(check(dumbbells,"Have a great day.")).toBe(0);
    expect(check(dumbbells,"Dumbbells are useful. How much time do you have?")).toBe(0);
    expect(check(dumbbells,"How heavy are your dumbbells?")).toBe(0);
    expect(check(dumbbells,"")).toBe(0);
    expect(check(dumbbells,dumbbells)).toBe(1);
    expect(check(dumbbells,"Thanks for letting me know. Are your weights available?")).toBe(0);
    expect(check("How much time do you have: 5, 10, or 20 minutes?","How much time do you have?")).toBe(0);
    expect(check("How much time do you have: 5, 10, or 20 minutes?","Would five, ten, or twenty minutes work for you?")).toBe(0);
    expect(check("Any injuries or anything you'd like me to be careful with?","Is there any pain I should know about?")).toBe(0);
    expect(check("What would you like to work on today?","What workout would you like today?")).toBe(0);
  });
  it("credits rest fault mentions only in the note the client actually speaks",()=>{
    const event={type:"set_end" as const,reports:[contractReport("rdl",3,["rdl_knee_squat"])]};
    const check=(text:string,next_time:string,went_well="You completed the set.")=>hardChecks(turn({event,decision:{...quiet,speak:true,kind:"summary",guidance:null,text,summary:{next_time,went_well}}}),{speak:true,mention:"rdl_knee_squat"}).behavior;
    expect(check("Too much knee bend.","Rest for a moment.")).toBe(0);
    expect(check("Rest.","Rest for a moment.","Too much knee bend.")).toBe(0);
    expect(check("Rest.","Too much knee bend.")).toBe(1);
    expect(check("Rest.","","Too much knee bend.")).toBe(1);
    expect(check("Rest.","")).toBe(0);
  });
  it("accepts deliberate quiet, rejects absent/incomplete results and malformed schemas",()=>{
    expect(Object.values(hardChecks(turn(),{speak:false,guidance:"quiet",local_speech:false}))).toEqual(Array(8).fill(1));
    expect(aggregateHard([],[])).toEqual({complete:0});
    expect(aggregateHard([turn()],[])).toEqual({complete:0});
    expect(Object.values(hardChecks(turn({decision:null}),{speak:false}))).toEqual(Array(8).fill(0));
    expect(hardChecks(turn({error:"HTTP 502"}),{speak:false}).schema).toBe(0);
  });
  it("checks the effective local acknowledgment against earlier flagged evidence",()=>{
    const result=hardChecks(turn({previous_faults:["rdl_knee_squat"],local:[{line:{id:"ack",text:CUES.rdl_knee_squat.fixed[0],faultId:"rdl_knee_squat",priority:"fixed",inSet:true},outcome:"played"}]}),{speak:false,guidance:"quiet",local_speech:true,local_kind:"fixed"});
    expect(Object.values(result).every(v=>v===1)).toBe(true);
  });
  it("rejects a fault ID not in the report, Tier B, provisional and low-quality guidance",()=>{
    for(const event of [repEvent(contractReport("rdl",1)),repEvent(contractReport("rdl",1,["rdl_back_round"])),repEvent(contractReport("rdl",1,["rdl_knee_squat"],"provisional")),repEvent({...contractReport("rdl",1,["rdl_knee_squat"]),quality:{visibility:0.4,fps:30,view_ok:true}})]){
      const id=event.report?.faults[0]?.id??"rdl_knee_squat";
      const result=hardChecks(turn({event,decision:{...quiet,guidance:{action:"focus",fault_id:id,text:""}}}),{speak:false});
      expect(result.fault_grounded).toBe(0);expect(result.no_unflagged_fault).toBe(0);
    }
  });
  it("rejects late-style spoken rep output, unapproved wording, excess words and a third correction",()=>{
    const event=repEvent(contractReport("rdl",3,["rdl_knee_squat"]));
    expect(hardChecks(turn({event,decision:{...quiet,speak:true,text:"Do this now",kind:"correction"}}),{speak:false}).speech_expected).toBe(0);
    expect(hardChecks(turn({event,decision:{...quiet,guidance:{action:"reminder",fault_id:"rdl_knee_squat",text:Array(15).fill("word").join(" ")}}}),{speak:false}).word_cap).toBe(0);
    expect(hardChecks(turn({event,decision:{...quiet,guidance:{action:"reminder",fault_id:"rdl_knee_squat",text:"invented wording"}}}),{speak:false}).no_unflagged_fault).toBe(0);
    expect(hardChecks(turn({event,prior_corrections:{rdl_knee_squat:2},decision:{...quiet,guidance:{action:"focus",fault_id:"rdl_knee_squat",text:""}}}),{speak:false}).no_third_cue).toBe(1);
    expect(hardChecks(turn({event,prior_corrections:{rdl_knee_squat:2},local:[{line:{id:"third",text:CUES.rdl_knee_squat.first[0],faultId:"rdl_knee_squat",priority:"correction",inSet:true},outcome:"played"}]}),{speak:false}).no_third_cue).toBe(0);
  });
  it("does not allow a flagged Tier-B claim at set end",()=>{
    const report=contractReport("rdl",1,["rdl_back_round"]),decision={...quiet,speak:true,kind:"rest" as const,fault_id:"rdl_back_round" as const,text:"Your back rounded.",guidance:null,summary:{went_well:"You finished.",next_time:"Your back rounded."}};
    const result=hardChecks(turn({event:{type:"set_end",reports:[report]},decision}),{speak:true});
    expect(result.fault_grounded).toBe(0);expect(result.no_unflagged_fault).toBe(0);
  });
  it("finds unflagged faults in prose and more than one fault in a line",()=>{
    const decision={...quiet,speak:true,kind:"summary" as const,guidance:null,text:"Your back rounded and your head dropped.",summary:{went_well:"You completed the set.",next_time:""}};
    const result=hardChecks(turn({event:{type:"set_end"},decision}),{speak:true});
    expect(result.no_unflagged_fault).toBe(0);expect(result.one_fault_per_line).toBe(0);
  });
});
