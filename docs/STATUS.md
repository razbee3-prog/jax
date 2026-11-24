# Jax status

## M8 — PR #9 second review round; quality gate still FAILED

Confirmed starting HEAD **28b141f7a32a804b3bf1e16097846dee48ffcf13** before editing. **A was real**: “What kind of dumbbells do you have?” wrongly passed availability, while “Would you prefer a 5-, 10-, or 20-minute workout?” wrongly failed duration choices. Both exact examples reproduced failing-first, plus wrong which/heavy-light equipment questions (four failures total). **c61f060** adds availability-versus-detail intent checks and duration-selection intent, accepts singular/hyphenated minute choices, and still requires every expected choice. Seven additional cases cover both examples, related valid availability, missing choices and an unrelated rep-count question. Other hard checks unchanged.

**B is already resolved at 28b141f by b99ed28**, not a remaining target bug. All 15 generated third-cue inputs declare two required played corrections. `uploadRows` uploads `row.inputs` unchanged; experiment dispatch passes those inputs to `coachTarget`, which compares actual played queue outcomes after history with the required count and throws **Invalid evaluation fixture** before the candidate on mismatch. Verification-only **d48cc37** removes the test's manual precondition injection, uses the generated row unchanged, checks all 15 declarations, and proves missing/one-correction histories reject while two corrections resolve. Both deployed review experiments also report exactly **2** prior played corrections for **all 15** third cases, with zero target errors. No additional product/target change was needed.

Final checks after the last code edit: **lint exit0, all three typechecks exit0, 269 tests / 29 files passed; build compiled 407ms, 13/13 pages in 202ms; Shared copies match.** Source diff reviewed; no further scorer or agent edits during/after the run. [Second-round verdicts](../evals/results/m8/pr9-review2-verdicts.json).

### Latest fresh coach-decisions rerun

[Experiment](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/977045cf-1d8a-41ca-9118-8b61a1ca6d43) · [scores](../evals/results/m8/pr9-review2-coach.json), **exit1**:

| Check | Result | Required | Status |
| --- | --- | --- | --- |
| Aggregate hard examples | **68/78** | 100% | **FAIL** |
| Haiku judge | **3.798701299**, **77/78** judged | ≥4, all judged | **FAIL** |
| Dataset coverage | 78/78 | All 78 | PASS |

All eight other coded hard metrics **78/78**; behavior **68/78**. All onboarding next-question cases pass. Remaining behavior failures: nine rest mentions (`pu_hip_sag`, `pu_shallow`, `pu_hip_pike`, `curl_drop`, `pp_no_legs`, `curl_swing`, `rdl_fast`, `pp_chest_forward`, `rdl_shallow`) plus `rdl_knee_squat-two-faults` priority. Finite fault-language coverage remains incomplete; nothing was waived or retuned.

**Judge coverage also misses its bar:** `curl_elbow_drift-third` judge returned the four numeric scores but omitted required `explanation`; evaluator logged `OUTPUT_PARSING_FAILURE` / `Invalid input: expected string, received undefined` at path `["explanation"]`. Reported mean covers only 77 valid judgments; no replacement score, rubric relaxation or selective retry. Private full log: `/home/ubuntu/jax-evidence/m8/pr9-review2-coach.log`.

This round changes **evaluators/tests only**, not app runtime: **no new web/agent deployment or repeat session simulation needed**. The previous review's web-only deployment and healthy/outage seven-gate PASS sessions remain applicable (see below). Agent instruction hash remains **73cc67f5574d41f2d879a0c428b46a0005817f0604bad2285b8832c23445ca17**; rubric, cue bank, detector thresholds, Tier-B gates and bars untouched. M8 remains incomplete; phone acoustic/real-detector validation still unverified.

## M8 — PR #9 first review round (historical); quality gate still FAILED

Confirmed starting HEAD **a93e5666bd1b83f3aed1e026e6fa8cc479f36c9b**. All four findings were real, reproduced failing-first, then fixed separately. This round fixes measurement/evaluation correctness only: **no agent instructions, rubric, cue bank, detector thresholds, Tier-B gates or pass bars changed**. No agent redeployment was needed. Full verdicts, original failures and the 15 live precondition counts are in [pr9-review-verdicts.json](../evals/results/m8/pr9-review-verdicts.json).

| Finding | Concrete wrong case and fix | Commit |
| --- | --- | --- |
| Tick contaminates speech onset | A rep tick remains audible after the 30ms gate while cue PCM is delayed/silent; shared RMS falsely calls onAudio. Per-play and countdown analysers now receive ONLY cue buffers upstream of the shared gain, read cue RMS and disconnect in finally. Regression keeps the global meter loud while cue audio is absent/zero, then verifies real cue onset. | `1f50e21` |
| Unspoken rest text gets mention credit | `decision.text="Too much knee bend."`, `next_time="Rest for a moment."` used to pass although rest discards text. Mention checks now reuse client `restSpeech`; tests also cover selected/unselected went_well fallback and empty notes. | `464d89e` |
| Third-cue setup unverified | First reply requests quiet; second correction never plays, yet final quiet was credited after only one correction. All 15 third inputs now declare exactly two required played corrections; target checks actual queue outcomes after history and throws **Invalid evaluation fixture** on missing/insufficient history before scoring a candidate. | `b99ed28` |
| Missing next onboarding question passes | Correct injury slots plus “Have a great day” passed despite a supplied dumbbell question. Onboarding/session_start now require the supplied next question or a matching interrogative intent with its choices. Tests reject unrelated/empty speech, wrong equipment-weight questions and missing choices, while accepting exact/paraphrased questions. | `4a9a15f` |

Follow-up **c3937b2** strengthens equipment availability versus weight-amount negatives and fixes the readonly AudioContext clock test mock caught by the first full typecheck (`TS2540`). Final code checks **after the last edit**: lint exit0, all three typechecks exit0, **261 tests / 29 files passed**, build compiled **1816ms**, **13/13 pages in 241ms**, **Shared copies match.** No code/scorer edits during or after the experiments; later changes are results/docs only.

Deployed **jax-web only**, source **c3937b240f8436fccc610130e7f98fa1ed08cd69**. Other container IDs unchanged; only APP_VERSION changed, all other env bytes/credentials/webhook and mode600 preserved. **Container health HTTP200; Jax public health HTTP 200; strongr HTTP 200.** Private deployment log: `/home/ubuntu/jax-evidence/m8/pr9-review-deploy-web.log`.

### Fresh deployed experiments after the review fixes

[Coach experiment](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/c070eb09-8dc6-41a7-9ff8-f01e773aae1b), [machine-readable scores](../evals/results/m8/pr9-review-coach.json), **exit1**:

| Check | Result | Bar | Status |
| --- | --- | --- | --- |
| Aggregate hard examples | **68/78** | 100% | **FAIL** |
| Haiku judge | **3.801282051**, 78/78 judged | ≥4 and all judged | **FAIL** |
| Dataset coverage | 78/78 | All 78 | PASS |

Zero target errors; **all 15 third-cue cases actually had two prior played corrections**, not just two submitted reports. All eight other coded hard metrics are **78/78**, behavior **68/78**. All onboarding next-question cases pass the stronger check. Remaining behavior failures: eight rest mentions (`pu_shallow`, `pu_hip_pike`, `curl_drop`, `pp_soft_lockout`, `pp_no_legs`, `curl_swing`, `rdl_fast`, `pp_chest_forward`), `summary` (structured summary null), `rdl_knee_squat-two-faults` (wrong priority). Finite keyword coverage still misses clear phrases such as “hips rose into a pike” and “legs didn't drive”; no aliases were changed or failures waived in this review round. These tightened evaluators are not a like-for-like comparison to older runs; the unchanged agent's judge variation is not an instruction improvement.

[Session experiment](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/25adf329-7a30-4eca-95f1-ff84dc3497d6), [machine-readable scores](../evals/results/m8/pr9-review-sessions.json), **exit0**, rerun because the cue-only meter changed web code. **All seven gates PASS 2/2**:

| Case | Reps | Talk ratio each set | Cue-only rep→audio p50 / p95 | Min gap | Audit | Fallback rep turns |
| --- | --- | --- | --- | --- | --- | --- |
| Healthy | 40 | 30%, 30%, 30%, 30% | 64.3 / 152.5ms | 6128.7ms | PASS 281/281 | 0 |
| Outage | 40 | 30%, 30%, 30%, 30% | 63.5 / 146.2ms | 6321.4ms | PASS 282/282 | 40 |

Each case has **12/12 played in-set lines measured** with the isolated cue meter, persisted Helpful feedback and correct source mode. Healthy background guidance n=40 p50 **2263.7ms**, p95 **2968.9ms**, max **3643.8ms**. Trace end runs: healthy **50fc779c-a79d-4c4a-b0a9-c3670535d0b8**, outage **aefaa0be-4768-40a6-988a-3998dc959768**.

Both **390×844** summaries viewed: Helpful confirmation and recorded counts visible; healthy 40 reps/4:45/20kcal, outage 40 reps/4:26/18kcal and fallback explanation. Screenshots: `/home/ubuntu/jax-evidence/m8/pr9-review-sessions/sessions/{healthy-agent,agent-outage}/summary.png`. Visual review also exposes remaining agent copy imprecision: healthy narrative calls it a session “in ten minutes” while the measured timer is 4:45; not retuned in this CI/measurement round. Screenshots verify summary state, not audio-source isolation (proved by graph/regression tests). **iPhone acoustic latency and real detector validation remain UNVERIFIED.**

## M8 — iteration 3 (historical); quality gate FAILED

**M8 is not complete.** The requested one additional round is finished: **67/78 hard examples**, **3.814102564 judge average (78/78 judged)**, both below **100% / ≥4**. Both redeployed full-session simulations pass. No fourth instruction round or after-run scorer edits were made; stopping and reporting as requested. Current machine-readable results: [coach](../evals/results/m8/iteration-3-coach.json), [sessions](../evals/results/m8/iteration-3-sessions.json). Iteration 2's full `npm run evals` also exited 1; perception inputs have not changed and were not rerun.

### Iteration 3 — one requested final round

