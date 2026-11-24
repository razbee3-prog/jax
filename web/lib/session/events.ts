import {z} from "zod";
import {RepReportSchema} from "../../../shared/rep-report";
import {CoachDecisionSchema} from "../../../shared/coach-decision";
import {CoachEventSchema} from "../../../shared/coach-event";
export const eventTypes=["session.start","screen.view","permissions","onboarding.answer","onboarding.turn","setup.pass","setup.check","set.start","rep.detected","rep","set.end","session.pause","session.resume","session.end","utterance","coach.turn","cue.decision","pose.status","client.error"] as const;
export const ledgerItem=z.object({event_id:z.uuid(),type:z.enum(eventTypes)}).strict();
const scalar=z.union([z.string().max(16000),z.number().finite(),z.boolean(),z.null()]);
export const seriesSchema=z.array(z.object({t:z.number().nonnegative(),lm:z.array(z.tuple([z.number().finite(),z.number().finite(),z.number().min(0).max(1)])).length(13)}).strict()).max(151);
export const eventSchema=z.object({thread_id:z.uuidv7(),event_id:z.uuid(),type:z.enum(eventTypes),data:z.object({report:RepReportSchema.optional(),landmark_series:seriesSchema.optional(),manifest:z.array(ledgerItem).max(3000).optional(),decision:CoachDecisionSchema.nullable().optional(),event:CoachEventSchema.optional()}).catchall(scalar).refine(data=>!["video","image","audio","frames"].some(key=>key in data),"Media is not telemetry")}).strict();
export type TraceEvent=z.infer<typeof eventSchema>;
export type LedgerItem=z.infer<typeof ledgerItem>;
export type TraceData=Record<string,unknown>;
export function runName(type:string){return ({"onboarding.answer":"onboarding.turn","setup.pass":"setup.check"} as Record<string,string>)[type]??type;}
