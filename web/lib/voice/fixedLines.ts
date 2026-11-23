export const COUNTDOWN=["Get ready","3","2","1","Go"] as const;
export const COUNTDOWN_LINE="Get ready. 3, 2, 1. Go.";
export const STEP_BACK_LINE="Step back into frame when you're ready.";
export const FIXED_LINES=[...COUNTDOWN,"Five. Halfway.","Two more.","Ten. That's the set.",
  "Hey, it's Jax. Let's put a workout together. What would you like to work on today: upper body, lower body, or full body?",
  ...["upper body","lower body","full body"].map(focus=>`Got it, ${focus}. How long do you want your workout to be: 5, 10, or 20 minutes?`),
  "Got it. Any injuries I should be aware of? You only have to tell me once and I'll remember it for future sessions. If anything changes or gets better, just let me know.",
  "Last one: do you have a pair of dumbbells with you?",
  "Prop your phone against a wall, about hip height. Step back until I can see your whole body, then turn sideways to me.",
  "Perfect. I can see all of you.",STEP_BACK_LINE,
  "For push-ups, put the phone on the floor, leaning against something, and get side-on to me.",
  "Feet hip-width, soft knees, weights in front of your thighs.",
  ...["push presses","bicep curls","push-ups"].map(next=>`Great job. Let's take a 20-second break, then we move on to ${next}.`),
  "Here's what we're working on today: Romanian deadlifts, push presses, bicep curls, and push-ups. One set of each, 10 reps each. I'll count and watch your form. For this pilot, everyone gets the same four moves.",
] as const;
