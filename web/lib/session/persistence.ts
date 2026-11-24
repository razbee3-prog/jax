import {z} from "zod";
import {RepReportSchema} from "../../../shared/rep-report";
import {FAULTS,type FaultId} from "../../../shared/faults";
import {eventSchema,ledgerItem} from "./events";
import type {ShellState} from "./shell";
export const WORKOUT_KEY="jax.workout.v1",MAX_SAVED_AGE=2*60*60*1000;
const count=z.number().int().min(0).max(10),time=z.number().finite().nonnegative(),fault=z.enum(Object.keys(FAULTS) as [FaultId,...FaultId[]]);
export const shellCheckpoint=z.object({screen:z.enum(["S1","S2","S3","S4","S5","S6","S7"]),question:z.number().int().min(0).max(3),answers:z.array(z.string().max(2000)).max(4),exercise:z.number().int().min(0).max(3),reps:z.array(count).length(4),paused:z.boolean(),pauseReason:z.string().max(2000),inFrame:z.boolean(),fakeReps:z.boolean(),missingMs:time,holdMs:time,floor:z.boolean(),introMs:time,restMs:time,repMs:time,idleMs:time,elapsedMs:time,lastRepMs:time,started:z.boolean()}).strict();
export const savedWorkout=z.object({format:z.literal(1),version:z.string(),updatedAt:time,thread_id:z.uuidv7(),fake:z.boolean(),setElapsedMs:time,shell:shellCheckpoint,ledger:z.object({events:z.array(ledgerItem).max(30000),acknowledged:z.array(z.uuid()).max(30000),pending:z.array(eventSchema).max(30000),receipt:z.object({run_id:z.uuid(),receipt:z.string()}).nullable()}),coach:z.object({reports:z.array(z.array(RepReportSchema).max(10)).length(4),injuries:z.array(z.string().max(2000)).max(20),captions:z.record(z.string(),z.string().max(4000)),hybrid:z.object({setId:z.string(),policy:z.object({cues:z.partialRecord(fault,z.number().int().min(0).max(2)),active:fault.optional(),lastRep:count,exercise:z.string().optional()})}).optional()})}).strict();
export type SavedWorkout=z.infer<typeof savedWorkout>;
type Store=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export function clearWorkout(store?:Store){try{(store??localStorage).removeItem(WORKOUT_KEY);return true;}catch{return false;}}
export function readWorkout(version:string,fake:boolean,store?:Store,now=Date.now()):SavedWorkout|null{
  try{const raw=(store??localStorage).getItem(WORKOUT_KEY);if(!raw)return null;const saved=savedWorkout.parse(JSON.parse(raw));if(saved.version!==version || saved.fake!==fake || now-saved.updatedAt>MAX_SAVED_AGE || saved.updatedAt>now+60000)throw new Error("Expired workout");
    const ids=new Map(saved.ledger.events.map(e=>[e.event_id,e.type])),acked=new Set(saved.ledger.acknowledged),pending=new Map(saved.ledger.pending.map(e=>[e.event_id,e]));
    if(ids.size!==saved.ledger.events.length || acked.size!==saved.ledger.acknowledged.length || pending.size!==saved.ledger.pending.length || saved.ledger.acknowledged.some(id=>!ids.has(id)) || saved.ledger.pending.some(e=>e.thread_id!==saved.thread_id || ids.get(e.event_id)!==e.type || acked.has(e.event_id)) || [...ids.keys()].some(id=>!acked.has(id) && !pending.has(id)) || saved.ledger.events.some(e=>e.type==="session.end"))throw new Error("Invalid ledger");
    return saved;
  }catch{clearWorkout(store);return null;}
}
export function writeWorkout(saved:SavedWorkout,store?:Store){try{(store??localStorage).setItem(WORKOUT_KEY,JSON.stringify(saved));return true;}catch{return false;}}
export function resumedShell(saved:ShellState,fake:boolean):ShellState{return {...saved,paused:saved.screen==="S6" || saved.paused,pauseReason:saved.screen==="S6" ? "Workout restored. Tap to resume this set.":saved.pauseReason,inFrame:fake ? saved.inFrame:false};}
