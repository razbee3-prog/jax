# Jax pilot: project plan for Devin

Owner: Raz. Builder: Devin. Plan date: November 20, 2026. Save this file in the repo as `docs/PLAN.md`.

Jax is an AI personal trainer that runs as a web app on an iPhone. It watches you through the front camera, counts your reps, and coaches your form out loud the way a human trainer would. This plan covers the pilot (proof of concept) only.

How to use this document:

- Raz: read sections 1, 2, 16, 17 and 18. Everything else is for Devin.
- Devin: `AGENTS.md` in the repo root is your standing brief. This file is the full spec. Work one milestone per session (section 14). Do not skip the decision gates.

---

## 1. What we are building

- A portrait, single-page web app that works in Safari and Chrome on iPhone.
- Entry is an invite code. After the code, Jax asks for camera and microphone access and starts a FaceTime-style voice call.
- Jax (an ElevenLabs voice shown as the ElevenLabs Orb) asks three or four short questions by voice, then runs a fixed workout.
- The workout is four exercises, one set each, 10 reps each, in this order:
  1. Dumbbell Romanian deadlift
  2. Dumbbell push press
  3. Dumbbell bicep curl
  4. Push-up
- A demo video plays for each exercise. A large rep counter counts up from 0 using Google MediaPipe Pose Landmarker (the BlazePose model, 33 body landmarks).
- After each rep, a compact summary of the pose data goes to the coach agent (LangChain Managed Deep Agents, Anthropic model). The agent decides whether to correct, acknowledge, praise, or stay quiet.
- Every session is traced end to end in LangSmith. If traces are missing, Raz is told.
- Form-fault detection and coaching quality are measured with LangSmith datasets and evals.

The value proposition is the form feedback: one gentle nudge after a bad rep, a short acknowledgment when it is fixed, a second nudge if it is not, and silence when there is nothing useful to say.

### Out of scope for the pilot

- Personalized workout programming. The focus and duration answers are recorded and traced but the four-exercise circuit is fixed.
- Background music (backlog).
- Accounts, payments, native app, Android tuning.
- Knee-cave detection and push-up elbow flare. Both need a front or top view; the pilot uses a side view (section 6.2).
- Sending video anywhere. Camera frames never leave the phone. Only landmark numbers and text do.

---

## 2. Success criteria for the pilot

These are targets I set for the pilot. None has been measured yet.

| # | Criterion | Target |
|---|---|---|
| 1 | Standing still, walking into frame, or setting up counts zero reps | 0 false reps on every test clip |
| 2 | Rep count accuracy on clean sets of 10 | Exact on at least 90% of clips, never off by more than 1 |
| 3 | A fault is only spoken if its detector has earned it | Precision at least 0.85 on real labeled clips, otherwise that fault stays silent |
| 4 | Time from end of rep to Jax starting to speak | p95 at most 2.5 s on an iPhone on Wi-Fi |
| 5 | Jax is not a chatterbox | Speaks on 25% to 55% of reps in a set, never twice within 3.5 s |
| 6 | Trace completeness | 100% of expected events present in LangSmith for every session, or a visible failure |
| 7 | Whole flow works hands-free once the phone is propped up | No screen taps required from the setup check to the sign-off (moving the phone for push-ups is the one exception) |
| 8 | Works on Safari and Chrome on a real iPhone | Raz passes the checklist in section 15 |

---

## 3. User journey, screen by screen

Reference viewport: 390 x 844 (iPhone portrait). All copy below is final unless Raz changes it.

### S0. Invite

- Small idle orb, title "Jax", subtitle "Your AI personal trainer", prompt "Enter invite code to get started", one input, one button.
- Code check is server-side, case-insensitive, against the `INVITE_CODE` env var. Wrong code: input shakes, "That code didn't work."
- The button tap is also used to unlock audio (create and resume the audio context). iOS will not play sound without a user gesture.
- One line of small print: "Jax is not medical advice. Stop if anything hurts."

### S1. Permissions

- Copy: "Jax needs your camera and microphone to coach you. Video stays on your phone."
- One button: "Turn on camera and mic". Aim for a single iOS permission prompt covering both. If iOS shows two, that is acceptable.
- If denied: plain instructions for re-enabling in Safari or Chrome settings, and a retry button.

### S2. The call (onboarding by voice)

- FaceTime layout: the orb fills most of the screen; the user's mirrored camera is a rounded tile in the bottom-left corner; an "End" button sits bottom-right.
- Jax's current line appears as a caption under the orb. Tappable answer chips appear above the bottom safe area as a fallback to speaking.
- Script:
  1. "Hey, it's Jax. Let's put a workout together. What would you like to work on today: upper body, lower body, or full body?"
  2. "Got it, {focus}. How long do you want your workout to be: 5, 10, or 20 minutes?"
  3. First session: "Got it. Any injuries I should be aware of? You only have to tell me once and I'll remember it for future sessions. If anything changes or gets better, just let me know."
     Returning user with an injury on file: "Last time you mentioned {injury}. Is that still the case?"
  4. "Last one: do you have a pair of dumbbells with you?"
- If the user says nothing for 8 s, Jax repeats the question once. After that the chips pulse.

### S3. Setup check

- Jax: "Prop your phone against a wall, about hip height. Step back until I can see your whole body, then turn sideways to me."
- The self-view grows to full screen with a skeleton overlay and a body outline guide.
- The check passes when all required landmarks are visible and the body fills 50% to 90% of the frame height for 1.5 s straight. Jax: "Perfect. I can see all of you."
- The microphone is switched off here and stays off for the workout (section 8.3).

### S4. The brief

- Jax: "Here's what we're working on today: Romanian deadlifts, push presses, bicep curls, and push-ups. One set of each, 10 reps each. I'll count and watch your form. For this pilot, everyone gets the same four moves."
- If an injury on file affects a move, Jax adds one sentence, for example: "With your lower back, keep the deadlifts light and stop above the knee."
- The four exercises show as a simple list.

### S5. Exercise intro

- The orb glides to a slim bar at the top. The demo video fades in below it.
- Jax gives one or two setup cues (for example: "Feet hip-width, soft knees, weights in front of your thighs").
- Countdown on screen and by voice: "Get ready. 3, 2, 1. Go."

### S6. Active set

- Top bar: small orb plus caption.
- Demo video: full width, 16:9, looping, muted.
- Rep counter: very large ("3 / 10"). The user is standing about two meters away, so numerals must be at least 160 px tall.
- Self-view tile with skeleton overlay: bottom-left.
- A soft tick sounds on every counted rep so the user knows it registered without looking.
- The set ends at 10 reps, or 30 s with no rep, or a tap on "Skip".
- Tapping the screen pauses. Leaving the frame for more than 5 s auto-pauses and Jax says "Step back into frame when you're ready."

### S7. Rest

- Jax: "Great job. Let's take a 20-second break, then we move on to {next exercise}."
- Ring countdown from 20, with the next exercise's video as a preview.
- Before push-ups, the rest holds until the setup check passes again. Jax: "For push-ups, put the phone on the floor, leaning against something, and get side-on to me."

### S8. Summary and sign-off

- The orb returns to the center.
- Jax: "Today you burned approximately {kcal} calories, assuming a body weight of 68 kilograms, about 150 pounds. See you tomorrow. Signing off, it's your AI trainer, Jax."
- Card: reps completed, total time, calories, one thing that went well, one thing to work on.
- Thumbs up or down: "How was Jax's coaching?" (sent to LangSmith as feedback).
- Small pilot-only line: "Trace check: 61 of 61 recorded" or a red failure state (section 10).

### Transitions