- **Quality guard:** instructions now short-circuit `view_ok=false` or visibility <0.8 BEFORE considering fault IDs, validation, streaks or memory, always returning exact quiet guidance. Both `quality-view` and visibility cases now pass. The prior client `CuePolicy.next` already suppressed poor-quality form speech, but **`HybridCoach` did not discard the background guidance itself**. Fixed that retention gap: clear stored guidance on quality loss, reject replies from poor-quality reports and reject otherwise-valid replies while current tracking is poor. Nine new tests cover focus/reminder/ack/quiet, both quality gates, recovery, stored and in-flight replies. No counting/quality threshold was changed.
- **Mention matcher:** `evals/evaluators/fault-language.ts::FAULT_LANGUAGE` is the single per-fault definition of diagnostic claims and mention vocabulary for all 19 faults. Rest mention checks no longer require an exact cue-bank sentence; rep reminder/ack approval still DOES. Original claim patterns remain, with additive synonyms also detecting unflagged paraphrases. Nineteen tests cover accepted paraphrases, all other fault lines as negatives, generic/empty prose, Tier-B and unflagged claims. The previously rejected deep-dip and excess-knee-bend paraphrases now pass. No schema, word-cap, one-fault, grounding, Tier-B or third-cue rule was relaxed.
- **Lowest 15 reviewed:** [full prior judge reasons](../evals/results/m8/iteration-3-lowest-review.json): seven rest responses, seven immutable local-cue responses, one required Tier-B silence. Actual rest issues were generic completion/visibility praise, vague external targets and missing specific observations. Both instruction profiles now request a specific, honest completion acknowledgment plus one plain observed issue and one concrete object/path target; rest wording may be natural rather than an exact bank copy. Fixed rest/sign-off text and silence remain authoritative. No extra speech was added to compensate for silence scores; **rubric, bars and cue bank unchanged**.
- **Deployment:** synced `agent/instructions.md`; existing dedicated agent **10c5b11d-e461-4f54-b75f-cd956a2f4bed** reached **DEPLOYED**, managed-deepagents **0.10.5**. Source/runtime commit **b14bb05276507269b84ef1b708a9cfb213ff818e**. Because the client guard changed, rebuilt/recreated **jax-web only**, other container IDs unchanged, credentials/webhook preserved, env mode600 retained, only APP_VERSION changed. **Jax public health HTTP 200; strongr HTTP 200.**
- **Checks after final code edit:** lint and all three typechecks exit 0; **257 tests / 29 files passed**; local build compiled **744ms**, **13/13 pages in 222ms**; **Shared copies match.** No runtime changes after these checks or during either experiment. Later edits are results/documentation only.

[Coach experiment](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/9571ae11-9a7a-4e45-9300-f776c01468bd), `iteration-3-coach`, **exit 1**:

| Check | Result | Bar | Status |
| --- | --- | --- | --- |
| Aggregate hard examples | 67/78 | 100% | FAIL |
| Haiku judge | 3.814102564, 78/78 judged | ≥4, complete coverage | FAIL |
| Decision coverage | 78/78 | All 78 | PASS |

All **eight other coded hard metrics are 78/78**; only behavior is 67/78. Hard totals are not directly comparable to the old 75/78: the old matcher admitted generic exact bank sentences as mentions. An **offline replay of the unchanged R2 outputs** with this round's matcher yields **69/78**, versus this new model run's **67/78**. This replay was not another model run or a replacement experiment; old results were not rescored in LangSmith.

The eleven remaining behavior failures are `rdl_knee_squat-two-faults` (picked `rdl_drift` instead of the lower-priority-number knee fault) plus ten third/rest rows: `pu_shallow`, `pu_hip_pike`, `pu_hip_sag`, `curl_drop`, `curl_swing`, `pp_soft_lockout`, `pp_no_legs`, `pp_chest_forward`, `rdl_fast`, `rdl_shallow`. **Keyword coverage remains incomplete**: clear phrases such as “legs didn't drive”, “chest drifted forward” and “arms finished a little soft” are still missed. Other failures are genuinely vague/wrong descriptions: hip-pike feedback says hips “dipped out of line”, and body-swing feedback describes the upper arms instead. They are retained as FAIL; ambiguous descriptions were not aliased to multiple faults just to pass. Future matcher work needs adversarial negatives as well as these positive phrases.

Judge dimension means moved from warmth **3.2564→3.4231**, external focus **3.2949→3.5513**, fit **4.0000→4.0385**, restraint **4.2564→4.2436**. Measured mean improved **3.7019→3.8141**, but the bar still misses. Rest acknowledgments also often repeat the new “Three reps in the bank” template; not every intended style change was followed. No further tuning was done.

[Fresh session experiment](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/7a0358eb-862e-445c-ba05-6351cdc227f1), `iteration-3-sessions`, **exit 0**:

| Case | Reps | Talk ratio each set | Rep→audio p50 / p95 | Min gap | Audit | Fallback rep turns |
| --- | --- | --- | --- | --- | --- | --- |
| Healthy | 40 | 30%, 30%, 30%, 30% | 63.9 / 109.9ms | 6334.6ms | PASS 282/282 | 0 |
| Outage | 40 | 30%, 30%, 30%, 30% | 67.3 / 170.6ms | 6404.2ms | PASS 282/282 | 40 |

All seven session gates **2/2 PASS**; each has **12/12 played lines measured**, expected source mode and persisted Helpful feedback. Healthy background guidance n=40 p50 **2157.8ms**, p95 **2546.0ms**, max **2860.8ms**. Separate SDK readback confirms `trace_complete=1` and `coaching_helpful=1` on both end runs: healthy **56093915-f809-4a85-8492-f981b2b74327**, outage **46a2d086-bf0f-4e68-a1bd-c1949c00df29** ([feedback evidence](../evals/results/m8/iteration-3-feedback-readback.json)).

Both **390×844** summaries visually checked once: Helpful confirmation, **282/282 recorded**, healthy 40 reps/4:47/20kcal, outage 40 reps/4:26/19kcal and the fallback explanation. Screenshots under `/home/ubuntu/jax-evidence/m8/iteration-3-sessions/sessions/{healthy-agent,agent-outage}/summary.png`. Client guard behavior is unit-verified, not live validated on real faults. Desktop meter timing **does not verify iPhone acoustic latency**; demo/counterfactual evidence does not validate detectors. No new LangSmith outage occurred and no further online-evaluator creation was attempted.

### Scope and invariant gates

- `jax-coach-decisions`: **78 synthetic counterfactual contract examples** across all 15 potential Tier-A faults, every Tier-B fault, provisional/poor tracking, two faults, corrected/persistent/third-cue cases, injury-aware briefs, messy onboarding and cross-session healed-injury memory. They authenticate through the deployed app's invite/coach path, replay the actual hybrid policy/governor and close/audit each thread. They are **not real detector-validation evidence**.
- `jax-session-sim`: healthy-agent and deliberately intercepted HTTP-502-outage whole-client sessions, chips with STT disabled, demo clips through MediaPipe, 40 actual camera-counted reps, real ElevenLabs, telemetry/audit and automated thumbs-click/readback. No framing, counting, detector evidence, thresholds or Tier-B gates changed. Local cue bank and written judge rubric also remain unchanged.
- **Requested PLAN deviation:** coach and four-dimension 1–5 judge both use **`claude-haiku-5-5`**, not the stronger judge proposed in §11.3. The same-family judge is less independent; its bar remains ≥4 with all examples judged.
- Runner executes perception, coach and session experiments, prints all bars and exits nonzero on failure. Nightly/on-demand guards require `LANGSMITH_API_KEY`, `ANTHROPIC_API_KEY`, `INVITE_CODE`, `JAX_BASE_URL`; GitHub secret provisioning remains unverified (M7 permission probe was 403). Local credentials are present and never printed.

### Audit recovery and deployment

Historical container logs around 19:40–20:10 UTC were empty. The original deployed audit exception **cannot be recovered**, so a transient LangSmith timeout remains a hypothesis, not a confirmed diagnosis. The initial independent SDK metadata call did time out; after service recovery it succeeded in **256ms**. The historical deployment had no `ALERT_WEBHOOK_URL`, ruling out that optional branch.

Commit **e057546** adds server-only audit exception logging (name/status/message/cause class, configured-secret and URL redaction) plus **one 250ms-backoff retry for transient project metadata reads only**; feedback mutations are not blindly retried. Tests cover redaction, timeout recovery, authentication rejection and exhaustion. Deployed **jax-web only**; other container IDs unchanged, environment preserved except APP_VERSION and still mode600. **Jax health HTTP 200; strongr HTTP 200.** The diagnostic image also ships the M8 browser timing instrumentation.

No audit 502 or LangSmith timeout recurred in the resumed completed experiments, so the requested further timeout-retry window was not needed. The baseline's one separate coach HTTP 502 was a semantic response failure: production `coach.request` **01a20a0f-9b5c-7000-8000-00b471465118** records **`Error: Speech and text disagree`** from decision parsing, not audit infrastructure. The judge now rejects an absent candidate explicitly instead of throwing a secondary undefined-property error; failed targets are not awarded scores.

### Instruction iterations

Both source profiles were edited, synchronized into `agent/instructions.md` and redeployed to dedicated server **10c5b11d-e461-4f54-b75f-cd956a2f4bed**, using **managed-deepagents 0.10.5**, status **DEPLOYED**. Iteration 3 instruction SHA256: `73cc67f5574d41f2d879a0c428b46a0005817f0604bad2285b8832c23445ca17`.

| Run | Change and reason | Hard examples | Judge average / coverage |
| --- | --- | --- | --- |
| [Resumed baseline](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/7b821d35-bf42-4ed1-a34c-f05644d8f883) | Existing instructions; 18 completed-output failures plus one speech/text semantic 502 | 59/78 FAIL | 3.779220779, 77/78 FAIL |
| [Iteration 1](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/b0964ecb-c545-4297-9ba2-bbbd03a2df3e) | Explicit non-null quiet guidance, blank focus text, lowest eligible priority, two-directive cap, spoken memory-write answers, exact grounded rest cue; address baseline shape/priority/repeated-fault errors | 72/78 FAIL | 3.682692308, 78/78 FAIL |
| [Iteration 2](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/93300d56-0f2f-4b75-8326-8fd89fe41ab7) | Conservative quiet at eligible-fault streak ≥3, explicit cleared-fault reason, one plain-language rest observation plus exact reminder, completion-count praise rather than invented form improvement | 75/78 FAIL | 3.701923077, 78/78 FAIL |
| [Iteration 3](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/9571ae11-9a7a-4e45-9300-f776c01468bd) | Quality-first quiet; client guidance retention guard; keyword-based rest mentions; specific warmth/external targets after reviewing lowest 15; new matcher comparable R2 replay 69/78 | 67/78 FAIL | 3.814102564, 78/78 FAIL |

