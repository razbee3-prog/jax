# Jax status

## M3 — fault detectors and perception evals

- Review follow-up: degenerate derived angles now reduce tracking quality instead of leaking NaN into reports; non-finite optional neck metrics are omitted. Both tiers require real-clip validation for speech. An off-profile decisive peak suppresses form claims even when average view passes. All original demo peaks failed the profile gate, so the revised synthetic positive/clean suite explicitly projects shoulders to side-on and sets visibility to 1; it is not raw model output or new accuracy evidence. An unmodified off-profile RDL window is retained as an additional quality negative. The original 23-example experiment below is historical; the revised suite has 24 examples.
- Branch `devin/1795214320-m3-faults`, based on M2; M2 review fixes merged from its separate worktree. M1 remains paused; this work needs no Anthropic calls.
- Added all 19 PLAN 7.2 detectors in `web/lib/pose/faults.ts`, using filtered aspect-correct near-side image landmarks and the existing `view_ok` check. Starting fault thresholds are unchanged. Rep-window timing, knee/arm excursion, ear/torso proxies, signed hip sag/pike, and wrist/shin/shoulder distances are evaluated without an LLM.
- Added shared Zod `RepReport`/rep-window schemas, catalog and cue bank (three variants each of first/reminder/fixed for every fault), synced to `agent/shared/`. Added `RepReporter` (quality gates, consecutive-B streaks, separately logged observations) and one-fault correction/reminder/fixed selection with a two-cue cap. No actual voice/agent/UI events are emitted by M3.
- All faults are **speech-ineligible**: there are zero real labeled clips. Tier A results with synthetic precision >=0.85 retain a **provisional research status only**; `RepReporter` requires real precision >=0.85 for either tier. There is no dev override. Default report construction without explicit evidence fails closed. The caller must provide bounded rep/attempt windows and standing baseline where appropriate; live session wiring is deferred to M6.
- Generated 19 single-target synthetic perturbations and four presumed-clean demo negatives; documented exact operators per JSON and limitations in `evals/fixtures/faults/README.md`. Labels are not inferred from detector predictions. Only the intended positive fault is labeled on a perturbation; other fault truth is masked. All faults for the exercise are evaluated on clean negatives. Severe translations and compressed timestamps are predicate smoke tests, not realistic validation footage.
- Dataset builders/evaluators now back `npm run evals` (perception subset; coach/session evals remain M7). LangSmith authentication succeeded with the explicitly bound secret. Both datasets uploaded and both experiments completed. Counting: **16/16 exact, total absolute error 0**. Faults: 23 examples, every targeted synthetic fault detected; seven false positives on presumed-clean demos are retained rather than tuned away. Counts are one labeled positive / one negative per fault; no statistical accuracy claims.

Experiments (SDK-generated URLs):
- Rep counting: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/f51672c3-ba74-42f0-9318-55b631c174e2
- Form faults: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/239761e1-043b-4e17-a3e2-9ec5ab648aca

### Per-fault synthetic results

Real precision/recall are N/A for **every** row. Provisional does not mean real-clip unlocked.

| Fault | Tier | Precision | Recall | Research evidence status (all speech-ineligible) |
|---|---|---:|---:|---|
| rdl_back_round | B | 0.50 | 1.00 | locked |
| rdl_knee_squat | A | 1.00 | 1.00 | provisional |
| rdl_drift | A | 1.00 | 1.00 | provisional |
| rdl_shallow | A | 0.50 | 1.00 | locked |
| rdl_fast | A | 1.00 | 1.00 | provisional |
| pp_chest_forward | A | 0.50 | 1.00 | locked |
| pp_dip_deep | A | 0.50 | 1.00 | locked |
| pp_no_legs | A | 1.00 | 1.00 | provisional |
| pp_soft_lockout | A | 0.50 | 1.00 | locked |
| pp_lean_back | B | 1.00 | 1.00 | locked |
| pp_press_early | B | 0.50 | 1.00 | locked |
| curl_swing | A | 1.00 | 1.00 | provisional |
| curl_elbow_drift | A | 1.00 | 1.00 | provisional |
| curl_partial | A | 1.00 | 1.00 | provisional |
| curl_drop | A | 1.00 | 1.00 | provisional |
| pu_hip_sag | A | 1.00 | 1.00 | provisional |
| pu_hip_pike | A | 1.00 | 1.00 | provisional |
| pu_shallow | A | 1.00 | 1.00 | provisional |
| pu_head_drop | B | 0.50 | 1.00 | locked |

