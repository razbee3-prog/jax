import {it,expect} from "vitest";
import {debriefReports,summarySpeech} from "./debrief";
import {kcal} from "../session/shell";
import type {CoachDecision} from "../../../shared/coach-decision";
import type {RepReport} from "../../../shared/rep-report";
it("sends recorded set evidence and only the last report per set to summary",()=>{
  const one={rep:1} as RepReport,two={rep:2} as RepReport,three={rep:3} as RepReport;
  expect(debriefReports([[one,two],[],[three]],0)).toEqual({reports:[one,two]});expect(debriefReports([[one,two],[],[three]])).toEqual({reports:[two,three]});expect(debriefReports([[],[]])).toEqual({});expect(debriefReports([],3)).toEqual({});
});
it("keeps the client calorie sign-off authoritative when model text is absent or wrong",()=>{
  expect(summarySpeech(null,"Exact sign-off.")).toBe("Exact sign-off.");const d={speak:true,text:"Wrong calories.",summary:{went_well:"You completed your set.",next_time:"Keep framing."}} as CoachDecision;
  expect(summarySpeech(d,"Exact sign-off.")).toBe("You completed your set. Exact sign-off.");expect(summarySpeech({...d,text:"Highlight. Exact sign-off."},"Exact sign-off.")).toBe("Highlight. Exact sign-off.");
  expect(kcal(600000)).toBe(42);expect(kcal(60000)).toBe(4);expect(kcal(0)).toBe(0);expect(kcal(-1000)).toBe(0);
});