No model target failed in iterations 1 or 2. Iteration 2's historical hard metrics were schema/speech/word-cap/one-fault/no-third-cue **78/78**, grounded/no-unflagged **77/78**, behavior **75/78**. Remaining rows at that stage:

- **quality-view:** `view_ok=false`, but raw guidance proposed `focus/curl_swing` rather than quiet. This is a real guidance-eligibility violation. No local form line was played in that fixture.
- **pp_dip_deep-third**, **rdl_knee_squat-third:** rep guidance was correctly quiet; the behavior mention matcher rejects the rest paraphrases (“dip went deeper than the target”, “knees bent a little more than the hinge needed”) and non-exact bank wording. These are review-needed lexical rejections, retained as FAIL rather than waived or rescored. Further evaluator synonym coverage needs both grounded-positive and unflagged-negative regression cases.
- The unchanged judge's dimension means are warmth **3.2564**, external focus **3.2949**, fit **4.0000**, restraint **4.2564**. First/persistent/fixed groups average **3.7667 / 3.6000 / 3.7333**; those immediate lines are selected synchronously from the shared bank before the same-rep agent response, so agent-only prompt changes cannot rewrite them. Persistent-third/rest rows are lower still (**3.4833**), so local wording is not the sole issue: agent rest feedback also needs work. Further cue-wording/evaluator-calibration work is open; no rubric, dataset or bar was weakened to manufacture ≥4.

### Iteration 2 full-session results (historical)

Iteration 1's two session cases failed before reps because the fixture initializer, serialized under TSX/esbuild, referenced an undefined `__name`. Actual browser evidence: **`PAGEERROR __name is not defined`**, `getUserMedia` override absent, default Chromium green-camera feed, correctly disabled framing gate. The helper now installs standalone JavaScript text without compiler-closure dependencies. Post-fix actual TSX browser: **`DEMO OVERRIDE true`**, no page error; microphone-off/on unit cases and the existing real-framing Playwright regression pass. Framing/pose gates were not relaxed.

[Final session experiment](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/a10c433f-7642-4ced-a173-1775db5b8567), dataset **e6cd6f06-a7ad-4f37-b3a2-5942c8085bfa**:

| Case | Reps | Played-rep ratio, each set | Rep→audio p50 / p95 | Minimum speech gap | Audit |
| --- | --- | --- | --- | --- | --- |
| [Healthy](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/trace/2b33f11f-1480-4cf1-a4ce-9860cb4e7768/run/2b33f11f-1480-4cf1-a4ce-9860cb4e7768) | 40 | 30%, 30%, 30%, 30% | 64.1 / 98.1ms | 6330.7ms | PASS 282/282 |
| [Outage](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/trace/32ad9752-42d1-4932-9999-226556d1410d/run/32ad9752-42d1-4932-9999-226556d1410d) | 40 | 30%, 30%, 30%, 30% | 57.6 / 151.1ms | 6604.2ms | PASS 282/282 |

Both have **12/12 played in-set lines measured**, independent ledger readback complete, expected agent/fallback mode correct and automated Helpful click persisted. Separate readback verifies **`trace_complete=1` and `coaching_helpful=1` on each session.end run**; committed [feedback evidence](../evals/results/m8/feedback-readback.json). Healthy background guidance n=39: p50 **2109.9ms**, p95 **2942.2ms**; one healthy rep turn reached its four-second deadline and was traced as fallback. Outage has **40 fallback rep turns**. These timings are not the deterministic counting path.

All seven session gates pass **2/2**, perception fixtures pass, and decision coverage is **78/78**. Only aggregate coach hard checks and judge mean fail the final printed table. Browser output-meter latency **does not verify iPhone acoustic latency** (PLAN §2 criterion 4); phone routing/silent switch/Bluetooth/permissions/framing remain unverified. Demo replays do not validate real detectors.

### Iteration 2 checks, visuals and online attachment (historical)

Iteration 2 code checks, after adding explicit normal/empty audit-read coverage: lint/typecheck exit 0, **229 tests / 28 files passed**, build compiled **443ms**, **13/13 pages in 226ms**. Existing real-framing E2E: **1 passed (14.3s)**. Shared copies matched; their source inputs have not changed. Later edits are documentation/results only, so these checks were not needlessly repeated. Node **22.23.3**, LangSmith **0.13.1**, managed-deepagents **0.10.5** verified loaded; the legacy `readSession` emits the pinned SDK's `listRuns` deprecation, not an environment/authentication failure.

Both **390×844** final summaries were visually inspected: Helpful confirmation and **“Trace check: 282 of 282 recorded”** are visible. Evidence under `/home/ubuntu/jax-evidence/m8/iteration-2-all/sessions/`: `healthy-agent/summary.png`, `agent-outage/summary.png`, plus events/results. Healthy shows **40 reps, 4:32, 19kcal**; outage **40 reps, 4:26, 18kcal**, with the visible local-coaching fallback explanation. Feedback readback is under the same run root.

Online setup listing succeeded, but initial creation and the **one requested retry** both returned **HTTP 400**, exactly **`{"detail":"Failed to create code evaluator"}`**. No permissions cause or successful attachment is claimed. Self-contained evaluator code, documented payload and setup script remain committed; no further creation attempts were made. Retry log: `/home/ubuntu/jax-evidence/m8/online-retry.log`.


## M6 — coach loop integration (desktop done-when sessions passed)

### PR #7 review follow-up

- Second review confirmed HEAD `22c0cc9`. Per-thread quota entries now expire together at UTC midnight: the 20,000-key bound still fails closed within a day without evicting active budgets, but cannot permanently strand new workouts. A failing-first test filled all 20,000 entries and observed `Expected: null / Received: "thread"` on the next day; the fix passes all 10 quota/route tests. A session spanning midnight receives a fresh thread budget along with its daily user/IP budgets.
- The re-reported non-preset injury chip issue is already fixed in `22c0cc9`: new coverage runs the production live-mode client (not fake mode), disables STT, supplies `slots.injuries=["left knee"]`, taps both confirmation choices, verifies the accepted normalized answers (`left knee` / `No injuries`), and checks the outgoing `known_injuries`/`returning` fields and progression to dumbbells. Existing preset coverage is retained. This is deterministic API-intercepted browser coverage, not a new live-provider memory write/read. No further product change was needed. Latest follow-up checks: lint/typecheck exit 0, **182 unit tests / 19 files passed**, production build passes, **4 injury-chip E2E passed**. The first expanded browser run exposed a test locator matching both screens during crossfade; scoping it to S2 fixed the harness. Non-preset visual evidence: `/home/ubuntu/jax-evidence/m6-review/returning-injury-chips-left-knee.png` (390×844).

- Confirmed starting HEAD `0327051`. Coach calls now consume server-side budgets before contacting MDA: `COACH_MAX_TURNS_PER_THREAD=120`, `COACH_MAX_TURNS_PER_USER_DAY=240`, `COACH_MAX_TURNS_PER_IP_DAY=1200` by default. Empty/invalid configuration falls back to these positive defaults. Thread counters are scoped to signed user identity; daily user/IP budgets reset at UTC midnight. Denials return 429/source=fallback and emit a fallback server trace. Failed agent attempts still consume budget. The IP bucket uses the final normalized X-Forwarded-For hop supplied by the trusted reverse proxy; absent/malformed IPs share an unknown bucket. Counters are bounded, process-local memory for the current single jax-web process: restarts reset them, and multi-replica/durable billing enforcement would require a shared store.
- While S6 is paused, the pose hook still detects visibility but never advances the counter or builds reports. Re-entry enables Resume; a fresh counting pipeline starts only after the user resumes. Browser coverage blacks out/restores the demo webcam, verifies the count stays frozen while paused, then verifies counting resumes. No detector thresholds changed.
- Restart preserves live/fake mode. Returning-injury chips provide both "Yes, still" and "No, it's better"; parsing confirms the remembered injury or clears it instead of treating those phrases as new injuries. The display flag uses React state (a follow-up lint correction), not a render-time ref read.
- A real out-of-frame auto-pause enqueues the exact fixed step-back line once through the speech queue. Its shared constant is prefetched; browser Web Audio coverage verifies one prefetch, one played utterance, and no playback-time TTS request. Manual pauses do not trigger that line. Outage-time speech retains source=fallback.
- Each finding has a failing-first regression: quota expected 429/received 200; restored frame left Resume disabled; live restart showed the preview link; remembered-injury confirmation/chips were missing; auto-pause had zero played instructions. Final local checks: lint/typecheck exit 0, **180 tests in 19 files passed**, shared copies match, production build passes, **20 E2E passed / 4 provider-opt-in cases skipped (5.4m)**. Screenshot capture waits for the returning-injury screen's crossfade to finish. Evidence: `/home/ubuntu/jax-evidence/m6-review/{real-reentry-resume,returning-injury-chips,spoken-auto-pause}.png` (390×844). No live-provider session rerun or deployment in this CI-only follow-up; iPhone verification remains open.