- Results artifact: `evals/results/m3-perception.json`. First local aggregation incorrectly iterated the already-consumed SDK experiment iterator; corrected to the SDK's public `.results` array and added an exact row-count assertion. Final results contain all 16/23 rows. The earlier experiment pair remains in LangSmith; links above are the corrected final pair.
- Independent API readback confirmed 16 counting root runs and 23 fault root runs in the final projects, with zero errors or missing outputs in either.
- M3 checks: 4 files / 78 tests passed; shared copies match; lint/typecheck exit 0; production build passed; final Playwright suite 3 passed (17.2s), including fake webcam and rewind/export. Initial cue-loop regression exposed an inconsistent-input fixed acknowledgment after two nudges; corrected to check both eligible faults and observed faults before acknowledging a fix. Report arguments are validated before streak state can mutate.
- No M3 visual surface changed: pure detector/report APIs and offline experiments only. `/lab` retains its M2 fault placeholder until live wiring; no new visual verification was requested/performed. Real fault clips, side-on/45-degree comparison, iPhone camera/framing, and real precision remain open. Received a PR #2 failed-check notification; CI-loop ownership was not delegated with the four review findings, so its remote failure has not been investigated here.

## M2 — pose engine and rep counting

### Review follow-up

- CI investigation: PR #2 job `136619497084` and PR #3 job `136621527420` both fail the fake-webcam assertion (expected 2, received 1 within 20 seconds). Reproduced with `CI=true taskset -c 0,1 npm run test:e2e`: two tests pass and camera counting fails. An instrumented local camera capture shows automatic full-to-lite switching during setup; the first hinge has a minimum measured hip angle around 137 degrees and never reaches the unchanged 125-degree RDL gate. The same demo's full-model fixture reaches about 114 degrees. CI artifacts/logs do not show the backend, so the corresponding model switch on the hosted runners remains unverified. Two camera warm-up experiments did not fix the constrained test; both changes were reverted. No threshold, timeout, or test expectation was relaxed. Resolving model-dependent counting versus making this test explicitly target a selected model needs a decision; no CI fix has been pushed.
- Approved CI follow-up: `/lab` now exposes Auto/full/lite model selection, default Auto; the fake-webcam test explicitly selects full/CPU and verifies the backend. Auto can switch only during initial setup, before any movement phase has started; that latch stays set even after an aborted rep or between reps, and resets only for a new recording. Explicit full/lite never adapt. No counting thresholds or test timeouts changed.
- Open M9 risk: lite never reaches the 125-degree hip gate on the first demo hinge in the constrained reproduction (minimum about 137 degrees), so only one of the two reps counts. Pinning this full-model smoke test does not resolve or validate lite accuracy; test/calibrate lite separately before relying on it for phone fallback.
- Follow-up local verification: lint/typecheck exit 0; Vitest 3 files / 46 tests passed; production build passed; constrained `CI=true taskset -c 0,1 npm run test:e2e` passed all 3 tests in 18.9 seconds. The changed model selector/full-CPU count-2 state was visually inspected at 390x844 (`/home/ubuntu/jax-evidence/m2/full-model-camera-count.png`).
- Fixed all four review findings with regressions: delayed right-only arrival after two seconds of empty frames now counts three curls; Stop retains capture/count/dimensions for export; a rewind to a nonzero timestamp starts a fresh monotonic recording; curl/push-up travel is measured from the last start pose, including the initial movement interval.
- Per-finding commits: delayed arrival `8d116e5`; stop/export `22ee1a0`; rewind `ca6a6ea`; start-pose travel `acf05d0`. The final combined browser suite exposed an initial-video-load race in the rewind test; follow-up `26139e4` waits for decoded data before calling play. All are pushed to M2 and merged into M3.
- Focused browser checks passed for stop/export and nonzero rewind; final lint/typecheck exit 0 and Vitest 3 files / 46 tests passed. No counting thresholds changed. Post-Stop retained UI state is behavior-tested, not newly visually inspected.

