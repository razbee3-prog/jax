import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), files: vi.fn(), detect: vi.fn(), close: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({ FilesetResolver: { forVisionTasks: mocks.files }, PoseLandmarker: { createFromOptions: mocks.create } }));
import { Landmarker } from "./landmarker";
beforeEach(() => { vi.resetAllMocks(); mocks.files.mockResolvedValue({}); mocks.create.mockResolvedValue({ detectForVideo: mocks.detect, close: mocks.close }); mocks.detect.mockReturnValue({ landmarks: [] }); });
describe("landmarker", () => {
  it("self-hosts assets and requests VIDEO/GPU", async () => {
    const wrapper=await Landmarker.create(); expect(wrapper.delegate).toBe("GPU");
    expect(mocks.files).toHaveBeenCalledWith("/wasm");
    expect(mocks.create.mock.calls[0][1]).toMatchObject({ runningMode:"VIDEO",numPoses:1,baseOptions:{delegate:"GPU",modelAssetPath:"/models/pose_landmarker_full.task"} });
    wrapper.close(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it("falls back to CPU when GPU creation fails", async () => {
    mocks.create.mockRejectedValueOnce(new Error("GPU unavailable"));
    const wrapper=await Landmarker.create("lite"); expect(wrapper.delegate).toBe("CPU"); expect(mocks.create).toHaveBeenCalledTimes(2);
  });
  it("propagates failure when both delegates fail", async () => {
    mocks.create.mockRejectedValue(new Error("model failed")); await expect(Landmarker.create()).rejects.toThrow("model failed");
  });
  it("allows explicit CPU diagnostics without a GPU attempt", async () => {
    const wrapper=await Landmarker.create("full","CPU"); expect(wrapper.delegate).toBe("CPU"); expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("rejects duplicate and backwards timestamps; returns empty detections", async () => {
    const wrapper=await Landmarker.create(); const video={currentTime:1} as HTMLVideoElement;
    expect(wrapper.detect(video,100)).toEqual({t:1000,landmarks:[]});
    expect(()=>wrapper.detect(video,100)).toThrow("strictly increase"); expect(()=>wrapper.detect(video,90)).toThrow("strictly increase");
  });
});