- **Raz decision, overrides PLAN S3/S7 for push-ups:** "i think pushups are fine for you to ignore the camera angle/position". Floor setup now offers a non-blocking prompt and Start push-ups, with no coverage/position/1.5-second hold requirement or framing guide. Initial standing setup remains unchanged. Rep counting thresholds, quality-gated fault reports and speech eligibility are unchanged.
- Independent items pushed: WIP `c74af9c`; conservative STT parsing `ece847b`, `d64c7c6`; contained camera/landmark overlay and real/fake control separation `5254232`; report-grounded debrief/summary and authoritative calories `9b4c133`; browser pending-rep proof `4a37b38`; guarded broken-upstream runbook/test `14c7efc`.
- Before floor approval: lint/typecheck, 173 tests/18 files, production build and shared copies passed. Browser partial real-agent debrief and queued-rep retention: **2 passed (1.9m)**. The partial test supplies ten real camera reports to set_end, renders actual agent feedback/summary, waits ten seconds during rest before End, and verifies calorie time froze at the last rep (60,229ms, 4kcal, MET 3.5/68kg). Pending proof holds the first HTTP turn through its four-second deadline and camera rep 3, then verifies the next HTTP request retains reports [2,3]. Evidence: `/home/ubuntu/jax-evidence/m6/independent/`.
- Client calorie duration is first Go through last counted rep, including intervening rests but excluding trailing rest after early End. Empty workouts return zero; canonical sign-off/card/agent totals share the rounded calculation. The agent was redeployed with a required grounded observation after each set's exact rest line; low-quality reports request a camera adjustment rather than a form claim. An S5 audio-failure fallback latch is reset only on screen entry, not by later caption changes.

### Final verification

- Healthy hosted-agent session: **40/40 camera-counted reps**, four actual WAV/Scribe answer commits, microphone stopped at setup, **245/245 events acknowledged**; **1 passed (8.1m)**. Full-session trace audit: **PASS (245/245 event IDs, 353 root runs)**. Thread `01a20957-05ae-738f-aff5-dd40398814fb`; [LangSmith trace](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/trace/c89145df-fc65-4eff-a98e-747833a3e25f/run/c89145df-fc65-4eff-a98e-747833a3e25f). Readback: **55/55 LLM spans use claude-haiku-5-5**, zero rep tools; the sole write_file is on onboarding_answer.
- Deliberately broken upstream (`MDA_DEPLOYMENT_URL=http://127.0.0.1:1`): **40/40 reps**, four WAV answers, microphone stopped, **246/246 events acknowledged**; **1 passed (7.1m)**. Audit: **PASS (246/246 event IDs, 301 root runs)**. Thread `01a2095f-4fb3-74dc-8bbe-6cbf854c8a05`; [LangSmith trace](https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/trace/cd1369fa-c54a-41fb-bb91-e71f27edfadc/run/cd1369fa-c54a-41fb-bb91-e71f27edfadc). API readback contains **161 source=fallback spans**, all 40 rep results fallback, and no LLM spans. Source=agent error spans describe failed backend attempts, not agent guidance.
- Healthy rep-turn HTTP dispatch→response/deadline latency, **39 turns**: nearest-rank p50 **2303.9ms**, p95 **2986.2ms**. One turn crossed the four-second deadline (**4020.9ms observed timer**); its late guidance was ignored, and pending reports **[5,6]** were merged. Successful guidance only, n=38: p50 **2240.6ms**, p95 **2915.9ms**. These timings exclude pending-queue wait. Guidance arrived before the next rep on **32/40 (80%)**, or **32/36 (88.9%)** excluding final reps with no next-rep opportunity. Local synchronous policy/enqueue, n=40: p50 **0.4ms**, p95 **0.5ms**, max **0.9ms**; broken URL p50 **0.4ms**, p95 **0.6ms**. These are not acoustic latencies; M1's latency gate remains failed.
- Healthy summary shows actual agent went_well/next_time and speaks the authoritative sign-off: **40 reps, 279094.9ms, MET 3.5, 68kg, 19kcal**. Set-end speech now preserves the exact fixed rest line and appends only the agent's structured observation (`6f2ba67`). Latest partial debrief, real UI and pending-rep checks: **3 passed**, including **60244ms / 4kcal** after trailing rest; the floor visual/interaction check separately passed in **29.5s**.
- Latest core checks: lint and web/agent typechecks exit 0; **175 tests in 18 files passed**, production build and shared copies pass. Existing full-suite regressions: 14 passed/2 skipped; its full-session case initially failed from fake-WAV phase clipping, then an immediate HTTP-telemetry count assertion saw 9 while the tenth event was still arriving. The saved ledger contains ten reps and set.end=10, disproving a counter undercount. The fixture now repeats the known speech before VAD silence; the test awaits the exact count of ten without changing thresholds, clip duration or counting assertions. Corrected healthy/broken full-session checks pass above.
- Evidence: `/home/ubuntu/jax-evidence/m6/final-agent-complete/` and `final-fallback-complete/` contain ledgers, measurements, readbacks, audits and 390×844 screenshots. Healthy `turn-metrics.json` includes the censored timeout; `last-state.png` shows the final summary. Latest partial evidence is in `final-agent-verified/partial-debrief.json`; `floor-proof/floor-setup-ready.png` captures the settled, enabled floor screen rather than its crossfade.
- Latest agent instructions deployed to existing jax-coach-dedicated. **Only jax-web** rebuilt/recreated; all other container IDs unchanged, env byte-identical and mode **600** retained. Container/public health and strongr are **HTTP 200**. Post-deploy authenticated `/api/coach` returns **200** with a real structured decision, unauthenticated **401**; `public-smoke.txt` records the checks.
- Open: real iPhone audio routing, silent switch, Bluetooth, permission prompts and device camera/framing remain Raz's checklist. All fault detectors remain provisional, so live runs do not validate fault-specific agent shaping; eligibility/caps/late-clear guards are unit-tested and remain silent without real validation. M9 lite-model undercount and phone performance risks remain open. M7 audit UI remains outside this milestone.

### Earlier partial investigation (historical; superseded by the decision above)

- Branch `devin/1795446505-m6-coach` starts from M5 `36ba1e4`.
- Raz approved **hybrid in-set coaching**, overriding PLAN's agent-per-rep spoken path after M1 failed its latency gate (p95 about 2.2s). Every rep immediately invokes local CuePolicy/cue-bank/governor decisions (`source: local`). Serialized, coalesced background agent turns guide only later local cues; their in-set decisions are never directly spoken. Valid agent-shaped cues use `source: agent`. Errors or turns over four seconds leave the workout running locally and mark following cues `source: fallback`.
- Only real-validated Tier A faults may shape speech. Tier B and provisional faults stay silent; cleared-fault/ended-set guidance is ignored, and the local cue cap/governor remain authoritative. Existing latency/perception gates are not declared passed by this decision.
- Implemented shared guidance/summary/event schemas, synchronized agent instructions, authenticated `/api/coach` with signed browser identity, serialized/coalesced rep transport, four-second fallback, local hybrid cue policy, real pose/report wiring, STT/chip onboarding and agent set/session callbacks. The local queue preserves pending rep batches even after an earlier request times out. `jax-coach-dedicated` was redeployed; the web app has **not** been redeployed, committed or pushed.
- Live Playwright with the four demo webcam clips and a real ElevenLabs-generated WAV reaches **30 camera-counted reps: RDL 10, push press 10, curl 10**. Four onboarding WAV commits are captured, microphone tracks are verified stopped at setup, and the initial whole-body check passes. The run then fails at floor setup: `Start push-ups` stays disabled for 30 seconds. Evidence: `/home/ubuntu/jax-evidence/m6/agent-setup-fixed/`, including `session.json`, `measurements.json`, `readback.json` and 390×844 screenshots. `setup-fixed-e2e.log` is one directory above. This is **not** a completed session or a passed M6 gate.
- Verified blocker: PLAN S3 requires all required landmarks visible and **50–90% frame height** for 1.5 seconds, and S7 repeats the check before push-ups. The supplied horizontal push-up clip yields 30/30 visible full/CPU setup samples but **0/30 ready**, with maximum sampled vertical coverage **0.4537076**, below 0.5. This rules out missing landmarks/model initialization as the cause of that run. The original full/GPU landmark fixture likewise peaks at 0.4717965 and never meets the height gate. No counting thresholds or framing-size limits were relaxed. Decision needed: allow the floor check to use body long-axis coverage (width for horizontal push-ups), retaining full visibility, or provide a floor-setup asset that meets the literal vertical-height requirement. Do not silently crop/warp the clip or bypass setup to pass the test.
- Two preceding setup bugs were fixed: the first implementation incorrectly required `view_ok` in addition to framing, although PLAN gates profile-dependent fault detectors separately; and the square fake-camera canvas reduced standing body height through letterboxing. The setup implementation now enforces the stated 50–90% vertical framing rule and the demo camera preserves the source aspect ratio. Legacy real-countdown tests also had empty-stream overrides superseding the demo camera; those overrides were removed. Both countdown regressions now pass.
- **Partial-session measurements only, n=30 reps:** agent guidance p50 **2076.2 ms**, p95 **2952.7 ms**, max **3048.2 ms**; guidance arrived before the next rep on **27/30 (90%)**, or 27/27 excluding each set's last rep. Local synchronous policy/enqueue latency p50 **0.5 ms**, p95/max **0.6 ms**; this is not acoustic latency. No form fault is currently real-validated (`web/lib/pose/evidence.ts` is intentionally empty), so live guidance is quiet and cached milestone speech supplies the local spoken cues; fault-specific shaping/caps are unit-tested, not live-validated.
- LangSmith readback for partial thread `01a20919-8df7-7449-9786-0766d0120fad` found **220/220 emitted event IDs**, 561 total spans, **30 rep LLM calls**, only `claude-haiku-5-5`, **zero rep tools** and one `write_file` on an onboarding turn. Two fallback-source spans are from the healthy-URL partial run, **not** the required deliberately broken-URL proof. Trace: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/r/5e1f9fb0-66c9-417a-94dc-013520b46892?trace_id=5e1f9fb0-66c9-417a-94dc-013520b46892 . Separate returning-user E2E verified hot-memory recall and playback of `Last time you mentioned Shoulder discomfort. Is that still the case?`; screenshot `/home/ubuntu/jax-evidence/m6/agent/returning-injury.png`.
- Latest lint, web/agent typecheck, **164 unit tests in 15 files**, production build and shared-copy check pass. Initial full E2E had 11 pass/3 fail; after setup fixes, the affected run has **2 passed, 1 failed (7.0m)**, with only the floor-framing failure above. The final pending-rep retention fix is covered by units and the latest build, but was made after that browser run's production build and still needs browser verification.
- Calories use rounded `MET × 3.5 × 68 / 200 × elapsed workout minutes`, MET **3.5**; this is an assumption, not a personal measurement. Signed browser identity enables returning memory on that browser, not cross-device accounts.
- Remaining before completion: resolve the floor gate; tighten ambiguous STT-answer defaults rather than automatically assuming focus/duration/equipment; remove inherited real-mode `SCRIPTED`/simulation controls and make the full-screen camera framing display/guide match the visible video (currently cover-cropped); complete both real-agent and deliberately broken-URL sessions, agent summary/calorie evidence and full-session measurements; capture final UI evidence; deploy only `jax-web`, verify health/strongr, and commit/push. iPhone routing/permissions/framing remain device-checklist items. M7 audit UI remains outside this milestone.