- Branch `devin/1795212767-m2-pose`, based on `devin/1795211338-m0`, independent of the paused M1 branch. M1 dependency/blocker WIP was committed and pushed separately as `b18d805` on `devin/1795212712-m1-agent`; M1 still needs a valid Anthropic key.
- Added exact `@mediapipe/tasks-vision@1.2.3`, self-hosted full/lite models and matching package WASM (sources/hashes in their READMEs), GPU initialization with CPU fallback, strictly increasing inference timestamps, and model disposal. The lab starts full and switches to lite after 30 measured inferences if inference alone averages below 20/s. Actual iPhone sustained throughput is not verified.
- Added aspect-correct 2D angles, near-side selection during setup, visibility >= 0.5, per-coordinate 1 Euro filters (min cutoff 1 Hz, beta 0.01), deterministic exercise hysteresis/timing/tracking-loss gates, and four exercise configurations. No language model or server receives camera frames.
- `/lab` accepts uploads, demos and camera input; shows skeleton, angles, phase, count, inference rate and an explicit M3 fault-flag placeholder; exports landmark JSON. Added wake-lock acquisition/reacquisition. No actual form-fault detectors are implemented in M2.
- `scripts/extract-landmarks` extracts raw landmark fixtures using headless local Chromium and 30 Hz video seeks. `scripts/generate-negative-fixtures.mts` generates deterministic negatives. `scripts/record-lab.mjs` records the visible lab at 390x844.

### Truth labels and results

Truth was determined by visually reviewing ffmpeg frame grabs at one-second intervals, not by trusting the counter. Montages: `/home/ubuntu/jax-evidence/m2/{exercise}-frames.jpg`. The visible cycles are stand/hinge/stand for RDL (approximately 0–5 and 6–12 seconds), rack/overhead/rack for push press (0–4 and 4–8), down/curl/down for curls (0–4, 4–8, 8–12), and top/bottom/top for push-ups (0–3, 3–6, 6–9). Detailed extraction provenance and limitations are in `evals/fixtures/README.md`.

| Demo | Expected | Fixture replay | Live `/lab` recording |
|---|---:|---:|---:|
| rdl | 2 | 2 | 2 |
| push-press | 2 | 2 | 2 |
| curl | 3 | 3 | 3 |
| push-up | 3 | 3 | 3 |

Standing-still, walking-in and setup/picking-up synthetic fixtures each count **0 for all four exercises** (12 negative assertions). Empty and low-visibility sequences also count zero. These are not real-world false-positive measurements.

### Evidence-backed tuning

- Push press: rack/start threshold is now <= 0.35 torso lengths (PLAN <= 0.2), completion <= 0.35 (PLAN <= 0.3), and overhead >= 0.8 (PLAN >= 0.9). `variants/push-press-cpu.json` preserves a visible rack around 0.33 with the opposite setup-side selection; the GPU demo fixture peaks around 0.87 overhead. Both fixtures now replay to the two-rep visual truth. Elbow and torso gates are unchanged.
- RDL: use the selected near wrist/hip for wrists-below-hips, not the occluded far wrist. The raw RDL fixture exposed a missed second rep with the both-wrists gate; selected-side gating restores the two frame-labelled reps.
- Corrected the 250 ms return-phase timer to start at entry to `UP_PHASE`, not at the far threshold. Added a regression case for a long bottom hold followed by a too-fast return. Other exercise angle/travel thresholds and filter parameters are unchanged.