- No hard cuts. The orb moving from center to top bar is one continuous shared-element animation (400 to 600 ms, ease-in-out). Screens crossfade. The video fades in.
- Respect `prefers-reduced-motion`.

### Visual tokens (use until Raz's layout inspirations arrive)

- Background `#0B0B0F`, primary text `#F5F5F7`, secondary text `#A1A1AA`, tile radius 20 px.
- Orb colors: start with the component defaults, expose them as constants.
- One typeface (system font stack). Counter numerals in a tabular, heavy weight.
- When Raz sends inspirations, treat them as overrides for layout and tokens, not for the flow.

---

## 4. Architecture

Two deployables in one repo.

```
iPhone browser (Next.js client)
  camera -> MediaPipe Pose Landmarker (on device, ~30 fps)
        -> smoothing -> joint angles -> rep state machine -> fault detectors
        -> RepReport (JSON, one per rep)
  mic    -> ElevenLabs realtime speech-to-text (onboarding only)
  audio  <- speech queue <- ElevenLabs text-to-speech
        |
        v  HTTPS, session cookie
Next.js server routes (Vercel)
  /api/invite, /api/session/*, /api/coach, /api/tts, /api/stt-token, /api/telemetry
  holds all API keys; writes app-side traces to LangSmith
        |
        v  x-mda-ingress-secret + x-mda-user-id
Managed Deep Agent "jax-coach" (LangSmith-hosted Agent Server)
  Anthropic model, instructions.md, user memory (injuries), structured CoachDecision
  traces land in LangSmith automatically
```

Why it is split this way:

- Managed Deep Agents hosts the agent only. It has no place for custom web routes or app code, so the web app needs its own backend ([LangChain migration notes](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-migrate)).
- A LangSmith API key must never reach the browser. LangChain's guidance for custom frontends is a server proxy with backend identity ([custom frontend guide](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-custom-frontend)).
- Rep counting must be instant and exact, so it runs on the phone as plain code. A language model is too slow and too unreliable to count.
- The model's job is judgment: what to say, when, and when to say nothing.

### Stack and versions

Versions below are what npm reported on November 20, 2026. Pin exact versions in `package.json`.

| Piece | Choice |
|---|---|
| Runtime | Node 22 or newer. `managed-deepagents` 0.10.5 declares `node >= 22`. On Node 20, `npm install` silently resolved to the ancient 0.0.2 in my test, so check the installed version. |
| Web app | Next.js 16.4.6 (App Router, TypeScript), Tailwind, shadcn/ui, `motion` for transitions |
| Pose | `@mediapipe/tasks-vision` 1.2.3 |
| Voice UI | ElevenLabs UI Orb (MIT, Three.js and React Three Fiber) |
| Voice | ElevenLabs text-to-speech over HTTPS; `@elevenlabs/react` 1.23.1 `useScribe` for realtime speech-to-text |
| Agent | `managed-deepagents` 0.10.5 (`mda` CLI), `deepagents` 1.17.0, `@langchain/anthropic` 1.6.6 |
| Agent client | `@langchain/langgraph-sdk` 1.17.0 (server side only) |
| Tracing and evals | `langsmith` 0.13.1 |
| Hosting | Vercel for the web app (HTTPS is required for camera access); LangSmith Cloud for the agent |
| Tests | Vitest for logic, Playwright for browser tests |

### Repo layout

```
AGENTS.md                 standing brief for Devin (keep under 16 KiB)
docs/PLAN.md              this file
docs/STATUS.md            Devin updates after every milestone
shared/                   single source of truth: zod schemas, fault catalog, cue bank, exercise config
web/
  app/                    page.tsx (single-page flow), lab/ (debug page), admin/, api/
  components/             orb, call layout, counter, video, self-view, countdown
  lib/pose/               landmarker, filters, angles, repCounter, exercises/*, faults/*
  lib/voice/              tts, stt, speechQueue, audioSession
  lib/coach/              client, governor, fallback
  lib/session/            state machine, calories, ledger
  lib/trace/              LangSmith helpers
  public/videos/          four demo videos from Raz
  public/models/          pose_landmarker_full.task, pose_landmarker_lite.task
  public/wasm/            copied from node_modules/@mediapipe/tasks-vision/wasm
agent/                    Managed Deep Agents project "jax-coach"
  agent.ts  identity.ts  memory.ts  instructions.md  package.json
evals/
  fixtures/               landmark sequences (JSON) with labels
  datasets/               builders that upload to LangSmith
  evaluators/             code and LLM-judge evaluators
  run-*.ts                experiment runners
scripts/                  check-env, extract-landmarks, smoke-session, trace-audit
```

`shared/` must be usable from both `web/` and `agent/`. The agent build copies only the agent project, so add a sync script that copies `shared/` into `agent/shared/` and a CI check that fails if the copies differ.

---

## 5. Agent: jax-coach on Managed Deep Agents

Managed Deep Agents is LangChain's hosted runtime for its open-source Deep Agents harness, in public beta on LangSmith ([announcement](https://www.langchain.com/blog/managed-deep-agents-is-now-in-public-beta), [overview](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-overview)). The npm package README warns that the API and runtime contract may still change, so pin the version.

### 5.1 Scaffold

- `npx managed-deepagents init jax-coach` then move it to `agent/` ([quickstart](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-quickstart)). The package README lists `--model`, `--no-sandbox` and `--instructions-file` flags for `mda init`. Use `--no-sandbox`; Jax runs no code.
- `npx mda dev` runs a local Agent Server and opens LangSmith Studio. `npx mda deploy` ships it. Serverless is the default; `--agent-server-type dedicated` gives an always-on server.
- `agent.ts` must export a named `agent` created with `defineDeepAgent`. The assistant ID that clients send is the agent `name` ([agent definition](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-agent-definition)).
- `mda deploy` reads `agent/.env`. Non-reserved values there are forwarded as deployment secrets. Never commit it.

Sketch (confirm option names against the installed package):

```ts
// agent/agent.ts
import { defineDeepAgent } from "managed-deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { CoachDecision } from "./shared/schemas";

export const agent = defineDeepAgent({
  name: "jax-coach",
  // Haiku 5.5, thinking disabled, low effort, small max output. Check the
  // @langchain/anthropic docs for the exact option names for thinking and effort.
  model: new ChatAnthropic({ model: "claude-haiku-5-5", maxTokens: 300 }),
  responseFormat: CoachDecision,
});
```

```ts
// agent/identity.ts
import { defineIdentity } from "managed-deepagents";
export const identity = defineIdentity({ auth: "backend" });
```

```ts
// agent/memory.ts
import { defineMemory, memoryLayer } from "managed-deepagents";
// The package README says direct API runs get no user memory mount unless an
// authored policy allows it. `allow` is marked deprecated in favor of selecting
// memory from a dynamic agent factory. Use whichever the installed version supports.
export const memory = defineMemory({ user: memoryLayer({ allow: () => true }) });
```

### 5.2 Model