## M5 — app shell and scripted session

- PR #6 CI follow-up at `77d7af6`: the PR check summary showed successful pull-request bootstrap `136705825875`, but raw GitHub check-runs also exposed failed push bootstrap `136705812599` on the same SHA. Its invite assertion expected `That code didn't work.` and received an empty `#error`; this was **bootstrap, not Devin Review**. The failed artifact has no browser network trace, so its exact dispatch sequence is unverified.
- A deterministic local slow-hydration reproduction accepts input in the server-rendered form before React attaches its handler, submits a native `GET /?` instead of `POST /api/invite`, and leaves `#error` empty. The unblocked baseline sends POST and receives 401; forced WebGL failure produces a different error page. Invite input and submit now stay disabled until hydration. The new delayed-script regression failed first (`Expected: disabled`, `Received: enabled`) and now verifies both disabled controls, re-enablement, POST 401, exact feedback and no navigation. Lint/typecheck exit 0, 139 unit tests pass, and production build passes; both invite tests pass within the constrained two-CPU full run. That run also exposed a separate Voice Lab transient-countdown assertion failure (9 passed, 1 failed, 1 live-provider case skipped). Screenshots visually inspected at 390×844: `/home/ubuntu/jax-evidence/m5-ci-push-failure/invite-hydrating-390x844.png` and `invite-rejected-390x844.png`; reproduction details are in `diagnosis.json` alongside them. No timeout or counting threshold changed; CI-only, not redeployed.
- The constrained run's Voice Lab check polled for a transient “Go” before the next queued utterance clears it; a poll can miss that brief state. The regression now observes actual DOM changes and asserts the entire `Get ready, 3, 2, 1, Go` sequence after all three speech events finish, rather than weakening/removing the countdown check. Voice Lab, TTS, speech-queue and governor production sources are unchanged from `77d7af6` (checked by diff). Lint/typecheck exit 0; affected voice E2E: **2 passed (8.8s), 1 live-provider case skipped**, with all five displayed steps recorded. No new provider measurements or deployment, and no infrastructure retriggers.
- Subsequent bootstraps at `1bda29c` failed the valid-code retry. Reproduced locally on two CPUs: after filling `E2E-INVITE`, the second POST still carried `wrong` (1/6 instrumented attempts failed; `invite-retry.json` under `/home/ubuntu/jax-evidence/m5-ci-1bda/`). The controlled field was recreated on every error via `key={attempt}`; the exact intervening React render sequence was not traced. The field is now stable/uncontrolled and submission snapshots its native value. The same 300 ms shake/refocus runs on that element without recreating it, and respects reduced motion. A failing-first regression detected the disconnected original field; it now checks two invalid submissions, focus/value/element retention and the valid retry's exact payload/status. Lint/typecheck exit 0; 139 unit tests and production build pass; constrained full E2E: **11 passed (3.2m), 1 live-provider case skipped**. Rejected-code screenshot visually inspected: `/home/ubuntu/jax-evidence/m5-ci-1bda/invite-rejected-390x844.png` (390×844).
- Open diagnostic risk: PR bootstrap `136710228600` also returned one rep in the full/CPU-selected fake-camera test; its push counterpart passed that test. The failed runner's actual backend/landmarks were not recorded, so no model/performance cause is assigned. A local two-CPU capture counted two at full/CPU, with 362 frames and about 26 inference/s. Failed counting assertions now attach backend text and the landmark fixture before rethrowing the original failure; focused pose verification passed (1 test, 17.5s). The exact-two assertion, 20-second deadline, model selection and all counting code remain unchanged; investigate any recurrence from these artifacts rather than assuming the earlier lite-model cause.
- At `514f7e1`, both invite regressions pass; push bootstrap passes, but PR bootstrap `136715222111` still fails only the camera count (expected 2, received 1). Checked the unchanged PR base `e5de4c0` in a clean detached worktree with its own `npm ci`: its original camera test passes alone on one CPU (19.1s), then fails with the same count-1 assertion when an M5 software-WebGL Orb runs concurrently on that CPU. The stressed current-branch capture verifies **full/CPU, 2 inference/s, 48 frames in 20s**; the first hinge only reaches **144.88°**, never the unchanged 125° gate, and offline replay also counts one. The original hosted failure's backend/frame trace is unavailable, so that exact causal chain remains unverified there; this controlled stress reproduction is not an identical runner replay. Evidence: `/home/ubuntu/jax-evidence/m5-ci-514f/` (`base-contention-error.md`, `orb-load.json`, `pose-state.json`, `pose-failure.json`, `pose-analysis.json`).
- CI Playwright now uses one worker, isolating real-time fake-camera inference from other software-rendered browser tests; local non-CI concurrency is unchanged. This changes test resource allocation, not rep gates, model selection, clip duration, exact-count assertions or their deadlines. Body-only Playwright attachments were not durable files with the dot reporter, so failure diagnostics now explicitly write JSON into the existing artifact directory, capture state before UI interactions, await serialized data and report capture errors without hiding the original failure. Phone throughput/accuracy and the separate lite-model M9 risk remain open.
- After test isolation: lint/typecheck and build pass (368ms compile); the complete suite on two constrained CPUs uses **one worker: 11 passed, 1 provider-credential skip (3.6m)**, including exact-two fake-camera counting, both invite regressions and the complete spoken countdown. The deliberately contended run still fails the unchanged exact-two assertion and now retains both diagnostic JSON files. The earlier 139-unit-test pass remains applicable: no unit-test or production inputs changed since it ran.

- PR #6 review: confirmed base HEAD `4baf74d` omitted spoken S5 countdowns outside fake mode. The failing-first real-path browser regression scheduled **0/5** countdown clips. The fix queues the setup cue plus cached countdown as one uninterrupted item, drives the displayed steps from AudioContext callbacks and waits for “Go” to finish before S6. Audio failure falls back to the visual timer; fake mode remains silent and timer-driven. Unit coverage includes malformed/late callbacks and fallback; mocked-PCM browser coverage exercises scheduled audio/display synchronization and failed audio. Lint/typecheck/build pass, **139 unit tests** and **4 shell E2E tests** pass; observed maximum audio/display skew **29.8 ms** (desktop Chrome, synthetic PCM, not acoustic/iPhone latency). Visually inspected screenshot: `/home/ubuntu/jax-evidence/m5-review/S5-spoken-countdown.png` (390×844). Review fix is CI-only, not redeployed; real-provider/iPhone verification remains open.

- Branch `devin/1795226772-m5-shell`, based exactly on M4 review head `e5de4c0`. S0–S8 are the main route. `/?fake=1` requires the normal invite but no camera, microphone, agent or network audio. Chips supply the four onboarding answers; four scripted sets count ten reps at 1.5 s per rep, with five-second intros, 20-second rests, explicit push-up floor setup and the exact final copy. Real camera preview is optional; **real pose/agent/STT integration remains M6**. Preview summaries are explicitly not form assessments.
- Reused M4 Orb, shared AudioSession, TTS and speech queue/governor; reused M2 exercise metadata and Wake Lock helper. Fake mode never fetches TTS. Tick sounds are local Web Audio. The one persistent Orb/canvas moves/resizes with a 500 ms ease-in-out transform; screens crossfade over 250 ms. Reduced motion removes movement and pauses demo clips. A fixed canvas backing box and `offsetSize: true` prevent React Three Fiber from measuring the transformed size twice. A first browser check caught 0.0122 layout shift with layout-driven resizing; the final transform-only movement measures **0**. Counter numerals use 160 px tabular heavy type in a reserved box.
- Portrait overlay, tap-to-pause/resume, Skip, End, out-of-frame simulation, 1.5-second setup hold, five-second missing-frame pause, 30-second no-rep set end, permission denial/retry, Wake Lock release on summary/unmount, and fresh-session restart. Native camera/audio tracks stop at the documented boundaries. `?fake=1&deny=1` simulates denial once. `?fake=1&preview=S0` through `S8` are frozen, display-only layout/a11y previews; they do not bypass server API authentication.
- New session event route records bounded, authenticated app-side runs with UUID event IDs and session `thread_id`; the client keeps an emitted/acknowledged ledger. `scripts/audit-shell.mts` covers the new event catalog. S8 sends `coaching_helpful` score 0/1 through an authenticated server route using a run-bound HMAC receipt. **No provider keys are sent to the browser.** Real provider verification: `session.end` and feedback POSTs both HTTP 200; independent LangSmith readback found score 1 on run `08d91430-7630-4a09-bca9-20a80dae5686`, thread `01a1fbef-66b3-70af-933d-dc8d7da1d114`; the one-event audit passed 1/1. Initial immediate feedback readback preceded indexing; the later independent query verified delivery. Full-session audit/summary PASS/FAIL wiring is deliberately M7; the UI says pending, never a fabricated PASS.
- Checks: lint/typecheck/build exit 0; 11 unit files / 137 tests passed. Full Playwright suite: 7 passed, 1 live-provider test skipped without credentials. After visual refinements (countdown wrapping, centered fixed-width count and SVG feedback icons), affected invite/shell tests passed 3/3. Final denied/retry, portrait/reduced-motion, Skip/End and Wake Lock acquisition/release regression passed 1/1 after the summary cleanup fix. Screenshots were visually inspected, not merely saved.
- Lighthouse CLI 13.6.0 at 390×844: **S0–S8 each 100 accessibility**. Final Orb-move CLS **0**; full-session CLS **0** (three tiny input-associated text shifts totaling 0.001515 are excluded by CLS, not silently discarded from evidence). Raw metrics: `/home/ubuntu/jax-evidence/m5/layout-shift.json`; individual Lighthouse JSON reports and `lighthouse-scores.json` alongside it.
- Evidence: `/home/ubuntu/jax-evidence/m5/S0.png` through `S8.png`, `S1-denied.png`, `S3-floor.png`; portrait overlay is necessarily captured at **844×390**, `portrait-overlay-landscape.png`. Full-session animated recording: `full-fake-session.webp`; dimensions/frame count/duration/size are in `recording.json`. Contact sheet: `final-screens.png`. Provider proof/audit: `feedback-proof.json`, `feedback-ledger.json`, `shell-trace-audit.json`.
- Deployment: **only `jax-web` rebuilt/recreated**; every other container ID unchanged. Existing environment byte-identical and mode 600 preserved. Container health 200, public `/api/health` 200 `{"status":"ok"}`, public scripted shell 200 and strongr 200. Deployment log: `/home/ubuntu/jax-evidence/m5/deploy-result.txt`. iPhone routing/silent switch/Bluetooth, native permission UX, real camera framing, real-device reduced motion and wake-lock behavior remain Raz’s section-15 checklist. M1's failed latency gate and M9's lite-model undercount risk are unchanged.

