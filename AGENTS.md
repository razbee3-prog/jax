# AGENTS.md: Jax pilot

Read this first, every session. The full spec is `docs/PLAN.md`. Current state is `docs/STATUS.md`.

## Non-negotiables

1. Work on one milestone per session (PLAN section 14). One pull request per milestone. Do not start the next one.
2. Meet every item in the milestone's "Done when" list and attach the evidence it asks for (screenshots, recordings, LangSmith links, numbers).
3. If a decision gate fails, or a secret or asset is missing, stop and report what you found and the options. Do not work around it silently.
4. No API key ever reaches the browser. All keys are read server-side from the env var names in PLAN section 13. Never commit `.env` files. Never print secret values.
5. Camera frames never leave the device. Only landmark numbers and text go to the server.
6. Rep counting is deterministic code on the client. Never put a language model in the counting path.
7. The agent may only name a form fault that the detectors flagged. Tier B faults stay silent until their detector reaches precision 0.85 on real clips.
8. Every user-visible event must be traced to LangSmith with `thread_id` = session ID. If you add an event, add it to the ledger and the trace audit.
9. Node 22 or newer. Pin exact dependency versions. After installing `managed-deepagents`, confirm the installed version is 0.10.x; on older Node, npm can silently install 0.0.2.
10. Update `docs/STATUS.md` before you finish: what was done, what was measured, what is open.

## What Jax is

A portrait web app for iPhone (Safari and Chrome). Invite code, then a FaceTime-style voice call with Jax (ElevenLabs voice, ElevenLabs Orb). Jax runs a fixed workout: dumbbell Romanian deadlift, dumbbell push press, dumbbell bicep curl, push-up. One set of 10 each. MediaPipe Pose Landmarker (BlazePose, 33 landmarks) counts reps and detects form faults on the device. A coach agent on LangChain Managed Deep Agents (Anthropic Haiku 5.5) decides what Jax says. Everything is traced and evaluated in LangSmith.

## Layout

```
shared/    zod schemas, fault catalog, cue bank, exercise config (single source of truth)
web/       Next.js app: UI, pose pipeline, voice, API routes
agent/     Managed Deep Agents project "jax-coach"
evals/     fixtures, dataset builders, evaluators, runners
scripts/   check-env, extract-landmarks, smoke-agent, smoke-session, trace-audit
docs/      PLAN.md, STATUS.md
```

`shared/` is copied into `agent/shared/` by a sync script. CI fails if the copies differ. Edit `shared/` only.

## Commands (create these in M0 and keep them working)

```
npm run check:env        # lists which required env vars are present, never values
npm run dev              # web app locally
npm run lint && npm run typecheck && npm test
npm run test:e2e         # Playwright
npm run agent:dev        # mda dev in agent/
npm run agent:deploy     # mda deploy in agent/
npm run smoke:agent      # 50 synthetic rep turns, prints p50 and p95
npm run smoke:session    # full scripted session, asserts the trace audit passes
npm run evals            # runs LangSmith experiments, prints pass/fail table
```

Run lint, typecheck and unit tests before every push.

## How to test without a phone or a body

- `/lab` accepts an uploaded video and shows skeleton, angles, state, count and fault flags.
- Playwright can feed a clip as a fake webcam with Chrome flags `--use-fake-device-for-media-stream`, `--use-file-for-fake-video-capture=<file>` and `--use-fake-ui-for-media-stream`, and a WAV file as a fake mic with `--use-file-for-fake-audio-capture=<file>`.
- Fixtures live in `evals/fixtures/` as landmark-sequence JSON with labels. Add a fixture for every bug you fix in the pose code.
- Take screenshots at 390 x 844 for any UI change.
- You cannot verify iPhone audio routing, the silent switch, or real camera framing. Flag anything that touches those for Raz's checklist (PLAN section 15) instead of declaring it done.

## Key design rules

Pose

- Use 2D image landmarks scaled by frame size, near-side limbs, side-on view by default (M2 tests it against a 45-degree view per exercise). Do not use world landmarks for angles.
- Visibility gate at 0.5, 1 Euro filter, timestamp-based timing (never frame counts).
- Rep = hysteresis state machine with minimum range, minimum phase time, and a start pose held for 0.5 s. Standing still must count zero.
- Counting thresholds are looser than quality thresholds. An imperfect rep counts and becomes feedback.
- Thresholds in the plan are starting points. Change them only with fixture evidence, and record the change in STATUS.

