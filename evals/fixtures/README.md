# M2 pose fixtures

Demo JSON contains raw normalized image landmarks from MediaPipe Pose Landmarker full (tasks-vision 1.2.3, VIDEO, 30 samples/s, GPU/SwiftShader on this VM). Replay applies the production visibility gate, 1 Euro filter, image-aspect-ratio scaling, setup side selection, and counters. No world coordinates or images are included. `expected` is a human frame-review label, not the pipeline's prediction.

Run `npm run dev` in one terminal, then `npm run extract:landmarks -- web/public/videos evals/fixtures` in another. This uses local Chrome and `/lab`; video frames never go to a server. Extraction seeks through every 1/30 second, so it is not limited by real-time VM rendering speed. Uploaded videos must use the canonical exercise filenames. Export JSON in `/lab` uses the current prediction as a provisional expected count: review and relabel before treating it as ground truth.

Run `npm run build` before `npm run test:e2e`: Playwright uses the production standalone server, avoiding development overlays/instrumentation during real-time inference. The fake-webcam test converts RDL to 640px-wide y4m and prepends three seconds of the initial standing frame to allow camera/model setup. It asserts two reps within 20 seconds, before any repeated exercise cycle could contribute a rep. No counting result is mocked. `npm run record:lab` records 390x844 videos; `LAB_URL` overrides the server URL, `EVIDENCE_DIR` the output folder, and `EXERCISE` can select a comma-separated subset. Recording selects CPU in the lab because this VM's software GPU is slower than its CPU; app default remains GPU with CPU fallback. `POSE_DELEGATE=CPU npm run extract:landmarks` also supports CPU extraction.

## Independent truth labels

Reviewed ffmpeg frame grabs at one-second intervals, row-major, starting at t=0. Montages are saved under `/home/ubuntu/jax-evidence/m2/{exercise}-frames.jpg`. The full movement cycles are visible between the following boundaries:

| Clip | Truth | Visual basis |
|---|---:|---|
| rdl | 2 | Stand → hinge → stand at approximately 0–5 s and 6–12 s |
| push-press | 2 | Rack → overhead lockout → rack at approximately 0–4 s and 4–8 s |
| curl | 3 | Arms down → curl → arms down at approximately 0–4, 4–8, and 8–12 s |
| push-up | 3 | Top plank → bottom → top at approximately 0–3, 3–6, and 6–9 s |

These generated demo videos change apparent camera angle during the clip. They are not a validated side-on/45° comparison and cannot support camera-placement or real-person accuracy claims.

`variants/push-press-cpu.json` preserves a full/CPU live pass with the opposite setup-side selection from GPU extraction, labelled with the same two-rep visual truth. Its rack height (~0.33 torso lengths) motivated the 0.35 rack threshold. GPU right-arm extension peaks at ~0.87, motivating the 0.8 overhead threshold. Other original exercise thresholds and 1 Euro settings are unchanged. RDL uses the near wrist, not the occluded far wrist, for the wrist-below-hip gate.

## Negatives

`npm run fixtures:negative` regenerates three deterministic landmark sequences (6 seconds at 30 Hz, 181 frames), each tested against all four counters:

- standing-still: fixed standing joints;
- walking-in: an off-screen translated upright body, initially low visibility, enters and stands;
- setup-picking-up: starts bent over, rises to standing without a preceding stable ready pose.

These are synthetic negatives, not recordings of actual walking or lifting objects. Real clips are still required before claiming real-world false-positive performance.