## M1 resumed — deployed, latency gate FAILED

- Branch `devin/1795212712-m1-agent`; merged M3 first (`de76408`). The prior Anthropic-key blocker is resolved: explicit org binding and `claude-haiku-5-5` returned HTTP 200. Every new Anthropic call, including isolated API probes, used only that model. No larger/fallback model or LLM judge was used.
- Read the installed `managed-deepagents@0.10.5` README and scaffolded `jax-coach` with `--no-sandbox`, moved into `agent/`. Native structured `CoachDecision` schema lives in `shared/` and is synced. The Anthropic JSON-schema subset rejected integer bounds, so the wire schema uses plain numbers; the client parser additionally enforces positive whole-minute duration, nonempty reasons and coherent speech/text.
- Backend-only ingress uses the two MDA headers, explicitly suppressing workspace-key forwarding. Per-user injury memory is `/memories/user/AGENTS.md`, with the SDK's supported (deprecated) `allow` opt-in for direct backend calls. No agent-shared memory. An injury answer must complete a write before the structured final reply; the model initially promised persistence without writing, caught by the new-session smoke test and fixed with a required onboarding write phase. Rep tools are removed and guarded at execution too.
- Instructions implement PLAN 9.1, include all 19 faults and the cue bank, and forbid provisional/synthetic-only speech eligibility. Baseline and compact sources are retained; compact uses one phrase per cue kind and current-set-only model context. No counting, thresholds, perception evidence or cue acknowledgment/cap behavior changed.
- Selected server: https://jax-coach-dedicated-3a2af49f980e52d586bcfd9b83a5026c.us.langgraph.app . Project: `jax-coach-dedicated-production`, ID `01a1fb80-0ac8-7811-8ba3-fb4377f4e01d`. `npm run agent:deploy` targets this dedicated server. Profile `trim` is the best observed MDA configuration, but **does not pass** p95 <=1.8 s (or p50 <=0.9 s).

All measurements below are 50 sequential synthetic clean rep turns on one UUID-v7 thread, after separate onboarding sessions, without excluding slow turns. They measure full SDK wait/parse latency from this VM, not TTS or iPhone latency. Quantiles use nearest rank. The same small report payload was used in all trials; this is not a representative faulty/large-keyframe workload.

| Configuration, in PLAN 5.6 order | p50 seconds | p95 seconds | Gate |
|---|---:|---:|---|
| Serverless baseline | 3.239 | 5.025 | FAIL |
| Dedicated baseline | 2.679 | 5.065 | FAIL |
| Dedicated, shorter prompt/current-set history | 3.013 | 4.715 | FAIL |
| Dedicated, trimmed harness and exit-only rep checkpoints | 1.874 | 2.403 | FAIL |
| Selected trim, compatible LangChain 1.6.6, final redeploy | 1.808 | 2.210 | FAIL |

- Trim excludes optional planning/async delegation/parent notification/steering middleware and related tools, retaining required filesystem/subagent scaffolding, memory, cache and tool guards. Only tool-free rep requests use exit-only checkpoints; intermediate rep state can be lost on a mid-run crash, but successful final state is committed and onboarding retains default durability. API comparison showed 50 each of parent-notifier, async-before-model and steering-before-model spans in the short trial, zero in trim. Evidence: `/home/ubuntu/jax-evidence/m1/harness-comparison.json`.
- Every trial parsed all 50 decisions and all three onboarding replies. Same user/new thread recalled the synthetic knee injury; different user returned no injuries. LangSmith API verified 51 roots in one project/thread (50 exact rep event IDs plus local `traceable`), with no errors or rep tool calls in the dedicated trials. Trim thread: `01a1fb96-e431-711b-bc13-0d8788c67a45`. Raw decisions, latencies and API proof: `/home/ubuntu/jax-evidence/m1/{serverless-baseline,dedicated-baseline,dedicated-short,dedicated-trim}.json`.
- Last option, **prototype only, not adopted**: existing local `CuePolicy` + schema parsing over 50 synthetic reports took p50 0.000011 s / p95 0.000323 s, spoke 15/50. Mock validated flags exercise cached correction/reminder/fixed branches; they are not real precision evidence. This is not an MDA or audio latency measurement and does not make the M1 gate pass. Evidence: `/home/ubuntu/jax-evidence/m1/hybrid-prototype.json`. **Raz must approve hybrid in-set coaching before routing changes**; onboarding, set-end feedback and summaries would remain MDA-owned.
- Chrome reached the LangSmith login/signup gate; no thread screenshot was possible. Login evidence: `/home/ubuntu/jax-evidence/m1/langsmith-login-required.png`. API thread proof is saved instead. No API keys were put in the browser.
- Keys/ingress secret are in gitignored `agent/.env` and mode-600 `/home/ubuntu/jax-secrets/.env`; ingress generated with openssl. The platform owns its tracing project; the project variable is intentionally omitted from deploy env and retained locally for app traces. A stale SDK deprecation warning was removed by using its current run-query/URL API, after verifying Node/environment and API behavior. Generated `.mda` output is excluded from lint/agent typechecking; source remains checked.
- Original serverless spike is retained at https://jax-coach-0461fad529a05da6a65542fe14d4b741.us.langgraph.app (not selected); no hosted resource was deleted. Dedicated hosting was created for the explicitly requested mitigation and may incur its usual cost.
- Runtime sync completed: four M1 values verified inside `jax-web`, `/opt/jax/.env` mode 600 preserved, only `jax-web` recreated on `noa_edge`. Container and public health returned HTTP 200. No droplet IP or credential values printed.
- Local verification: lint clean, web + agent typechecks passed, **95 tests in 5 files passed**, shared copies match, production build passed. A middleware type conflict exposed the SDK's exact nested LangChain 1.6.6/core pin; aligning the authored LangChain dependency to 1.6.6 deduplicated middleware types without a cast or changing required MDA/Anthropic/deepagents versions. No UI change; existing browser/real-phone verification was not rerun.
- Final redeployed compatible build: `/home/ubuntu/jax-evidence/m1/selected-trim.json`, thread `01a1fba4-24d3-7059-ac40-04df80fa1c61`, exact 51 roots, zero rep tools, memory isolation and all schema/word-count checks passed; the smoke exits 1 solely for latency. API model readback over its rep/onboarding threads found **55/55 LLM spans using claude-haiku-5-5**, saved in `model-verification.json`. An intermediate trim rerun before dependency alignment measured 1.824/2.146 s; retained as `selected-trim-langchain-1.6.7.json`, not the shipped dependency build. All these repeated samples still failed the gate; no slow sample was dropped.


## M3 — fault detectors and perception evals

- Review follow-up: degenerate derived angles now reduce tracking quality instead of leaking NaN into reports; non-finite optional neck metrics are omitted. Both tiers require real-clip validation for speech. An off-profile decisive peak suppresses form claims even when average view passes. All original demo peaks failed the profile gate, so the revised synthetic positive/clean suite explicitly projects shoulders to side-on and sets visibility to 1; it is not raw model output or new accuracy evidence. An unmodified off-profile RDL window is retained as an additional quality negative. The revised suite below has 24 examples; earlier 23-example experiments remain historical in LangSmith.
- Push-press phase labels now match curl direction: ascent to maximum wrist height is lifting, return is lowering. Dip/early-press predicates use explicit pre-lockout timestamps/knee angles, not these phase labels; their thresholds are unchanged. All four review fixes had a targeted failing-first test; final lint/typecheck, 83 tests in 4 files, shared-sync check and production build passed. The rejected cue acknowledgment/cap behavior was not changed.
- Branch `devin/1795214320-m3-faults`, based on M2; M2 review fixes merged from its separate worktree. M1 remains paused; this work needs no Anthropic calls.
- Added all 19 PLAN 7.2 detectors in `web/lib/pose/faults.ts`, using filtered aspect-correct near-side image landmarks and the existing `view_ok` check. Starting fault thresholds are unchanged. Rep-window timing, knee/arm excursion, ear/torso proxies, signed hip sag/pike, and wrist/shin/shoulder distances are evaluated without an LLM.
- Added shared Zod `RepReport`/rep-window schemas, catalog and cue bank (three variants each of first/reminder/fixed for every fault), synced to `agent/shared/`. Added `RepReporter` (quality gates, consecutive-B streaks, separately logged observations) and one-fault correction/reminder/fixed selection with a two-cue cap. No actual voice/agent/UI events are emitted by M3.
- All faults are **speech-ineligible**: there are zero real labeled clips. Tier A results with synthetic precision >=0.85 retain a **provisional research status only**; `RepReporter` requires real precision >=0.85 for either tier. There is no dev override. Default report construction without explicit evidence fails closed. The caller must provide bounded rep/attempt windows and standing baseline where appropriate; live session wiring is deferred to M6.
- Generated 19 single-target synthetic profile perturbations, four projected presumed-clean demo negatives and one unmodified off-profile quality negative; documented exact operators per JSON and limitations in `evals/fixtures/faults/README.md`. Labels are not inferred from detector predictions. Only the intended positive fault is labeled on a perturbation; other fault truth is masked. All faults for the exercise are evaluated on clean/quality negatives. Severe translations, synthetic profile projection and compressed timestamps are predicate smoke tests, not realistic validation footage.
- Dataset builders/evaluators now back `npm run evals` (perception subset; coach/session evals remain M7). LangSmith authentication succeeded with the explicitly bound secret. Revised v2 datasets uploaded and both experiments completed. Counting: **16/16 exact, total absolute error 0**. Faults: 24 examples, every targeted synthetic fault detected; four false positives on projected presumed-clean demos are retained. Each fault has one positive and one projected clean negative; RDL faults also have an off-profile quality negative. All 19 are speech-ineligible; no statistical accuracy claims.