- `claude-haiku-5-5` for every turn. Anthropic lists it as its fastest model and recommends it for high-volume, latency-sensitive tasks ([models overview](https://platform.claude.com/docs/en/models/overview), [Haiku 5.5 page](https://platform.claude.com/docs/en/models/haiku-5-5/overview)).
- Disable thinking and set effort to low on the rep path. Anthropic's latency cookbook measures this exact configuration as its low-latency setting ([latency cookbook](https://platform.claude.com/cookbook/latency-optimization-latency-optimization)).
- Keep `instructions.md` stable so prompt caching applies. Put the cue bank and fault catalog in `instructions.md`, not in a skill. A skill is loaded on demand with a tool call, which adds a model round trip on every rep.
- One model keeps the pilot simple. Moving the summary turn to Sonnet is a backlog item.

### 5.3 Identity and memory

- Backend identity: the web server sends `x-mda-ingress-secret` and `x-mda-user-id` on every request. Generate the secret with `openssl rand -hex 32` and store it as `MDA_INGRESS_SECRET` in both `agent/.env` and the web app ([identity docs](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-identity)).
- When using backend identity, make sure the SDK does not also attach a LangSmith API key from the environment. LangChain's [custom frontend guide](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-custom-frontend) calls this out for its Python client.
- User ID: a random UUID created on first visit, stored in a long-lived cookie and in `localStorage`. There are no accounts in the pilot.
- Injuries live in user memory at `/memories/user/AGENTS.md`. That file is "hot" memory: it is injected into every model call for that user ([memory docs](https://docs.langchain.com/langsmith/javascript/managed-deep-agents-memory)). So Jax knows the injuries on every rep without a tool call.
- The agent writes that file only on onboarding turns, using its built-in file tools. Format: one bullet per injury with the date it was reported and its status (active or resolved).

### 5.4 Events in, decisions out

One Agent Server thread per workout session. The thread ID is the session ID. Every app event is one user message whose content is JSON.

| Event | When | Notes |
|---|---|---|
| `session_start` | After permissions | Local time, device info, whether the user is returning |
| `onboarding_answer` | After each spoken or tapped answer | `{ question, transcript }`. Agent extracts the slot and writes injuries to memory |
| `brief` | Before exercise 1 | Agent returns the brief line, adjusted for injuries |
| `set_start` | Countdown finished | `{ exercise, target_reps }` |
| `rep` | After each counted rep | A `RepReport` (below). May carry several reps if the previous turn was still running |
| `stall` | 10 s without a rep mid-set | Agent may encourage or offer an easier option |
| `set_end` | 10 reps, timeout, or skip | Set stats. Agent returns the rest line with one specific observation |
| `session_end` | After the last set | Totals and calories. Agent returns the highlights and the sign-off |

`RepReport` (target size under 700 tokens):

```json
{
  "exercise": "rdl",
  "rep": 3,
  "target": 10,
  "ms": { "total": 3100, "lowering": 1700, "lifting": 1200, "since_last_rep": 400 },
  "metrics": { "hip_min": 96, "knee_min": 151, "torso_lean_max": 68, "torso_len_ratio_min": 0.93 },
  "faults": [
    { "id": "rdl_knee_squat", "value": 118, "threshold": 130, "tier": "A", "streak": 2 }
  ],
  "quality": { "visibility": 0.87, "fps": 29, "view_ok": true },
  "keyframes": [
    { "t": "top", "lm": { "shoulder": [0.52, 0.31], "hip": [0.50, 0.55], "knee": [0.51, 0.74], "ankle": [0.50, 0.92] } }
  ]
}
```

`CoachDecision` (the agent's structured response on every turn):

```json
{
  "speak": true,
  "text": "Softer knees. Send your hips back to the wall behind you.",
  "kind": "correction",
  "fault_id": "rdl_knee_squat",
  "slots": null,
  "reason": "Second rep in a row with knee bend past threshold; no cue given yet for this fault."
}
```

- `kind` is one of `question`, `ack`, `correction`, `reminder`, `fixed`, `praise`, `pace`, `transition`, `summary`, `silence`.
- `slots` is only filled on onboarding turns: `{ focus, duration_min, injuries, has_dumbbells }`.
- `reason` is never spoken. It exists for traces and evals.

Calling the agent from the web server (sketch; I confirmed these method and option names exist in `@langchain/langgraph-sdk` 1.17.0, but check where the structured response sits in the returned state):

```ts
await client.threads.create({ threadId: sessionId, ifExists: "do_nothing", metadata: { user_id } });
const state = await client.runs.wait(sessionId, "jax-coach", {
  input: { messages: [{ role: "user", content: JSON.stringify(event) }] },
  metadata: { session_id: sessionId, event_id, event_type },
});
```

Concurrency rule: the client never sends a `rep` event while a coach turn is in flight. Pending reps are merged into the next event. This keeps turns in order without relying on server queueing.

### 5.5 Who decides what

- The detectors (code) decide what happened: rep counted, measurements, fault flags.
- The agent decides what to do about it, using the thread history and the user's injuries.
- The agent may only name a fault that appears in the `faults` array. It never invents one. This is an eval (section 11).
- The client "speech governor" enforces hard limits no matter what the agent returns (section 9.3).

### 5.6 Latency gate (milestone M1)

A human trainer's cue lands during the next rep. That is the bar.

- Budget: agent turn p50 at most 0.9 s and p95 at most 1.8 s; text-to-speech first audio at most 0.5 s; total p95 at most 2.5 s. These are my targets, not measurements.
- Caution: the only published number I found for Haiku 5.5 at low effort with thinking off is p50 3.3 s per task, but those were long agentic tasks averaging about 1,574 output tokens, not a 40-token reply ([latency cookbook](https://platform.claude.com/cookbook/latency-optimization-latency-optimization)). So measure; do not assume.
- M1 measures 50 synthetic `rep` turns against the deployed agent and reports p50 and p95.
- If the gate fails, apply these in order and re-measure after each:
  1. Dedicated Agent Server (removes cold starts).
  2. Cut the prompt: shorter instructions, fewer keyframes, drop history older than the current set from the event payload.
  3. Trim harness features the coach does not need (subagents, planning) if the package allows it.
  4. Hybrid: the local fallback policy (section 9.4) speaks in-set cues from the cue bank; the agent handles onboarding, set-end feedback and the summary. Report this to Raz before adopting it, because it changes how much of the coaching the model does.

---

## 6. Pose pipeline

### 6.1 MediaPipe setup

- `npm install @mediapipe/tasks-vision`. Load the WASM files from the same package version as the JavaScript, and self-host both WASM and model files under `public/` so there is no version drift ([Google's guidance for coding agents](https://developers.google.com/edge/mediapipe/solutions/agents.md.txt)).
- Create one `PoseLandmarker` with `runningMode: "VIDEO"`, `numPoses: 1`, `delegate: "GPU"`. GPU is opt-in: catch a creation failure and recreate on CPU ([web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)).
- Call `detectForVideo(video, performance.now())` once per animation frame with strictly increasing timestamps. The web API has no live-stream mode.
- Model: start with `pose_landmarker_full`. During the setup check, measure inference rate; if it is under 20 per second, switch to `pose_landmarker_lite` for the session.
- All timing logic uses timestamps, not frame counts. iOS Low Power Mode throttles animation frames to 30 per second ([WebKit bug 215745](https://bugs.webkit.org/show_bug.cgi?id=215745)).
- The video element needs `autoplay muted playsinline`. Mirror the self-view with CSS only; compute on unmirrored frames.
- Hold a screen wake lock during the workout and re-acquire it on `visibilitychange`. Apple fixed the Wake Lock API for Home Screen web apps in iOS 18.4 ([Safari 18.4 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)), so test it in a normal browser tab first.
- Call `close()` on the landmarker when the session ends.

Landmark indices used ([landmark list](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker)): 0 nose, 7/8 ears, 11/12 shoulders, 13/14 elbows, 15/16 wrists, 23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels, 31/32 foot index.

### 6.2 Camera view: side-on by default, verified in M2

- Every fault we can measure in these four moves happens in the side (sagittal) plane: hip hinge, knee bend, torso lean, elbow drift, hip sag. A MediaPipe validation study against lab motion capture recommends placing the camera perpendicular to the plane of motion for planar movements ([viewpoint validity study](https://pmc.ncbi.nlm.nih.gov/articles/PMC13667498/)).
- Use the 2D image landmarks (scaled by frame width and height), not the 3D world landmarks. The same study cites mean agreement of 0.848 for 2D planar tracking versus 0.658 for single-camera 3D.
- Caution from that study: elbow flexion measured as a 3D task agreed poorly with the lab system (errors of 24 to 31 degrees). Curls and push-ups depend on the elbow angle, so their thresholds have wide margins and the evals in section 11 decide whether they hold.
- Use the side of the body nearer the camera: whichever side has higher average landmark visibility during the setup check.
- Distance: about two meters for standing moves. A phone-camera study of rep counting (with a different pose model, MoveNet) found 180 to 200 cm best ([camera positioning study](https://www.ncbi.nlm.nih.gov/pmc/articles/12978916)).
- That same study favored diagonal and frontal views for detection, and a close side view was its worst case for squats. So side-on is a default to be tested, not a certainty. In M2, compare side-on against a 45-degree diagonal on Raz's clips for every exercise:
  - Keep side-on where rep counting meets the bar in section 2.
  - Where it does not, switch that exercise to the diagonal view, retune thresholds, and expect tier A faults that depend on a true profile to drop to tier B.
- Push-ups: phone on the floor, leaning back. The study found diagonal views best for push-ups, so this is the exercise most likely to end up diagonal.
- `view_ok` check: projected shoulder width divided by torso length stays under 0.25, meaning the user really is side-on. Fault detectors that depend on a true profile only run when `view_ok` is true.

### 6.3 Signal processing

- Visibility gate: ignore a landmark with visibility under 0.5. One validation study found that simply dropping low-visibility frames (their cut-off was 0.3) cut squat knee-angle error from about 25 degrees to about 9 ([BlazePose knee validation](https://pmc.ncbi.nlm.nih.gov/articles/PMC13730411/)).
- Smoothing: a 1 Euro filter per landmark coordinate. It is built for exactly this trade-off between jitter and lag ([Casiez et al.](https://inria.hal.science/hal-00670496/document)). Start with min cutoff 1.0 Hz and beta 0.01, then tune on fixtures.
- Derived values per frame:
  - `hip` = angle(shoulder, hip, knee). Standing is near 180.
  - `knee` = angle(hip, knee, ankle).
  - `elbow` = angle(shoulder, elbow, wrist).
  - `shoulder_flex` = angle(hip, shoulder, elbow).
  - `body_line` = angle(shoulder, hip, ankle).
  - `torso_lean` = angle of the hip-to-shoulder line from vertical; positive is forward (facing direction from heel to toe).
  - `torso_len` = shoulder-to-hip distance. Its standing baseline is captured during the setup check and used to normalize distances.

### 6.4 Rep counting

Each exercise is a small state machine: `IDLE -> READY -> DOWN_PHASE -> TURNAROUND -> UP_PHASE -> counted`. A rep counts only when the signal crosses the far threshold and returns past the near threshold (hysteresis).

Rules common to all four:

- `READY` requires the start pose held for 0.5 s.
- Each phase lasts at least 250 ms; a whole rep lasts between 0.7 s and 10 s.
- Required landmarks must pass the visibility gate for at least 80% of the rep's frames.
- If tracking is lost for more than 1.5 s, return to `IDLE` without counting.
- Standing still never crosses a threshold, so it never counts.
- Counting thresholds are looser than quality thresholds. A real but imperfect rep still counts, and the imperfection becomes feedback.

Starting thresholds. These are my engineering starting points, informed by the technique sources in section 7. Tune them on fixtures in M2 and M3.

| Exercise | Signal | Start pose | Far threshold | Rep completes | Extra gates |
|---|---|---|---|---|---|
| Romanian deadlift | `hip` | `hip` >= 160 | `hip` <= 125 and `torso_lean` >= 35 | `hip` back to >= 160 | Wrists below hips throughout |
| Push press | Wrist height above shoulder, in torso lengths | <= 0.2, `elbow` <= 100 | >= 0.9 and `elbow` >= 150 | Back to <= 0.3 | `torso_lean` within 25 of vertical |
| Bicep curl | `elbow` | `elbow` >= 150 | `elbow` <= 80 | Back to >= 140 | Upright; wrist travels up at least 0.4 torso lengths |
| Push-up | `elbow` | `elbow` >= 155 | `elbow` <= 100 | Back to >= 150 | Shoulder-to-ankle line within 35 of horizontal; shoulder drops at least 0.15 torso lengths |

Assumptions: curls are done with both arms together (count the near arm), and all weighted moves use dumbbells. If the user has no dumbbells, the same movements are done unweighted and detection is unchanged.

### 6.5 The debug lab

Build `/lab` early. Devin has no camera and no body, so this page is how it tests.

- Input: live camera or an uploaded video file.
- Shows: skeleton overlay, live angles, state machine state, rep count, fault flags, inference rate.
- Can export the landmark sequence as a fixture JSON.
- `scripts/extract-landmarks` does the same headlessly with Playwright for a folder of clips.
- Automated browser tests can feed a clip as a fake webcam using Chrome's `--use-fake-device-for-media-stream`, `--use-file-for-fake-video-capture` and `--use-fake-ui-for-media-stream` flags.

---

## 7. Form faults

### 7.1 What a phone can and cannot see

- BlazePose gives shoulders, hips and ears but no points along the spine. "Rounded back" cannot be measured directly. It can only be estimated, and that estimate has to prove itself before Jax says it out loud.
- "Knees caving in" is a front-view fault and mostly a squat fault. It is not detectable from the side and is out of the pilot.
- Each fault has a tier:
  - Tier A: directly measurable from side-view landmarks. Spoken after the first rep that shows it.
  - Tier B: estimated by proxy. Spoken only after two reps in a row, only when `view_ok`, and only once its detector reaches precision 0.85 on real labeled clips. Until then it is logged but silent.

### 7.2 Catalog

Fault lists come from the cited technique references. Measures and thresholds are my starting points. Cues are written with an external focus (aimed at a target or the outcome, not a body part), which a meta-analysis found better for both performance and retention ([Chua et al. 2021](https://gwulf.faculty.unlv.edu/wp-content/uploads/2021/12/Chua_EF_meta-analyses_PB_2021.pdf)).

Romanian deadlift. Sources: [NASM](https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift), [ACE](https://www.acefitness.org/continuing-education/certified/may-2025/8865/the-ace-do-it-better-series-the-romanian-deadlift/).

| ID | Fault | Tier | Measure (starting threshold) | First cue |
|---|---|---|---|---|
| `rdl_back_round` | Rounding the back | B | `torso_len` at the bottom under 0.88 of standing baseline, or ear-shoulder-hip angle under 150 | "Proud chest. Show the wall in front of you the logo on your shirt." |
| `rdl_knee_squat` | Bending the knees so it becomes a squat | A | `knee` at the bottom under 130 | "Softer knees. Send your hips back to the wall behind you." |
| `rdl_drift` | Weights drifting away from the legs | A | Wrist more than 0.25 torso lengths in front of the shin line at the bottom | "Slide the weights down your thighs." |
| `rdl_shallow` | Not hinging far enough | A | `torso_lean` at the bottom under 45, or wrists never pass the knees | "Reach the weights just past your knees." |
| `rdl_fast` | Dropping into it, jerky | A | Lowering phase under 1.0 s | "Slow on the way down. Two counts." |

Push press. Sources: [CrossFit](https://www.crossfit.com/essentials/the-push-press), [Catalyst Athletics](https://www.catalystathletics.com/exercise/87/Push-Press/), [Gravitus](https://gravitus.com/guides/exercises/push-press/).

| ID | Fault | Tier | Measure (starting threshold) | First cue |
|---|---|---|---|---|
| `pp_chest_forward` | Chest tipping forward in the dip | A | `torso_lean` over 15 at the bottom of the dip | "Stay tall in the dip, like you're sliding down a wall." |
| `pp_dip_deep` | Dip too deep (it should be a shallow quarter squat) | A | `knee` under 125 in the dip | "Shorter dip. Just a quick bounce." |
| `pp_no_legs` | No leg drive | A | `knee` changes by less than 12 during the dip | "Use your legs. Dip, then drive the floor away." |
| `pp_soft_lockout` | Not finishing overhead | A | `elbow` peaks under 160, or wrist ends more than 0.2 torso lengths in front of the shoulder | "Punch the ceiling. Finish with the weights over your ears." |
| `pp_lean_back` | Leaning back to press | B | `torso_lean` under -12 at lockout | "Ribs down. Stand tall under the weights." |
| `pp_press_early` | Arms start before the legs finish | B | Wrists rise 0.15 torso lengths before knees are within 10 of straight | "Legs first, then arms." |

Bicep curl. Sources: [NASM](https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl), [ACE](https://www.acefitness.org/resources/everyone/exercise-library/70/bicep-curl/).

| ID | Fault | Tier | Measure (starting threshold) | First cue |
|---|---|---|---|---|
| `curl_swing` | Swinging or leaning back | A | `torso_lean` moves more than 12 during the lift | "Stand tall and still, like your back is against a wall." |
| `curl_elbow_drift` | Elbows drifting forward | A | `shoulder_flex` over 30 at the top | "Pin your elbows to your ribs." |
| `curl_partial` | Half reps | A | `elbow` never under 60 at the top, or never over 155 at the bottom | "All the way down. Let the weights reach your thighs." |
| `curl_drop` | Dropping the weight | A | Lowering phase under 0.8 s | "Lower it slow. Fight it on the way down." |

Push-up. Source: [NASM](https://www.nasm.org/resource-center/exercise-library/push-up).

| ID | Fault | Tier | Measure (starting threshold) | First cue |
|---|---|---|---|---|
| `pu_hip_sag` | Hips sagging | A | `body_line` under 160 with the hip below the shoulder-ankle line | "One straight plank, head to heels." |
| `pu_hip_pike` | Hips piked up | A | `body_line` under 160 with the hip above the line | "Drop your hips into one straight line." |
| `pu_shallow` | Not going low enough | A | `elbow` never under 100 | "Chest closer to the floor." |
| `pu_head_drop` | Head dropping | B | Ear more than 0.15 torso lengths below the shoulder-hip line | "Eyes on the floor just ahead of your hands." |

Priority when several faults fire on one rep: the order of the rows above within each exercise (safety first, then range, then tempo). Jax cues one fault at a time.

### 7.3 Cue bank

For every fault, `shared/cues.ts` holds three variants each of: first cue, reminder (different words, same idea), and fixed acknowledgment. Examples for the reminder and acknowledgment, taken from Raz's brief:

- Reminder: "Still seeing a little rounding there. Long spine, chest forward."
- Fixed: "There you go. That looks better."

The agent is told to prefer cue-bank wording. That keeps the voice consistent and makes text-to-speech cache hits likely (section 8.2).

---

## 8. Voice and audio

### 8.1 Speech-to-text (onboarding only)

- ElevenLabs realtime Scribe through the `useScribe` hook, with voice-activity commit so an answer is finalized when the user stops talking ([React Scribe SDK](https://elevenlabs.io/docs/eleven-api/resources/libraries/scribe-stt/react-scribe), [commit strategies](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/transcripts-and-commit-strategies)).
- Model `scribe_v3_live`; fall back to `scribe_v2_realtime` if unavailable ([models](https://elevenlabs.io/docs/overview/models.mdx)).
- The browser never sees the ElevenLabs key. `/api/stt-token` mints a single-use `realtime_scribe` token, valid 15 minutes ([token API](https://elevenlabs.io/docs/api-reference/tokens/create)).
- Half-duplex: mute the mic while Jax is speaking, unmute when the line ends. This avoids Jax transcribing itself.
- The committed transcript goes to the agent as `onboarding_answer`. The agent maps free speech ("uh, legs I guess") to a slot.

### 8.2 Text-to-speech

- `/api/tts` proxies ElevenLabs' streaming endpoint with the voice from `ELEVENLABS_VOICE_ID` ([stream API](https://elevenlabs.io/docs/api-reference/text-to-speech/stream)).
- Model from `ELEVENLABS_TTS_MODEL`, default `eleven_v4_turbo`, fallback `eleven_flash_v2_5`. ElevenLabs lists both at roughly 100 ms median model latency, excluding network ([models](https://elevenlabs.io/docs/overview/models.mdx)).
- Server-side cache keyed by hash of text, voice and model. Cue-bank lines and fixed lines are fetched once and replayed.
- During onboarding, the client prefetches every fixed line (countdown words, rest line, setup cues, milestone calls) so they play with no delay.
- Countdown: "Get ready", "3", "2", "1", "Go" are separate clips scheduled one second apart on the audio clock; the on-screen numerals follow the same schedule.

### 8.3 iPhone audio rules

These are the main source of "it worked on my laptop" failures.

- Camera and mic need HTTPS and a user gesture.
- Starting the microphone on iOS can drop playback volume or route sound to the earpiece. The reported workaround is to set `navigator.audioSession.type = "play-and-record"` while capturing and `"playback"` after. Reports say it does not work on every iOS version ([WebKit bug 218012](https://bugs.webkit.org/show_bug.cgi?id=218012), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API)).
- So: the mic is only on during onboarding. At the setup check, stop the audio track, set the session type to `"playback"`, and keep it there. The workout itself is speaker-only, at full volume.
- Web Audio is silenced by the ring/silent switch unless the session type is `"playback"`; `"auto"` does not get through. Where the API is missing, start a silent looping audio element on the same tap ([write-up](https://www.lightningjar.com/findings/ring-silent-switch)).
- One audio context for the whole app, created on the invite-code tap, routed through a gain node and an analyser node. The analyser drives the orb.

### 8.4 The orb

- Use the ElevenLabs UI Orb component. Install with `npx @elevenlabs/cli@latest components add orb` after `npx shadcn@latest init` ([Orb docs](https://ui.elevenlabs.io/docs/components/orb), [repo, MIT license](https://github.com/elevenlabs/ui)).
- Drive `agentState`: `"listening"` while the mic is open, `"thinking"` while waiting on the agent during onboarding, `"talking"` while audio plays, `null` when idle.
- Feed `getOutputVolume` from the analyser and `getInputVolume` from the mic level so the orb moves with the actual sound.
- It is WebGL. Render one instance only and resize it between the center and the top bar; do not mount a second one.

---

## 9. Coaching behavior

### 9.1 Rules (go in `instructions.md`)

Grounded in coaching research; the specific numbers are my choices.

- One thing at a time. One fault per cue, one goal per cue ([Leaders in Sport](https://leadersinsport.com/performance-institute/articles/the-power-of-coaching-cues/)).
- Short. In-set lines are 14 words or fewer. "Say the most with the least" ([Winkelman, BJSM](https://blogs.bmj.com/bjsm/2020/07/29/are-you-communicating-with-your-athletes-patients-in-a-way-that-optimises-their-performance-learn-top-tips-from-an-expert-in-the-field/)).
- External focus. Point at a target or outcome ("push the floor away"), not a muscle ([Chua et al. 2021](https://gwulf.faculty.unlv.edu/wp-content/uploads/2021/12/Chua_EF_meta-analyses_PB_2021.pdf)).
- Do not talk every rep. Feedback on about half of attempts produced better retention than feedback on every attempt ([Winstein and Schmidt 1990](https://psycnet.apa.org/doiLanding?doi=10.1037/0278-7393.16.4.677)). Target speaking on 25% to 55% of reps.
- The correction loop:
  1. Fault seen (tier A: one rep; tier B: two in a row): one gentle nudge.
  2. Next rep clean: a short acknowledgment. "There you go. That looks better."
  3. Fault still there after one or two more reps: one reminder in different words.
  4. Still there: stop repeating. Save it for the rest break and offer an easier option (lighter weight, smaller range).
  5. Never more than two cues for the same fault in one set.
- Build confidence. Praise is specific ("Your hips are doing the work now"), not generic. Positive expectations and a sense of choice help learning ([Wulf and Lewthwaite 2016](https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Wulf_Lewthwaite_OPTIMAL_Theory_2016.pdf)).
- Structure of a set: say what it is and why, show it, cue it, let them do it, debrief briefly ([NSCA](https://www.nsca.com/contentassets/81c6350a45d344ceafd3d385108216ea/coach-7.4.4-teaching-for-skill-acquisition-in-fitness-best-practices-for-fitness-pedagogy.pdf)).
- Low tracking quality means no form claims. If `quality.visibility` is low or `view_ok` is false, Jax asks for a better camera angle at the next break instead of guessing.
- Injuries change the plan. If memory lists an injury relevant to a move, Jax shortens the range or offers to skip, and never pushes through it.
- Voice: warm, upbeat, plain words, no jargon, no lectures.

### 9.2 What is spoken without the model

- Rep tick sound on every count.
- Milestones: "Five. Halfway." after rep 5, "Two more." after rep 8, "Ten. That's the set." after rep 10.
- Countdown and fixed transition lines.

### 9.3 Speech governor (client-side, hard limits)

- One utterance at a time. Queue depth of one; the newest in-set line replaces an unplayed older one.
- Minimum 3.5 s between the end of one in-set line and the start of the next.
- Drop a line if it arrives more than 3 s after the rep it refers to, or if a newer rep has already cleared that fault.
- Priority: safety, correction, fixed acknowledgment, milestone, praise, pace.
- Fixed lines (countdown, milestones) are never interrupted.
- Every decision, including dropped and silent ones, is logged with a reason.

### 9.4 Fallback when the agent is slow or down

- If `/api/coach` takes longer than 4 s or errors, the client applies the same correction loop locally using the cue bank.
- Fallback lines are traced with `source: "fallback"` so they are visible in LangSmith and in the trace audit.
- The workout never stalls because of the model.

---

## 10. Tracing: every session, start to finish, in LangSmith

### 10.1 Design

- One session ID per workout, a UUID v7 from the `langsmith` package's `uuid7` helper, as LangSmith recommends for thread IDs.
- LangSmith groups separate traces into one thread when every run carries the same `thread_id` (or `session_id`) metadata ([threads docs](https://docs.langchain.com/langsmith/threads)). The session ID is used as:
  - the Agent Server thread ID for the agent's runs, and
  - `thread_id` metadata on every app-side run.
- App-side runs are created with `traceable` in the Next.js server routes. On serverless hosting, flush before returning (`awaitPendingTraceBatches`) or runs can be lost.
- Target: one LangSmith tracing project holds both app-side and agent-side runs. `mda deploy` creates a tracing project alongside the deployment; point the web app's `LANGSMITH_PROJECT` at that same project. M1 verifies that both sets of runs appear in one thread view. If they cannot share a project, keep two projects joined by the session ID and have the audit read both.
- Optional improvement: parent the agent run under the web `coach.turn` run with distributed tracing headers. This needs an opt-in on the Agent Server and is only for trusted callers ([distributed tracing](https://docs.langchain.com/langsmith/distributed-tracing), [Agent Server tracing](https://docs.langchain.com/langsmith/agent-server-distributed-tracing)). Do it only if it is quick.

### 10.2 What gets traced

| Run name | Count per full session | Key fields |
|---|---|---|
| `session.start` | 1 | User ID, device, browser, app version |
| `onboarding.turn` | 4 or more | Question, transcript, extracted slot |
| `setup.check` | 2 | Pass time, model variant, inference rate |
| `set.start` | 4 | Exercise |
| `rep` | 40 | RepReport, plus a 10 Hz landmark series for 13 key landmarks (x, y, visibility) so the rep can be replayed in evals |
| `coach.turn` | One per agent call | Event, CoachDecision, latency, source (agent or fallback) |
| `utterance` | One per line considered | Text, played or dropped, drop reason, time to first audio |
| `set.end` | 4 | Reps, duration, faults seen and fixed |
| `session.end` | 1 | Totals, calories, completion status |

Client-originated events (reps, utterances) are batched to `/api/telemetry` every 2 s and on page hide with `sendBeacon`.

### 10.3 The trace audit ("if traces don't show up, I want to know")

- The client keeps a ledger: the ID and type of every event it emitted.
- On `session.end`, the server waits for the flush, then queries LangSmith for all runs with that `thread_id` (poll for up to 60 s to allow for indexing) and compares them to the ledger.
- Result is PASS or FAIL with the list of missing events. It is:
  1. Shown on the summary screen (pilot builds only).
  2. Written as feedback `trace_complete` (1 or 0) on the `session.end` run.
  3. Shown on `/admin/sessions/{id}` behind `ADMIN_KEY`.
  4. Posted to `ALERT_WEBHOOK_URL` on FAIL, if that variable is set.
- Abandoned sessions: a scheduled job (daily GitHub Action) lists the last 24 hours of sessions and flags any with no `session.end` or with gaps.
- Smoke test: `scripts/smoke-session` plays a full scripted session of fixture events against the deployed stack and asserts the audit passes. It runs in CI on every merge and on a daily schedule, so a tracing outage is caught even when nobody is working out.

### 10.4 Privacy note

- Traces contain landmark coordinates, transcripts and injury notes. No images or audio.
- Keep the pilot to invited friends and tell them this on the permissions screen.

---

## 11. Evals and datasets in LangSmith

Use standard LangSmith datasets and `evaluate()` with code evaluators ([code evaluators](https://docs.langchain.com/langsmith/code-evaluator-sdk)). Managed Deep Agents has its own eval system built on Harbor tasks in Docker ([MDA evals](https://docs.langchain.com/langsmith/python/managed-deep-agents-evals)); it suits file-and-tool agent tasks and is not a fit for per-rep coaching decisions, so it is not used here.

### 11.1 Four datasets

| Dataset | Example | Target under test | Evaluators | Pass bar |
|---|---|---|---|---|
| `jax-rep-counting` | Landmark sequence, exercise, expected count | The rep counter, run headless | Exact match; absolute error | Criteria 1 and 2 in section 2 |
| `jax-form-faults` | One rep's landmark sequence, labeled fault IDs (or none) | Fault detectors | Precision and recall per fault | Precision at least 0.85 to unlock speech for that fault |
| `jax-coach-decisions` | Thread history, current event, user memory, expected behavior | The deployed agent | Code checks plus an LLM judge | 100% on hard checks; judge average at least 4 of 5 |
| `jax-session-sim` | A full scripted session | Whole stack | Talk ratio, latency percentiles, trace audit | Criteria 4, 5 and 6 in section 2 |

### 11.2 Where the examples come from

- Raz's four demo videos: clean reps, run through `extract-landmarks`.
- Raz's test clips, filmed on an iPhone in portrait (list in section 16).
- Synthetic variants: take clean landmark sequences and perturb them (add knee bend, shorten the torso line, cut the range, speed up a phase). Tag these `synthetic`. They widen coverage but do not count toward the precision bar; only real clips do.
- Negative clips: standing still for 30 s, walking in and out, picking up dumbbells, doing the wrong exercise, half-hearted partial reps.
- Production: a LangSmith rule can add flagged traces to a dataset ([rules](https://docs.langchain.com/langsmith/rules)). Thumbs-down sessions and audit failures go to an annotation queue.

### 11.3 Coach-decision examples

Start with about 70, covering every fault across these situations:

- First time the fault appears (expect a correction naming that fault).
- Fault fixed on the next rep (expect a short acknowledgment).
- Fault persists (expect a reminder with different wording).
- Fault persists after two cues (expect silence in-set, then a mention at `set_end`).
- Clean streak (expect mostly silence, occasional specific praise).
- Two faults on one rep (expect the higher-priority one only).
- Tier B fault on a single rep (expect silence).
- Low tracking quality (expect no form claim).
- Injury on file that touches the exercise (expect an adjusted brief and conservative cues).
- Onboarding answers in messy natural speech (expect the right slot).
- Injury reported, then reported as healed in a later session (expect memory updated).

Hard checks (code): valid schema; speaks or stays silent as expected; `fault_id` is in the event's `faults`; no fault named that was not flagged; 14 words or fewer in-set; one fault per line; no third cue for the same fault in a set.

LLM judge (a stronger Claude model, 1 to 5 scale with a written rubric): sounds like a warm human trainer; uses an external-focus cue; fits the moment; would not annoy.

### 11.4 Online evaluation

- Online code evaluators on the tracing project for schema validity, word count, and turn latency ([online code evaluators](https://docs.langchain.com/langsmith/online-evaluations-code)).
- User thumbs are sent with `createFeedback` on the `session.end` run ([feedback docs](https://docs.langchain.com/langsmith/attach-user-feedback)).
- `npm run evals` runs all offline experiments and prints a pass/fail table. CI runs the two perception datasets on every pull request; the agent datasets run on demand and nightly.

---

## 12. Calories

- Formula: kcal = MET x 3.5 x body weight in kg / 200 x minutes.
- MET 3.5, the 2024 Compendium value for "resistance training, multiple exercises, 8 to 15 reps" (code 02054) ([Compendium of Physical Activities](https://pacompendium.com/conditioning-exercise/)).
- Body weight defaults to 68 kg (about 150 lb). Minutes is elapsed time from the first "Go" to the last rep, including rests.
- Worked example: a 6-minute session gives 3.5 x 3.5 x 68 / 200 x 6 = about 25 kcal.
- Jax always says "approximately" and states the weight assumption.

---

## 13. Environment variables and secrets

Devin secrets are bound as environment variables per command, so code must read exactly these names ([Devin secrets](https://docs.devin.ai/product-guides/secrets.md)). Never commit `.env` files. `scripts/check-env` prints which are present, never their values.

| Name | Used by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | agent | In `agent/.env` for deploy |
| `LANGSMITH_API_KEY` | agent, web server, evals | Never in the browser |
| `LANGSMITH_TRACING` | web server | `true` |
| `LANGSMITH_PROJECT` | web server | Same project the agent deployment traces to |
| `MDA_DEPLOYMENT_URL` | web server | Copy from the deployment details page; `mda deploy` prints the dashboard URL, not this one |
| `MDA_INGRESS_SECRET` | agent, web server | `openssl rand -hex 32` |
| `ELEVENLABS_API_KEY` | web server | |
| `ELEVENLABS_VOICE_ID` | web server | Raz to supply |
| `ELEVENLABS_TTS_MODEL` | web server | Default `eleven_v4_turbo` |
| `INVITE_CODE` | web server | See section 18 |
| `SESSION_SECRET` | web server | Signs the session cookie |
| `ADMIN_KEY` | web server | Guards `/admin` |
| `ALERT_WEBHOOK_URL` | web server | Optional; trace-audit failures |
| `VERCEL_TOKEN` | Devin | For deploys, if Devin does not already have access |

---

## 14. Milestones

Devin's own guidance is to break work into small, verifiable sub-tasks with explicit success criteria, one session each, and to say how the work will be tested ([instructing Devin](https://docs.devin.ai/essential-guidelines/instructing-devin-effectively.md)). Each milestone below is one session, one pull request. Update `docs/STATUS.md` at the end of each.

Order: M0, then M1 (gate). M2 to M5 can run in any order or in parallel. M6 needs M1 to M5. Then M7, M8, M9.

### M0. Bootstrap

- Repo layout from section 4, Node 22, lint, typecheck, Vitest, Playwright, GitHub Actions.
- `scripts/check-env`. Hello-world page deployed to Vercel over HTTPS.
- Done when: CI is green; the Vercel URL loads on a phone; `check-env` output is pasted into the pull request with any missing secrets listed.

### M1. Agent spike and latency gate

- Scaffold `agent/` per section 5 with backend identity, user memory and the `CoachDecision` schema. First version of `instructions.md`.
- Deploy. Write `scripts/smoke-agent`: 50 synthetic `rep` turns on one thread, plus two onboarding sessions for the same user ID and one for a different ID.
- Done when:
  - Every response parses as `CoachDecision`.
  - p50 and p95 turn latency are reported. Gate: p95 at most 1.8 s. If not met, follow section 5.6 and report.
  - An injury given in session one is known in session two for the same user, and unknown to the other user.
  - All 50 turns appear in LangSmith under one thread, and a `traceable` run from a local script with the same `thread_id` appears in the same thread view. Screenshot in the pull request.
- Stop and report to Raz after this milestone.

### M2. Pose engine and rep counting

- Landmarker wrapper with GPU-to-CPU fallback, 1 Euro filter, angle library, four state machines, `/lab`, `extract-landmarks`.
- Unit tests on fixtures. Until Raz's clips arrive, use his four demo videos and synthetic sequences.
- Done when: the four demo videos count correctly in `/lab` (screen recording attached); every negative fixture counts zero; a Playwright test using a fake webcam clip reaches the expected count; a short table compares side-on with 45 degrees per exercise (once Raz's clips are in) and states the view chosen.

### M3. Fault detectors and perception evals

- Detectors for every fault in section 7.2, `view_ok`, tier logic, `RepReport` builder.
- Build and upload `jax-rep-counting` and `jax-form-faults`; write evaluators; first experiments.
- Done when: both experiments are visible in LangSmith with links in the pull request; a table lists precision and recall per fault and which faults are unlocked for speech.

### M4. Voice

- `/api/tts` with cache, `/api/stt-token`, speech queue and governor, audio session handling, the orb wired to real audio levels, prefetch of fixed lines.
- A `/lab/voice` page: type a line and hear it; speak and see the transcript; orb states visible.
- Done when: on desktop Chrome, a fake-audio-capture test produces the expected transcript; governor unit tests cover the gap, stale-drop and priority rules; time to first audio is logged and reported.

### M5. App shell and UI

- Screens S0 to S8 with a scripted fake session (no agent, no camera required) so the whole flow can be clicked through.
- Transitions, portrait lock overlay, wake lock, pause, reduced-motion.
- Done when: screenshots at 390 x 844 for every screen and a screen recording of the full fake session are in the pull request; no layout shift when the orb moves; Lighthouse accessibility at least 90.

### M6. Coach loop integration

- Real session: onboarding through the agent, setup check, RepReports to `/api/coach`, decisions through the governor to voice, fallback policy, injuries in memory, calories, summary.
- Done when: a Playwright run with fake webcam clips and fake mic audio completes a full session unattended; with the agent URL deliberately broken, the session still completes on fallback and the trace shows `source: "fallback"`.

### M7. Trace completeness

- Ledger, `/api/telemetry`, audit, summary line, `/admin/sessions/{id}`, webhook, daily sweep, `smoke-session` in CI.
- Done when: a full session audits PASS; a session with 5 telemetry posts deliberately dropped audits FAIL, names the missing events, shows red on the summary screen and fires the webhook.

### M8. Coach evals and tuning

- Build `jax-coach-decisions` (about 70 examples) and `jax-session-sim`; evaluators and LLM judge; online evaluators; thumbs feedback.
- Iterate on `instructions.md` until the pass bars in section 11.1 are met. Report what changed and why.
- Done when: experiment links and the pass/fail table are in the pull request.

### M9. iPhone QA and fixes

- Raz runs section 15 on a real iPhone. Devin fixes what fails. Repeat until it passes.

### Session kickoff prompt (template)

```
Read AGENTS.md, then docs/PLAN.md sections <list>, then docs/STATUS.md.
Do milestone M<n> only. Do not start the next milestone.
Follow the "Done when" list exactly and attach the evidence it asks for to the PR.
If a decision gate fails or a required secret or asset is missing, stop and tell me
what you found and the options. Do not work around it silently.
Update docs/STATUS.md before you finish.
```

---

## 15. Real-iPhone checklist for Raz

Devin tests in a desktop browser with simulated cameras. Only a real phone can confirm these. Run each in Safari and in Chrome.

- Invite code accepts the right code in any letter case and rejects a wrong one.
- One tap gives camera and mic. Self-view appears mirrored in the bottom-left.
- Jax is audible at normal volume from the main speaker, not the earpiece, during onboarding.
- Jax is audible with the ring/silent switch set to silent.
- Jax understands spoken answers from arm's length; chips work as a backup.
- The orb moves with Jax's voice and reacts when you speak.
- The setup check passes with the phone propped two meters away, and refuses when your feet are out of frame.
- The counter is readable and Jax is audible from two meters.
- Each exercise: 10 real reps count as 10. Standing still for 20 s counts 0.
- Do a deliberately bad rep (squat the deadlift, swing the curl, sag the push-up): Jax nudges once. Fix it: Jax acknowledges. Keep doing it: one reminder, then quiet.
- The screen stays awake for the whole session.
- Lock the phone or switch apps mid-set, then return: the session resumes or pauses cleanly.
- Turn on Low Power Mode: counting still works.
- The sign-off states calories and the 68 kg assumption.
- The summary shows the trace check as passed, and the session is visible in LangSmith as one thread from start to end.
- Close the tab mid-workout: the session shows up as incomplete in the next daily sweep.
- Repeat a session the next day: Jax remembers the injury and does not ask from scratch.

---

## 16. What Devin needs from Raz

| Item | Needed by | Detail |
|---|---|---|
| GitHub repo and access for Devin | M0 | |
| Secrets under the exact names in section 13 | M0 | Especially `ELEVENLABS_VOICE_ID` and `ANTHROPIC_API_KEY` |
| LangSmith workspace where Managed Deep Agents can deploy | M1 | It is a public beta on LangSmith Cloud |
| Vercel project or token | M0 | Or tell Devin to use a different HTTPS host |
| Four exercise videos | M2 | MP4 (H.264), no audio needed, a clean loop of 2 to 3 reps, a few MB each. Side-on framing matches what the user is asked to do |
| Test clips filmed on an iPhone | M2 for clean sets, M3 for faults | Portrait, full body in frame, about two meters back. Per exercise: one clean set of 10 filmed side-on and one filmed at 45 degrees, plus 5 reps of each fault in section 7.2, exaggerated, side-on. Also: standing still 30 s, walking in and out, picking up the dumbbells. Roughly 30 short clips |
| Layout inspirations | M5 | Screenshots or links |
| Confirm the invite code | M0 | See section 18 |
| Optional webhook URL for trace alerts | M7 | Slack or similar |

---

## 17. Risks and how the plan handles them

| Risk | Why it matters | Handling |
|---|---|---|
| "Rounded back" cannot be measured directly | It is the example Raz cares most about, and BlazePose has no spine points | Proxy detector, tier B, silent until it reaches precision 0.85 on real clips. If it never does, the backlog option is a small trained classifier on labeled clips |
| Agent too slow for in-set cues | A cue two reps late is worse than none | M1 gate with four fallbacks; stale lines are dropped; local fallback policy |
| iPhone audio routing and silent switch | Jax inaudible is a dead product | Mic off during the workout; explicit audio session type; checklist items |
| Phone is two meters away | Small text and quiet audio are useless | Huge counter, rep tick, voice-first design, no taps needed |
| Managed Deep Agents is a beta | API may change under us | Pin versions; M1 proves the pieces before anything depends on them; the open-source `deepagents` package on a self-run server is the escape hatch |
| Side view may track worse than a diagonal view | One phone-camera study found side views weakest for detection | M2 compares side-on with 45 degrees per exercise and keeps whichever counts accurately; near-side landmarks only; visibility gate; `view_ok` |
| Push-up framing in portrait | A lying body is wide | Phone on the floor, diagonal view if side-on does not fit, setup check before the set |
| Devin cannot test on a phone | iOS-only bugs surface late | Vercel preview URL on every pull request so Raz can spot-check early; M9 is dedicated QA |
| Health-adjacent data in traces | Injury notes are sensitive | Invited friends only; disclosure on the permissions screen; no video or audio stored |
| Pose accuracy varies by person, clothing, lighting | Loose clothes and dim rooms hurt tracking | Setup check; low-quality reps produce no form claims; clips from more than one person if possible |

---

## 18. Things I decided for you

- Rep counting runs on the phone as plain code, not in the model. The model gets a compact summary after each rep (not every frame) and decides what to say.
- Side-on camera for all four exercises, with a test in M2 that can move an exercise to a 45-degree view if side-on counts poorly. Either way, knee-cave and elbow-flare detection are out of the pilot.
- "Rounded back" is estimated, not measured, and Jax only says it once the detector proves accurate on real clips.
- Weighted moves use dumbbells, matching the demo videos you generated earlier. Push press is the dumbbell version.
- Invite code: you said "Jax" but spelled J-A-C-K. I made it a setting (`INVITE_CODE`), not case-sensitive, and suggest `JAX`. Tell Devin the value you want.
- One extra onboarding question: whether the user has dumbbells. Body weight is not asked; calories assume 68 kg as in your script.
- Focus and duration answers are recorded but do not change the workout, and Jax says so in one sentence so it does not feel like a broken promise.
- 20-second rests. Before push-ups the rest waits until the phone is repositioned.
- Jax does not count every rep aloud. There is a tick per rep and spoken calls at 5, 8 and 10. This leaves room for corrections.
- The microphone is on only during onboarding. During the workout the user cannot talk to Jax; they tap to pause. This protects speaker volume on iPhone.
- Injuries are remembered per browser on a device, because there are no accounts. Clearing site data or switching between Safari and Chrome makes Jax forget.
- Anthropic's fastest model (Haiku 5.5) for all turns, with a measured latency gate before anything else is built on it.
- Web app on Vercel; agent on LangSmith Cloud. Two deployments, one repo.
- LangSmith's standard datasets and evaluators rather than the Harbor-based eval system that ships with Managed Deep Agents.
- If the model is slow or down, Jax falls back to built-in cues so the workout continues, and the trace says so.
- Background music and personalized programming are in the backlog.

## Backlog

- Background music with ducking under Jax's voice.
- Personalized programming from focus, duration, injuries and history.
- Front-view exercises (squat, lunge) with knee-cave detection.
- Voice commands during the workout ("pause", "skip", "that hurts").
- Accounts and cross-device memory.
- Trained fault classifiers to replace hand-set thresholds.
- Stronger model for the session summary.
- Home Screen install (web app manifest) once the browser flow is solid.