### Verification and evidence

- `npm run lint` and `npm run typecheck`: exit 0. `npm test`: 3 files / 43 tests passed, including four demo fixtures, CPU push-press variant, all negative/exercise combinations, timing/visibility/tracking-loss regressions and mocked landmarker GPU/CPU/error/close cases.
- Final production `npm run build`: compiled successfully; routes include `/lab`. Final `npm run test:e2e`: 2 passed (17.5s); fake-webcam RDL reached count 2 (16.1s test duration). The fake webcam is a real ffmpeg-generated 640px y4m RDL clip, with three seconds of initial standing pose before movement; no counting is mocked.
- Playwright now starts the built standalone server, not the dev server. `npm run build` is required before `npm run test:e2e`; `scripts/start-web.mjs` copies public/static assets into standalone output before launching it. CI installs ffmpeg for y4m generation. ESLint excludes vendor WASM runtime JavaScript.
- First-party staged diff passes whitespace checks. The byte-for-byte copied upstream WASM JavaScript has trailing whitespace/blank EOF warnings from `git diff --check`; it is intentionally not reformatted so its recorded hashes still match the package.
- CPU was selected for recordings and fake webcam because this VM's software GPU is not representative of phone acceleration and initially dropped reps in real-time playback. Default app delegate remains GPU with CPU creation fallback. Canonical fixtures were extracted with GPU/SwiftShader; this is deliberately separate from the CPU real-time check.
- Animated recordings (each < 1 MB, below the requested 10 MB): `/home/ubuntu/jax-evidence/m2/rdl-lab.webp`, `push-press-lab.webp`, `curl-lab.webp`, `push-up-lab.webp` in that same directory. Source `.webm`, final 390x844 `.png`, raw `*-live.json`, truth montages and `fake-camera-count.png` are alongside them. Lab screenshots were visually inspected for skeleton/metrics/count; demo counts are 2/2/3/3.
- Side-on versus 45-degree comparison is explicitly deferred until Raz supplies comparison clips. The generated demos change apparent angle and do not validate camera placement. No real iPhone, portrait-upload camera framing, sustained phone performance, or wake-lock behavior on iOS has been verified. M2 was not deployed; remote CI for this branch has not been checked.

## Follow-up: authorized DigitalOcean deployment

- PR #1 head a5c9d9b passed bootstrap and Devin Review before deployment work. Added `web/Dockerfile` (build from repository root with `docker build -f web/Dockerfile -t jax-web .`), root `.dockerignore`, and standalone Next output with repository tracing root.
- Deployed to `/opt/jax/app`; Node 22 multi-stage image runs as non-root `node`, container `jax-web` on `noa_edge`, restart `unless-stopped`. Secrets are runtime-only in `/opt/jax/.env`, mode 600. ELEVENLABS_API_KEY was present; LANGSMITH_API_KEY remained missing in fresh shells and is not configured. No values logged.
- Backed up Caddyfile before adding the Jax sslip.io hostnames. Caddy config validated and reloaded; existing strongr homepage still HTTP 200. No other application containers changed.
- Live HTTPS checks: health 200 with `{"status":"ok"}`, homepage 200 containing Jax, lowercase invite 200, wrong invite 401. Live 390x844 screenshot visually inspected: `/home/ubuntu/jax-evidence/live-invite-390x844.png`.
- Deployment follow-up checks: lint/typecheck exit 0, 9 Vitest tests passed, standalone build passed locally and in Docker, Playwright 1 passed. Real iPhone verification remains open. The earlier no-deployment note below describes the original bootstrap task, superseded by this explicit deployment authorization.

## Implemented