Experiments (SDK-generated URLs):
- Rep counting: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/48de20a7-848b-4d7c-8564-f4c568e32518
- Form faults: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/4e455a1e-9324-4fe2-a528-9c132daaa964

### Per-fault synthetic results

Real precision/recall are N/A for **every** row. Provisional does not mean real-clip unlocked.

| Fault | Tier | Precision | Recall | Research evidence status (all speech-ineligible) |
|---|---|---:|---:|---|
| rdl_back_round | B | 0.50 | 1.00 | locked |
| rdl_knee_squat | A | 1.00 | 1.00 | provisional |
| rdl_drift | A | 1.00 | 1.00 | provisional |
| rdl_shallow | A | 0.50 | 1.00 | locked |
| rdl_fast | A | 1.00 | 1.00 | provisional |
| pp_chest_forward | A | 1.00 | 1.00 | provisional |
| pp_dip_deep | A | 1.00 | 1.00 | provisional |
| pp_no_legs | A | 1.00 | 1.00 | provisional |
| pp_soft_lockout | A | 1.00 | 1.00 | provisional |
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

- Results artifact: `evals/results/m3-perception.json`, suite `m3-perception-v2`, includes all 16/24 rows and explicit `speech_eligible: false` for every detector. The first v1 aggregation incorrectly iterated the already-consumed SDK experiment iterator; the runner now reads `.results` and asserts exact row counts. Earlier experiments remain in LangSmith; links above are the revised v2 pair.
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

## M1 started — blocked on Anthropic authentication

- Branch `devin/1795212712-m1-agent` created from the M0 branch. Installed pinned M1 packages and verified `managed-deepagents@0.10.5` (not 0.0.2); read the installed README and init CLI help. Zod pinned to 4.6.7 after npm audit flagged 4.3.6; updated install reports 0 vulnerabilities.
- Anthropic `GET /v1/models` returned HTTP 401, `authentication_error: invalid x-api-key`, both with the inherited environment and an explicitly bound org ANTHROPIC_API_KEY. Request ID for explicit binding: `req_011ChEwvL9KCh3GpFxpwWi8R`. This blocks model selection, real agent turns, memory tests and the latency gate. No model fallback can resolve authentication failure.
- LANGSMITH_API_KEY was explicitly bound; LangSmith `/info` returned HTTP 200 (this endpoint alone does not establish workspace authorization).
- Per the standing missing-secret rule, stopped before scaffolding/deployment rather than incurring deployment changes with an unusable model credential. No ingress secret generated, no agent deployment, no droplet changes, no smoke measurements, and no commit or push yet. Dependency and status changes remain local pending a working Anthropic credential.

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

## M4 — Voice

Implemented on `devin/1795223903-m4-voice`, based on M1. The existing M1 latency
gate remains failed and unchanged; M4 makes no Anthropic calls.

- `/api/tts`: authenticated streaming PCM proxy, configured voice/model, model-error
  fallback to `eleven_flash_v2_5`. SHA-256(text, voice, actual model) cache:
  process-local 16 MiB LRU, 24-hour sliding retention; partial/failed streams are
  not cached. Model fallback resolution is remembered for five minutes.
- `/api/stt-token`: authenticated, no-store, single-use `realtime_scribe` token;
  provider contract expires unused tokens after 900 seconds.
- Invite success now issues a signed HttpOnly, SameSite=Strict cookie (Secure in
  production), using the existing `SESSION_SECRET`. Billable voice routes require
  it and reject cross-origin browser requests. Local HTTP E2E seeds the returned
  signed cookie without its HTTPS-only flag; deployed cookies retain Secure.
- One shared AudioContext, unlocked by the invite tap or lab Enable audio gesture;
  gain and output analyser, mic analyser, track-level half-duplex, playback session
  type after setup, silent looping HTML audio fallback where audioSession is absent.
  Scribe uses `@elevenlabs/react@1.23.1` with VAD, `scribe_v3_live`, and a fresh-token
  `scribe_v2_realtime` fallback on model errors. Its manual-audio mode receives
  16 kHz PCM from the SDK worklet in the existing context, avoiding a second context.
- One real ElevenLabs Orb, manual volumes from both analysers; idle, thinking,
  listening (only after capture opens), talking. `/lab/voice` provides text speech,
  live/committed transcript, countdown, meters, TTFA, and an event ledger.
- Speech queue: one active and one pending item; 3.5-second end-to-start in-set
  gap, 14-word cap, >3-second stale drop, newer-rep fault-clear drop. Freshness is
  checked again before scheduling first PCM after network preparation. Priority
  wins pending arbitration; newest replaces within equal priority. Active lines,
  including fixed countdown/milestones, are never interrupted by another line.
- Fixed onboarding/setup/transition/milestone lines are prefetched. Countdown clips
  are scheduled one second apart on the AudioContext clock, with matching screen
  numerals; clips longer than 0.95 s are time-compressed to avoid overlap.
- `/api/voice-events` traces utterance outcomes/reasons/TTFA and committed transcripts
  with the UUID-v7 lab session ID, then flushes. The client ledger tracks server
  acknowledgments. `scripts/audit-voice.mts` independently checks LangSmith run IDs.

### Desktop evidence

Real generated WAV (`evals/fixtures/voice/known-phrase.wav`), fake microphone capture,
real single-use token and real Scribe WebSocket; no transcript mocking:

```text
Expected: I would like a full body workout.
Actual:   I would like a full body workout.
Voice trace audit: PASS (7/7 event IDs, 7 root runs).
```

Session: `01a1fbca-bc9c-773c-8811-18f65a5a4ff4`, six played utterances and one VAD
commit. The browser test also verifies one AudioContext and ended mic tracks after
Setup. An intentionally absent eighth ID produces the expected negative audit:
`FAIL (7/8 event IDs, 7 root runs)` with the missing sentinel explicitly listed.

TTFA is TTS-play invocation to first nonzero output-analyser samples, not an
acoustic speaker measurement. Desktop headless Chrome against the local production
Next server and real ElevenLabs, after fixed prefetch; three samples per cache state:

| Server cache | p50 | Maximum |
|---|---:|---:|
| Miss | 337.8 ms | 350.3 ms |
| Hit | 53.9 ms | 54.8 ms |

Evidence under `/home/ubuntu/jax-evidence/m4/`: `voice-results.json`,
`trace-audit.json`, `trace-audit-negative.json`, `voice-lab-390x844.png` (visually
inspected, 390×844). No audio is sent to LangSmith.

### Checks

Lint and web/agent typechecks exited 0. Unit tests cover governor, queue, token,
stream/cache/fallback, invite access, microphone lifetime, and trace acknowledgment.

```text
Test Files  8 passed (8)
     Tests  121 passed (121)
✓ Compiled successfully in 1587ms
✓ Generating static pages using 7 workers (9/9) in 164ms
```

The full E2E run passed existing invite, rewind, and fake-camera regressions. Both
new voice tests initially exposed a test-harness bug reading innerText from a closed
details element; fixed to textContent. Final focused voice rerun:

```text
✓ voice lab uses actual Web Audio and one orb; cached countdown is uninterrupted (7.5s)
✓ real realtime Scribe transcribes fake WAV; streaming TTS reports miss/hit TTFA (42.7s)
2 passed (51.0s)
Browser secret scan: PASS (17 static assets; no bound ElevenLabs/LangSmith or local key/secret bytes).
```

Live E2E is explicitly skipped without ElevenLabs AND LangSmith credentials; the
offline Web Audio/countdown test always runs. Dependency check verified MDA 0.10.5
and React voice SDK 1.23.1. All new direct dependencies are exact-pinned.

### Deployment

Rebuilt/recreated only `jax-web` on `noa_edge`, restart `unless-stopped`. Refreshed
the three existing ElevenLabs variables using the explicitly bound org credential;
no new variable names were needed. Preserved `/opt/jax/.env` mode 600 and all other
variables, including M1. Other container IDs were unchanged. Verification from VM:

```text
Container /api/health: HTTP 200
Public /api/health: HTTP 200 {"status":"ok"}
Public /lab/voice: HTTP 200, Voice lab present
Public unauthenticated /api/tts: HTTP 401
Public invited /api/tts: HTTP 200, PCM bytes=30720, model=eleven_v4_turbo
Public /api/stt-token: HTTP 200, single-use token present, expires_in=900
strongr: HTTP 200
```

### Deviations / remaining QA

- Shadcn init cannot detect the nonstandard `web/` layout: used its documented
  manual configuration. ElevenLabs CLI was invoked but its registry returned 429;
  installed the same official MIT Orb from upstream commit
  `1909af6b522dc97f2ec8f49230be2e9a1a7f6e7e`, with licenses/provenance. Adapted
  imperative scene ownership for existing React lint rules; no rules disabled.
- Cache is in-process, not distributed or persistent across restarts. TTFA above
  is local-proxy desktop timing, not the deployed droplet or iPhone audio route.
- Agent wiring and agent-timeout fallback (PLAN 9.4) belong to M6; full-session
  ledger/audit integration remains M7. This milestone has a voice-specific audit.
- iPhone silent switch, earpiece/speaker routing, Bluetooth, interruptions and
  real permission prompts remain unverified and require Raz's M9 checklist.
- The upstream Orb shader retains five trailing-whitespace warnings; first-party
  diff whitespace checks are clean. Shader bytes were otherwise preserved.

### PR #5 review follow-up

Confirmed review baseline HEAD `231f8bb3`; all three findings reproduced with
failing-first tests and were fixed in separate commits:

- Failed AudioWorklet downloads now clear the rejected cached promise. Regression
  covers failure releasing tracks, a successful retry, and reuse of that success.
