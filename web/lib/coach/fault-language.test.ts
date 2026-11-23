import {describe,it,expect} from "vitest";
import {claimedFaults,namedFaults} from "../../../evals/evaluators/fault-language";
import {hardChecks,type EvaluatedTurn} from "../../../evals/evaluators/coach";
import {contractReport} from "../../../evals/datasets/coach";
import {FAULTS,type FaultId} from "../../../shared/faults";

const paraphrases={
  "rdl_back_round": "Your back curved during the hinge.",
  "rdl_knee_squat": "The knees bent a little more than the hinge needed on these reps.",
  "rdl_drift": "The weights moved away from your shins.",
  "rdl_shallow": "The hinge stopped short of its target.",
  "rdl_fast": "The hinge sped up on the descent.",
  "pp_chest_forward": "Your chest tilted forward during the dip.",
  "pp_dip_deep": "The dip went deeper than the target on these reps.",
  "pp_no_legs": "Leg drive was missing on the press.",
  "pp_soft_lockout": "The press stopped short at the top.",
  "pp_lean_back": "Your torso leaned back under the weights.",
  "pp_press_early": "The arms moved ahead of the legs.",
  "curl_swing": "Your torso rocked during the curl.",
  "curl_elbow_drift": "Your elbows crept forward as the weights rose.",
  "curl_partial": "The curls stopped short of the full range.",
  "curl_drop": "The lowering phase came down quickly on these reps.",
  "pu_hip_sag": "The hips sank below the plank line.",
  "pu_hip_pike": "The hips rose above the plank line.",
  "pu_shallow": "The push-ups stopped short of their depth target.",
  "pu_head_drop": "Your chin dipped toward the floor."
};
describe("fault-specific rest language",()=>{
  for(const [id,text] of Object.entries(paraphrases) as [FaultId,string][]){
    it(`recognizes ${id} paraphrases without accepting unrelated lines`,()=>{
      expect(namedFaults(text)).toEqual([id]);expect(claimedFaults(text)).toEqual([id]);
      for(const unrelated of ["","You completed the set. Take a breath.","That was difficult, but you finished.","Keep going toward your goal."]){expect(namedFaults(unrelated)).not.toContain(id);expect(claimedFaults(unrelated)).not.toContain(id);}
      const report=contractReport(FAULTS[id].exercise,3,[id]),decision={speak:true,text:"You finished the set.",kind:"summary",fault_id:null,slots:null,reason:"One observed issue",guidance:null,summary:{went_well:"You completed three reps.",next_time:text}};
      const turn:EvaluatedTurn={event:{type:"set_end",reports:[report]},decision,latency_ms:100,local:[],prior_corrections:{},previous_faults:[]};
      const grounded=hardChecks(turn,{speak:true,mention:id});expect(grounded.behavior).toBe(1);expect(grounded.no_unflagged_fault).toBe(FAULTS[id].tier==="A" ? 1:0);
      expect(hardChecks({...turn,event:{type:"set_end",reports:[{...report,faults:[]}]}},{speak:true}).no_unflagged_fault).toBe(0);
      expect(hardChecks({...turn,decision:{...decision,summary:{...decision.summary,next_time:"You completed the set."}}},{speak:true,mention:id}).behavior).toBe(0);
      for(const [other,unrelated] of Object.entries(paraphrases))if(other!==id)expect(hardChecks({...turn,decision:{...decision,summary:{...decision.summary,next_time:unrelated}}},{speak:true,mention:id}).behavior).toBe(0);
    });
  }
});