- Node v22.23.3; npm worktree at repository root; Next.js 16.4.6 App Router, TypeScript, Tailwind.
- Section 4 directories scaffolded. Agent remains a README and synced shared copy, with no M1 agent implementation or dependencies installed.
- S0 invite copy, visual tokens, reduced-motion shake, gesture-created audio context, server-only case-insensitive invite check, health endpoint. Accepted invites show an explicit bootstrap placeholder, not S1.
- Root Commands from AGENTS.md; agent and smoke-agent stubs fail with M1 message, smoke-session with M6, evals with M7.
- Shared sync and drift-rejecting check; GitHub Actions lint, typecheck, unit tests, shared check, build and Chromium Playwright.
- PLAN and AGENTS copied without wrapper titles (source headings are content); AGENTS is 8,796 bytes.

## Verification

- Local lint and typecheck exit 0; Vitest: 1 file, 9 tests passed; build produces /, /api/invite and /api/health; Playwright: 1 passed at 390 x 844 (wrong and mixed-case correct codes).
- Shared copies match; deliberately divergent temporary copy rejected with exit 1.
- Screenshot visually inspected: `/home/ubuntu/jax-evidence/invite-390x844.png`. CI uploads browser test results.
- npm install audit: 0 vulnerabilities. Initial ESLint entities error and Playwright dev-origin/ambiguous-alert failures fixed. One transient slow-filesystem warning on the successful browser run.
- Remote GitHub Actions bootstrap job passed (commit bc66755, job 136591589786): 1 passed, 0 failed, 0 pending. Next.js generated `web/AGENTS.md` is retained as framework guidance.
- No real iPhone check, deployment, or hosted URL: explicitly prohibited by this task. Full PLAN M0 deployment/phone acceptance remains open.

## Versions

All versioned entries in the PLAN stack table were verified on npm and exist exactly: next 16.4.6, @mediapipe/tasks-vision 1.2.3, @elevenlabs/react 1.23.1, managed-deepagents 0.10.5, deepagents 1.17.0, @langchain/anthropic 1.6.6, @langchain/langgraph-sdk 1.17.0, langsmith 0.13.1. Only bootstrap dependencies installed; pose, voice, agent, tracing, shadcn and motion deferred to their milestones. The S0 idle orb is a CSS placeholder pending the real ElevenLabs Orb in the voice UI milestone. No substituted stack versions.

## Demo assets

ffprobe results (bytes); every output is H.264, yuv420p, no audio, faststart MP4. All four needed conversion for codec or size. Encoded with libx264 CRF 26, width 1280, aspect ratio preserved.

| Asset | Input codec / bytes | Output bytes | Output dimensions | Duration |
|---|---|---:|---|---|
| rdl | H.264 / 14,063,326 | 787,041 | 1280x732 | 12.250 s |
| push-press | HEVC / 1,659,118 | 466,569 | 1280x720 | 8.042 s |
| curl | HEVC / 2,609,748 | 681,343 | 1280x720 | 12.042 s |
| push-up | H.264 / 16,377,659 | 982,708 | 1280x720 | 10.000 s |

## Environment check (names only)

```text
ANTHROPIC_API_KEY: present
LANGSMITH_API_KEY: missing
LANGSMITH_TRACING: missing
LANGSMITH_PROJECT: missing
MDA_DEPLOYMENT_URL: missing
MDA_INGRESS_SECRET: missing
ELEVENLABS_API_KEY: missing
ELEVENLABS_VOICE_ID: missing
ELEVENLABS_TTS_MODEL: missing
INVITE_CODE: missing
SESSION_SECRET: missing
ADMIN_KEY: missing
ALERT_WEBHOOK_URL: missing
VERCEL_TOKEN: missing
```

Missing secrets do not block bootstrap: no external services are invoked, and an unset INVITE_CODE fails closed with HTTP 503. Playwright supplies a synthetic invite only. Real invite value and service configuration are needed before integration/deployment. No secret values committed or printed.
