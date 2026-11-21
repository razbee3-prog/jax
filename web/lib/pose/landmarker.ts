import type { Frame } from "./types";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
export type Model = "full" | "lite";
export class Landmarker {
  private lastTimestamp = -Infinity;
  private constructor(private detector: PoseLandmarker, public model: Model, public delegate: "GPU" | "CPU") {}
  static async create(model: Model = "full", delegate: "GPU" | "CPU" = "GPU") {
    const files = await FilesetResolver.forVisionTasks("/wasm");
    const options = { baseOptions: { modelAssetPath: "/models/pose_landmarker_" + model + ".task", delegate }, runningMode: "VIDEO" as const, numPoses: 1 };
    try { return new Landmarker(await PoseLandmarker.createFromOptions(files, options), model, delegate); }
    catch (error) { if (delegate === "CPU") throw error; options.baseOptions.delegate = "CPU"; return new Landmarker(await PoseLandmarker.createFromOptions(files, options), model, "CPU"); }
  }
  detect(video: HTMLVideoElement, timestamp = performance.now()): Frame {
    if (timestamp <= this.lastTimestamp) throw new Error("Pose timestamps must strictly increase");
    this.lastTimestamp = timestamp;
    const mediaTime = video.currentTime * 1000;
    const result = this.detector.detectForVideo(video, timestamp);
    return { t: mediaTime, landmarks: (result.landmarks[0] ?? []).map(p => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 })) };
  }
  close() { this.detector.close(); }
}