- Voice Lab now displays committed history plus the current partial, rather than
  hiding all later partials. Browser regression drives mocked Scribe WebSocket
  messages through the real hook and checks empty, committed, partial and next
  committed states. Before the fix it received only `Full body please.` instead
  of `Full body please. My shoulder`.
- Each TTS playback owns its fetch AbortController, forwards caller cancellation,
  cancels/releases its response reader and aborts its request in finally. A stale
  pre-audio rejection retains the original drop reason and does not abort the
  caller or shared prefetch. Tests cover stale rejection, empty stream, caller
  cancellation and reuse of cached clips. Before the fix reader cancellation was
  never called, its lock remained held, and the request signal was not aborted.

Lint and web/agent typechecks exited 0; final local checks:

```text
Test Files  9 passed (9)
     Tests  126 passed (126)
✓ Compiled successfully in 1537ms
✓ Generating static pages using 7 workers (9/9) in 163ms
2 passed (8.9s)
1 skipped
```

The focused voice E2E run skips the live-provider case without credentials, just
as CI does; no new real-provider measurements were made in this review loop.
Partial transcript screenshot visually inspected at 390×844:
`/home/ubuntu/jax-evidence/m4-review/partial-transcript-390x844.png`.
Review fixes are pushed for CI only, not redeployed. Real-device QA remains open.

## M7 — trace completeness (desktop validation complete)

Branch `devin/1795456505-m7-trace` starts at M6 review HEAD `034b51a`.
The existing shell ledger/audit path now shares its recorder and comparison with
batched `/api/telemetry`, `/api/session/audit`, admin inspection and the CLI.
Client batches flush every 2 seconds; page hide beacons include unacknowledged
and in-flight events. Canonical onboarding/setup names preserve legacy callers.
Rep runs include the RepReport's rolling 15-second analysis window, linearly
resampled at 10 Hz into 13 image-coordinate landmarks; visibility uses the
minimum endpoint value and gaps over 500 ms are marked invisible. No frames,
images, audio or world landmarks are uploaded; counting thresholds are unchanged.
Utterances record played/dropped, original outcome, reason and nullable TTFA.
Set starts/ends, setup rate/model, structured coach decisions and session totals
are recorded; the final flush waits for the summary turn and speech queue.

The audit polls LangSmith for up to 60 seconds, compares IDs and canonical names
against the ledger and persisted end manifest, writes `trace_complete` feedback,
persists `trace.audit`, optionally sends a failure webhook, and drives the actual
summary status/missing-event list. Server-side Basic auth (`admin:ADMIN_KEY`)
protects `/admin/sessions/{id}`. A new random 256-bit key is stored only in the
mode-600 server environment and local private evidence files; it is never printed.
The permissions screen discloses landmark/transcript/injury-note retention.

`npm run smoke:session` replays 40 fixture reports against the deployed APIs and
independently reads LangSmith. The daily sweep flags last-24-hour sessions with
no end or ledger gaps. The trace workflow runs on main pushes and daily, and
skips cleanly if required repo secrets are unavailable. GitHub secret writes were
denied at the public-key request: HTTP 403, Resource not accessible by integration.
Raz must add `LANGSMITH_API_KEY`, `INVITE_CODE`, and `JAX_BASE_URL`; this toolset
has no explicit org-secret binding, so no alternate credential was substituted
for the requested org-secret write.

Initial browser tests caught an illegal native-fetch receiver in the new ledger
(zero posts despite healthy Node mocks); default fetch now uses a wrapper and a
regression covers its receiver. Batch observers wait for delivery rather than
assuming a synchronous post. Native width/height and normalized-coordinate tags
are retained for replay without distorting camera aspect ratios. Service errors
display an unavailable result, not fabricated missing-event counts.

### Deployed proof

Runtime commit `693ba15` was rebuilt/deployed to **jax-web only**, shipping the M6
review fixes too. Other container IDs remained unchanged. Container health,
public Jax health and strongr all returned HTTP 200. The temporary loopback test
webhook was restored to its original setting; the test receiver was stopped.
`/opt/jax/.env` remains mode 600, with the generated ADMIN_KEY retained.

Final `npm run smoke:session` against that deployment, including independent
LangSmith readback and native-dimension checks:

```text
Session trace audit: PASS (136/136 recorded), thread_id=01a209b8-7c8a-755b-bf21-8c995ab61d03, session.end=b5a173dd-01e2-46c9-967e-61ad6c07094a
```

This is a 40-rep **fixture-event** replay, not a new live-agent/audio measurement.
Trace: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/r/b5a173dd-01e2-46c9-967e-61ad6c07094a?trace_id=b5a173dd-01e2-46c9-967e-61ad6c07094a

Two unattended full 40-rep scripted UI sessions used the **real deployed APIs
and LangSmith**, with no telemetry/audit mock in the PASS session:

```text
PASS SUMMARY: 95/95; 0 missing; 0 deliberately dropped posts. Thread 01a209a7-5410-71c5-8aa0-168f6b4caf2a
FAIL SUMMARY: 68/95; 27 missing; 5 deliberately dropped posts. Thread 01a209a9-b362-77a8-9d93-0eb301154309
```

The failure injector intercepted exactly five POSTs without forwarding them and
acknowledged them locally. This prevents unload retries healing the deliberate
loss and proves the audit reads LangSmith rather than trusting client ACKs.
The server listed all 27 missing IDs/types after polling; the summary was red.
Independent feedback readback verified `trace_complete=1` and `=0`, respectively.
The local-only receiver captured the identical 27-event failure payload, streamed
to persistent evidence before it was stopped.

PASS trace: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/r/f9f212f8-3d2c-424c-9d17-4a44530cde0a?trace_id=f9f212f8-3d2c-424c-9d17-4a44530cde0a

FAIL trace: https://smith.langchain.com/o/af88c6e7-5dd5-44fb-b02b-c6cfdf6fd53c/projects/p/01a1fb80-0ac8-7811-8ba3-fb4377f4e01d/r/4f67d452-11e2-4fd4-903e-bfe0ac419459?trace_id=4f67d452-11e2-4fd4-903e-bfe0ac419459

### Checks and evidence

Lint and web/agent typecheck exited 0. Unit/build/browser results:

```text
Test Files  22 passed (22)
Tests       198 passed (198)
✓ Compiled successfully in 871ms
✓ Generating static pages using 7 workers (13/13) in 211ms
4 skipped
26 passed (5.7m)
1 passed (31.0s)
Shared copies match.
```

The additional focused native-camera case verifies 10 Hz / 13-point telemetry,
native dimensions, normalized coordinates and pending-rep retention. The four
skips are existing explicit live-provider opt-ins. The browser suite covers PASS,
FAIL, unavailable-service rendering, pagehide and visibility-hide beacons.

Initial daily sweep readback exited 1: **26 threads, 24 flagged** (the planted
M7 failure plus 23 older threads flagged for missing ends/manifests). This snapshot
predates the PR #8 voice-lab exclusion, so it is not a verified workout-only
inventory. The healthy M7 sessions passed. Historical missing manifests are reported as unverifiable,
not asserted to be proven missing events. No bad traces were excluded/deleted to
make the sweep green. These test/migration records will flag until they age out
of the 24-hour window. The missing-secret workflow guard was exercised and printed
`SKIP deployed tracing checks: missing secrets: LANGSMITH_API_KEY INVITE_CODE JAX_BASE_URL`.

All evidence is under `/home/ubuntu/jax-evidence/m7/`:
- Visually inspected 390×844: `pass-summary.png`, `fail-summary.png`,
  `admin-session.png`, `permissions-privacy.png`, `trace-unavailable.png`.
- `pass-audit.json`, `fail-audit.json`, corresponding `*-ledger.json`,
  `smoke-audit-final.json`, `feedback-readback.json`, `webhook-received.jsonl`,
  `sweep-audit.json`, `secrets-status.json`, `deploy-result.txt`, `cleanup-result.txt`.
- **Private, mode 600; do not publish:** `admin-key`, `runtime.json`.

Node 22.23.3 and configured runtime credentials were verified. LangSmith 0.13.1
emits non-blocking `listRuns`/`getRunUrl` deprecation warnings (removal after
January 31, 2027); migrate those SDK calls before that deadline. This is not an
environment/credential failure. GitHub secret-write permission and explicit
org-secret binding remain unavailable as described above. iPhone-specific QA
remains unverified; M1/M9 latency and real-device performance gates are unchanged.

## M7 — PR #8 review fixes

Starting HEAD confirmed as `5e673ab`. Three accepted findings fixed separately:
- `f163485`: restart remains disabled/guarded until final narration, session.end
  telemetry and audit have settled. PASS, FAIL and unavailable audit results all
  permit restart; static previews retain their existing behavior. A live-mode
  browser regression holds the final coach response and then the audit response,
  verifies one end event and only then allows navigation to the next session.
- `c50d355`: requesting the terminal coach summary settles queued/coalesced rep
  jobs as logged fallback results before the summary can resolve. In-flight turns
  retain their existing completion/deadline behavior. Late HTTP completions do
  not duplicate the settled traces. This avoids waiting for a stalled 75-second
  request and ensures pending rep results enter the ledger before finalization.
- `36f1149`: the daily sweep excludes existing `source: "voice-lab"` runs before
  grouping threads. This uses the tag already emitted by `/api/voice-events`,
  rather than requiring session.start and hiding genuine lost-start failures.

The rejected legacy-ledger finding was **not implemented**. Tests explicitly
retain missing-end and missing-manifest failures, including lost session.start.
No production sweep was re-run in this CI-only step.

All three had failing-first regressions: restart expected disabled/received
enabled; queued-rep logs expected `[rep, rep, session_end]`/received
`[rep, session_end]`; voice-only sweep expected 0 flagged/received 1 flagged.

After the edits, lint and web/agent typecheck exited 0:

```text
Test Files  23 passed (23)
Tests       206 passed (206)
✓ Compiled successfully in 588ms
✓ Generating static pages using 7 workers (13/13) in 203ms
4 skipped
27 passed (5.7m)
```

The four skips remain explicit live-provider opt-ins. The restart state was
visually checked at 390×844; evidence:
`/home/ubuntu/jax-evidence/m7-review/restart-finalizing.png`.
No redeployment, new live-provider measurement or iPhone verification in this
CI-only review loop. No counting thresholds or legacy audit policy were changed.