Agent

- One Agent Server thread per session; thread ID = session ID (UUID v7).
- Every turn returns a `CoachDecision` (structured response). `reason` is never spoken.
- Backend identity: send `x-mda-ingress-secret` and `x-mda-user-id` from the web server only.
- Injuries live in user memory at `/memories/user/AGENTS.md`. Write it only on onboarding turns.
- Keep everything the rep path needs inside `instructions.md`. No tool calls on a `rep` turn.
- Never send a `rep` event while a coach turn is in flight. Merge pending reps into the next event.

Voice

- One audio context, created on the invite-code tap.
- Microphone is on during onboarding only. Stop the audio track at the setup check and set `navigator.audioSession.type = "playback"` when the API exists.
- All speech goes through the speech queue and governor: one line at a time, 3.5 s minimum gap in-set, drop lines older than 3 s, 14 words maximum in-set.
- Fixed lines are prefetched and cached. The text-to-speech route caches by hash of text, voice and model.
- One Orb instance. Move and resize it; do not mount a second.

Coaching

- One fault per cue. Nudge, then acknowledge if fixed, then one reminder in different words, then quiet. Maximum two cues per fault per set.
- External-focus wording. Prefer cue-bank lines.
- Target speaking on 25% to 55% of reps. Silence is a valid decision and must be traced with a reason.
- Low tracking quality means no form claims.

Tracing

- App-side runs use `traceable` with `thread_id` metadata. Flush before a serverless function returns.
- The client keeps a ledger of emitted event IDs. `session.end` runs the audit against LangSmith and reports PASS or FAIL.
- Fallback cues are traced with `source: "fallback"`.

UI

- Portrait only. Reference viewport 390 x 844.
- FaceTime layout: orb large, self-view tile bottom-left, mirrored.
- During a set: orb in the top bar, demo video below it, rep counter at least 160 px tall, self-view bottom-left.
- No hard cuts. The orb moving to the top bar is one continuous animation.
- Do not invent a new visual style. Use the tokens in PLAN section 3 until Raz supplies inspirations.

## Copy that must be used as written

- Landing: "Jax", "Your AI personal trainer", "Enter invite code to get started".
- Greeting: "Hey, it's Jax. Let's put a workout together. What would you like to work on today: upper body, lower body, or full body?"
- Countdown: "Get ready. 3, 2, 1. Go."
- Rest: "Great job. Let's take a 20-second break, then we move on to {next exercise}."
- Sign-off: "Today you burned approximately {kcal} calories, assuming a body weight of 68 kilograms, about 150 pounds. See you tomorrow. Signing off, it's your AI trainer, Jax."

The rest of the script is in PLAN section 3.

## Reference docs

- Managed Deep Agents (TypeScript): https://docs.langchain.com/langsmith/javascript/managed-deep-agents-overview and the README inside the installed `managed-deepagents` package, which is more current than some doc pages
- Identity: https://docs.langchain.com/langsmith/javascript/managed-deep-agents-identity
- Memory: https://docs.langchain.com/langsmith/javascript/managed-deep-agents-memory
- Custom frontend: https://docs.langchain.com/langsmith/javascript/managed-deep-agents-custom-frontend
- LangSmith threads: https://docs.langchain.com/langsmith/threads
- LangSmith code evaluators: https://docs.langchain.com/langsmith/code-evaluator-sdk
- MediaPipe Pose Landmarker (web): https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- MediaPipe guidance for coding agents: https://developers.google.com/edge/mediapipe/solutions/agents.md.txt
- ElevenLabs Orb: https://ui.elevenlabs.io/docs/components/orb
- ElevenLabs realtime speech-to-text (React): https://elevenlabs.io/docs/eleven-api/resources/libraries/scribe-stt/react-scribe
- ElevenLabs text-to-speech stream: https://elevenlabs.io/docs/api-reference/text-to-speech/stream
- Anthropic latency guidance: https://platform.claude.com/cookbook/latency-optimization-latency-optimization

## Out of scope (do not build)

Background music, personalized programming, accounts, voice commands during the workout, front-view fault detection, native apps.
