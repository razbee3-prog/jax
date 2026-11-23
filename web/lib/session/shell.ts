import type { Exercise } from "../pose/types";
import {STEP_BACK_LINE} from "../voice/fixedLines";
export const MOVES:readonly {id:Exercise;name:string;plural:string;cue:string}[]=[
  {id:"rdl",name:"Dumbbell Romanian deadlift",plural:"Romanian deadlifts",cue:"Feet hip-width, soft knees, weights in front of your thighs."},
  {id:"push-press",name:"Dumbbell push press",plural:"push presses",cue:"Weights at your shoulders. Dip, then drive them overhead."},
  {id:"curl",name:"Dumbbell bicep curl",plural:"bicep curls",cue:"Stand tall. Keep your elbows by your sides."},
  {id:"push-up",name:"Push-up",plural:"push-ups",cue:"Hands below your shoulders. Make a straight line from head to heels."},
];
export const GREETING="Hey, it's Jax. Let's put a workout together. What would you like to work on today: upper body, lower body, or full body?";
export const SETUP="Prop your phone against a wall, about hip height. Step back until I can see your whole body, then turn sideways to me.";
export const FLOOR="For push-ups, put the phone on the floor, leaning against something, and get side-on to me.";
export const BRIEF="Here's what we're working on today: Romanian deadlifts, push presses, bicep curls, and push-ups. One set of each, 10 reps each. I'll count and watch your form. For this pilot, everyone gets the same four moves.";
export type Screen="S0"|"S1"|"S2"|"S3"|"S4"|"S5"|"S6"|"S7"|"S8";
export type ShellState={screen:Screen;question:number;answers:string[];exercise:number;reps:number[];paused:boolean;pauseReason:string;inFrame:boolean;fakeReps:boolean;missingMs:number;holdMs:number;floor:boolean;introMs:number;restMs:number;repMs:number;idleMs:number;elapsedMs:number;lastRepMs:number;started:boolean};
export const initialShell:ShellState={screen:"S0",question:0,answers:[],exercise:0,reps:[0,0,0,0],paused:false,pauseReason:"",inFrame:true,fakeReps:true,missingMs:0,holdMs:0,floor:false,introMs:0,restMs:20000,repMs:0,idleMs:0,elapsedMs:0,lastRepMs:0,started:false};
export function previewState(screen?:Screen):ShellState{return !screen ? initialShell:{...initialShell,screen,answers:["full body","10","No injuries","Yes"],holdMs:screen==="S3" ? 1500:0,reps:screen==="S8" ? [10,10,10,10]:screen==="S6" ? [3,0,0,0]:[0,0,0,0],elapsedMs:screen==="S8" ? 135000:0,lastRepMs:screen==="S8" ? 135000:0};}
export type ShellAction={type:"invite"|"permissions"|"continue"|"skip"|"end"|"pause"|"resume"|"floor"|"intro-complete"|"rep"}|{type:"answer";value:string}|{type:"frame"|"source";value:boolean}|{type:"intro-step";value:number}|{type:"tick";ms:number;introClock?:boolean};
function finishSet(s:ShellState):ShellState{return {...s,screen:s.exercise===3 ? "S8":"S7",restMs:20000,paused:false,repMs:0,idleMs:0};}
function nextIntro(s:ShellState):ShellState{return {...s,screen:"S5",exercise:s.exercise+1,introMs:0,repMs:0,idleMs:0};}
export function shellReducer(s:ShellState,a:ShellAction):ShellState{
  switch(a.type){
    case "rep":{if(s.screen!=="S6" || s.paused || s.fakeReps)return s;const n={...s,reps:s.reps.map((r,i)=>i===s.exercise ? Math.min(10,r+1):r),idleMs:0,lastRepMs:s.elapsedMs};return n.reps[n.exercise]>=10 ? finishSet(n):n;}
    case "invite":return s.screen==="S0" ? {...s,screen:"S1"}:s;
    case "permissions":return s.screen==="S1" ? {...s,screen:"S2"}:s;
    case "answer":{if(s.screen!=="S2" || !a.value.trim())return s;const answers=[...s.answers,a.value.trim()];return {...s,answers,question:Math.min(3,s.question+1),screen:s.question===3 ? "S3":"S2",holdMs:0};}
    case "continue":
      if(s.screen==="S3" && (s.floor || s.holdMs>=1500))return s.floor ? {...s,screen:"S5",introMs:0}: {...s,screen:"S4"};
      return s.screen==="S4" ? {...s,screen:"S5",introMs:0}:s;
    case "skip":return s.screen==="S6" ? finishSet(s) : s.screen==="S7" ? (s.exercise===2 ? {...s,restMs:0}:nextIntro(s)):s;
    case "floor":return s.screen==="S7" && s.exercise===2 && s.restMs===0 ? {...s,screen:"S3",exercise:3,floor:true,holdMs:0}:s;
    case "end":return s.screen==="S0" || s.screen==="S8" ? s:{...s,screen:"S8",paused:false};
    case "pause":return s.screen==="S6" ? {...s,paused:true,pauseReason:"Paused. Tap to resume."}:s;
    case "resume":return s.screen==="S6" && s.inFrame ? {...s,paused:false,pauseReason:"",missingMs:0,repMs:0}:s;
    case "frame":return {...s,inFrame:a.value,holdMs:a.value ? s.holdMs:0,missingMs:a.value ? 0:s.missingMs};
    case "source":return {...s,fakeReps:a.value};
    case "intro-step":return s.screen==="S5" && Number.isInteger(a.value) && a.value>=0 && a.value<5 ? {...s,introMs:a.value*1000}:s;
    case "intro-complete":return s.screen==="S5" ? {...s,screen:"S6",started:true,repMs:0,idleMs:0}:s;
    case "tick":{
      if(!Number.isFinite(a.ms) || a.ms<=0 || s.screen==="S0" || s.screen==="S8")return s;
      if(!s.started && ["S1","S2","S4"].includes(s.screen))return s;
      let n={...s,elapsedMs:s.elapsedMs+(s.started ? a.ms:0)};
      if(n.screen==="S3")return {...n,holdMs:n.inFrame ? Math.min(1500,n.holdMs+a.ms):0};
      if(n.screen==="S5"){if(a.introClock===false)return n;n.introMs+=a.ms;if(n.introMs>=5000)n={...n,screen:"S6",started:true,repMs:0,idleMs:0};return n;}
      if(n.screen==="S7"){n.restMs=Math.max(0,n.restMs-a.ms);return n.restMs===0 && n.exercise!==2 ? nextIntro(n):n;}
      if(n.screen!=="S6" || n.paused)return n;
      n.missingMs=n.inFrame ? 0:n.missingMs+a.ms;
      if(n.missingMs>=5000)return {...n,paused:true,pauseReason:STEP_BACK_LINE};
      n.idleMs+=a.ms;
      if(n.inFrame && n.fakeReps){n.repMs+=a.ms;const add=Math.floor(n.repMs/1500);if(add){n.reps=n.reps.map((v,i)=>i===n.exercise ? Math.min(10,v+add):v);n.repMs%=1500;n.idleMs=0;n.lastRepMs=n.elapsedMs;}}
      return n.reps[n.exercise]>=10 || n.idleMs>=30000 ? finishSet(n):n;
    }
  }
}
export function question(s:ShellState){return [GREETING,`Got it, ${s.answers[0]??"full body"}. How long do you want your workout to be: 5, 10, or 20 minutes?`,"Got it. Any injuries I should be aware of? You only have to tell me once and I'll remember it for future sessions. If anything changes or gets better, just let me know.","Last one: do you have a pair of dumbbells with you?"][s.question];}
export function kcal(ms:number){return Math.round(3.5*3.5*68/200*Math.max(0,ms)/60000);}
export function caption(s:ShellState){
  switch(s.screen){
    case "S2":return question(s);
    case "S3":return s.floor ? FLOOR:s.holdMs>=1500 ? "Perfect. I can see all of you.":SETUP;
    case "S4":return BRIEF;
    case "S5":return MOVES[s.exercise].cue;
    case "S6":return s.paused ? s.pauseReason:"I'll count and watch your form.";
    case "S7":return `Great job. Let's take a 20-second break, then we move on to ${MOVES[Math.min(3,s.exercise+1)].plural}.`;
    case "S8":return `Today you burned approximately ${kcal(s.lastRepMs)} calories, assuming a body weight of 68 kilograms, about 150 pounds. See you tomorrow. Signing off, it's your AI trainer, Jax.`;
    default:return "";
  }
}
