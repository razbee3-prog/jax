import type { FaultId } from "./faults";
type Variants = readonly [string, string, string];
export type Cues = { first: Variants; reminder: Variants; fixed: Variants };
function cue(first: Variants, reminder: Variants, fixed: string): Cues {
  return { first, reminder, fixed: [fixed, "There you go. That looks better.", "That's the shape. Keep that going."] };
}
export const CUES: Record<FaultId, Cues> = {
  rdl_back_round: cue(
    ["Proud chest. Show the wall in front of you the logo on your shirt.", "Show the wall ahead the logo on your shirt.", "Keep your shirt logo facing the wall ahead."],
    ["Long spine, chest forward toward the wall.", "Keep showing that logo to the wall ahead.", "Reach back while your shirt faces forward."], "Your shirt stayed facing forward that time."),
  rdl_knee_squat: cue(
    ["Softer knees. Send your hips back to the wall behind you.", "Reach back toward the wall behind you.", "Send the weights down as you reach back."],
    ["Less down, more back toward that wall.", "Keep reaching for the wall behind you.", "Try a smaller bend and a longer reach back."], "That was a clean reach back."),
  rdl_drift: cue(
    ["Slide the weights down your thighs.", "Keep the weights skimming your legs.", "Trace your legs with the weights."],
    ["Keep those weights on the same close track.", "Brush your legs as the weights travel.", "Bring the weights closer to their track."], "The weights stayed close that time."),
  rdl_shallow: cue(
    ["Reach the weights just past your knees.", "Let the weights travel a little farther down.", "Aim the weights just below your knees."],
    ["Reach a little farther toward that lower target.", "Let the weights pass your knees this time.", "Keep reaching back as the weights lower."], "You reached the lower target that time."),
  rdl_fast: cue(
    ["Slow on the way down. Two counts.", "Take two easy counts to lower the weights.", "Make the trip down smooth and slow."],
    ["Give the lowering another slow two counts.", "Same path, a gentler trip down.", "Let the weights descend without a rush."], "That was a smooth, controlled descent."),
  pp_chest_forward: cue(
    ["Stay tall in the dip, like you're sliding down a wall.", "Slide straight down the wall for the dip.", "Keep your shirt facing ahead as you dip."],
    ["Keep sliding straight down, not toward the floor.", "Stay against that imaginary wall as you dip.", "Aim your shirt ahead through the bounce."], "That dip stayed tall."),
  pp_dip_deep: cue(
    ["Shorter dip. Just a quick bounce.", "Make that bounce a little smaller.", "Use a short spring before the press."],
    ["Keep the next bounce small and quick.", "Less dip, then send the weights up.", "Try a shallower spring this time."], "That was a short, sharp bounce."),
  pp_no_legs: cue(
    ["Use your legs. Dip, then drive the floor away.", "Bounce, then push the floor away.", "Let the floor launch the weights upward."],
    ["Start with a bounce before sending the weights up.", "Push the floor away before the press.", "Let the bounce help the weights travel."], "The floor drive helped that press."),
  pp_soft_lockout: cue(
    ["Punch the ceiling. Finish with the weights over your ears.", "Send the weights straight toward the ceiling.", "Finish with the weights stacked overhead."],
    ["Reach the weights a little higher toward the ceiling.", "Keep the finish stacked over you.", "Find that overhead target before lowering."], "You reached the overhead target that time."),
  pp_lean_back: cue(
    ["Ribs down. Stand tall under the weights.", "Stay stacked beneath the weights.", "Press up without tipping toward the wall behind."],
    ["Keep the weights balanced above your base.", "Stay tall under that overhead target.", "Send the weights up, not behind you."], "That finish stayed balanced above you."),
  pp_press_early: cue(
    ["Legs first, then arms.", "Push the floor away before the weights rise.", "Finish the bounce, then send the weights up."],
    ["Let the floor drive lead the next press.", "Bounce first, overhead reach second.", "Give the bounce time to finish before pressing."], "That bounce led the press nicely."),
  curl_swing: cue(
    ["Stand tall and still, like your back is against a wall.", "Keep your shirt still while the weights travel.", "Imagine staying against the wall behind you."],
    ["Keep that imaginary wall steady behind you.", "Let only the weights swing through their path.", "Same curl, with your shirt staying still."], "You stayed still through that curl."),
  curl_elbow_drift: cue(
    ["Pin your elbows to your ribs.", "Keep the weights on a close track.", "Curl without reaching toward the wall ahead."],
    ["Keep the same close track on the next curl.", "Bring the weights up without reaching forward.", "Let the weights arc up beside your shirt."], "That curl stayed on its close track."),
  curl_partial: cue(
    ["All the way down. Let the weights reach your thighs.", "Trace the full arc, up and back down.", "Let the weights finish their whole path."],
    ["Find both ends of that curl path.", "Reach the lower target before curling again.", "Make the next arc a little fuller."], "You found the full curl path that time."),
  curl_drop: cue(
    ["Lower it slow. Fight it on the way down.", "Let the weights glide down slowly.", "Make the return trip smooth and unhurried."],
    ["Take your time on the way back down.", "Slow the return to that lower target.", "Keep the weights gliding, not dropping."], "That return was smooth and controlled."),
  pu_hip_sag: cue(
    ["One straight plank, head to heels.", "Keep a straight bridge from head to heels.", "Push the floor away as one straight plank."],
    ["Keep that bridge level through the next rep.", "Hold the whole plank in one line.", "Move the straight plank as one piece."], "That plank stayed straight."),
  pu_hip_pike: cue(
    ["Drop your hips into one straight line.", "Make one straight bridge toward your heels.", "Level the plank before the next push."],
    ["Keep the bridge level, not peaked.", "Bring the whole plank onto one line.", "Move as one straight piece this time."], "That was a level plank."),
  pu_shallow: cue(
    ["Chest closer to the floor.", "Bring your shirt a little closer to the floor.", "Aim for a lower target on the next rep."],
    ["Reach a little closer to that floor target.", "Let your shirt travel a little lower.", "Try a slightly deeper trip toward the floor."], "You reached closer to the floor that time."),
  pu_head_drop: cue(
    ["Eyes on the floor just ahead of your hands.", "Aim your gaze just beyond your hands.", "Keep looking at the same spot ahead."],
    ["Keep that gaze on the spot ahead.", "Look just beyond your hands through the rep.", "Stay aimed at the same floor target."], "Your gaze stayed steady that time."),
};
