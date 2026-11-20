"use client";
import { useEffect, useRef, useState } from "react";
import { EXERCISES } from "../../lib/pose/exercises/config";
import { Landmarker, type Model } from "../../lib/pose/landmarker";
import { PosePipeline } from "../../lib/pose/pipeline";
import { holdWakeLock } from "../../lib/pose/wakeLock";
import type { Exercise, Fixture, Frame } from "../../lib/pose/types";
import styles from "./page.module.css";

const EDGES = [[11,13],[13,15],[12,14],[14,16],[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32]];
export default function Lab() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const detector = useRef<Landmarker | null>(null);
  const pipeline = useRef<PosePipeline | null>(null);
  const frames = useRef<Frame[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const source = useRef("");
  const cancel = useRef(false);
  const extracting = useRef(false);
  const processing = useRef(false);
  const setStarted = useRef(false);
  const [exercise, setExercise] = useState<Exercise>("rdl");
  const [delegate, setDelegate] = useState<"GPU" | "CPU">("GPU");
  const [model, setModel] = useState<Model | "auto">("auto");
  const [status, setStatus] = useState("Choose a demo, upload a video, or start the camera.");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState("IDLE");
  const [metrics, setMetrics] = useState("");
  const [fixture, setFixture] = useState("");
  const [camera, setCamera] = useState(false);
  const [rate, setRate] = useState(0);
  const [backend, setBackend] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const release = holdWakeLock();
    return () => { cancel.current = true; detector.current?.close(); stream.current?.getTracks().forEach(track => track.stop()); void release.then(stop => stop()); if (source.current.startsWith("blob:")) URL.revokeObjectURL(source.current); };
  }, []);

  async function ready() {
    if (!detector.current) { setStatus("Loading on-device pose model…"); detector.current = await Landmarker.create(model === "auto" ? "full" : model, delegate); }
    setBackend(detector.current.model + " / " + detector.current.delegate);
  }
  function reset() { pipeline.current = null; frames.current = []; setStarted.current = false; setFixture(""); setCount(0); setPhase("IDLE"); setMetrics(""); }
  function stopSource() {
    video.current?.pause(); stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (source.current.startsWith("blob:")) URL.revokeObjectURL(source.current);
    if (video.current) video.current.srcObject = null;
    setCamera(false);
  }
  function load(url: string) {
    stopSource(); reset(); source.current = url;
    if (video.current) { video.current.src = url; video.current.load(); }
    setStatus("Video ready. Play to count, or extract all frames.");
  }
  function processFrame(frame: Frame) {
    const v = video.current!;
    if (frames.current.length && frame.t < frames.current[frames.current.length-1].t) reset();
    if (frames.current.length && frame.t === frames.current[frames.current.length-1].t) return;
    pipeline.current ??= new PosePipeline(exercise, v.videoWidth, v.videoHeight);
    const result = pipeline.current.process(frame);
    if (!result) return;
    if (result.phase !== "IDLE" && result.phase !== "READY") setStarted.current = true;
    frames.current.push(frame);
    setCount(result.count); setPhase(result.phase);
    const a = result.angles;
    setMetrics(a ? JSON.stringify({ side: result.side, hip: +a.hip.toFixed(1), knee: +a.knee.toFixed(1), elbow: +a.elbow.toFixed(1), shoulder_flex: +a.shoulderFlex.toFixed(1), body_line: +a.bodyLine.toFixed(1), torso_lean: +a.torsoLean.toFixed(1), torso_len: +a.torsoLength.toFixed(1), wrist_height: +a.wristHeight.toFixed(2), view_ok: a.viewOk, tracking: a.valid }, null, 2) : "No pose detected");
    const c = canvas.current!; c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!; ctx.clearRect(0,0,c.width,c.height); ctx.strokeStyle = "#9af2cf"; ctx.lineWidth = 4;
    for (const [from, to] of EDGES) {
      const p = result.points[from], q = result.points[to];
      if (!p || !q || p.visibility < 0.5 || q.visibility < 0.5) continue;
      ctx.beginPath(); ctx.moveTo(p.x*c.width,p.y*c.height); ctx.lineTo(q.x*c.width,q.y*c.height); ctx.stroke();
    }
  }
  function serialize() {
    const v = video.current!;
    const data: Fixture = { version: 1, exercise, width: pipeline.current?.width ?? v.videoWidth, height: pipeline.current?.height ?? v.videoHeight, expected: pipeline.current?.counter.count ?? 0, source: source.current, frames: frames.current };
    const json = JSON.stringify(data); setFixture(json); return json;
  }
  async function cameraStart() {
    setBusy(true); setError(""); stopSource(); reset();
    try {
      await ready();
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const v = video.current!; v.removeAttribute("src"); v.srcObject = stream.current; source.current = "camera";
      setCamera(true); await v.play();
    } catch (err) { setError(err instanceof Error ? err.message : "Camera unavailable"); }
    finally { setBusy(false); }
  }
  async function play() {
    if (extracting.current || processing.current) return;
    processing.current = true;
    setError(""); cancel.current = false;
    let lastMedia = -1, totalMs = 0, samples = 0, switched = false;
    try {
      const v = video.current!;
      const loading = !detector.current;
      if (loading) v.pause();
      await ready();
      if (cancel.current) { detector.current?.close(); detector.current = null; return; }
      setStatus("Counting locally…");
      if (v.currentTime < 0.1) reset();
      if (loading) { detector.current!.detect(v); await v.play(); }
      while (!v.paused && !v.ended && !cancel.current) {
        if (v.readyState >= 2 && v.currentTime !== lastMedia) {
          lastMedia = v.currentTime;
          const before = performance.now(); const frame = detector.current!.detect(v); const ms = performance.now() - before;
          if (camera) frame.t = before;
          processFrame(frame); totalMs += ms; samples++; setRate(Math.round(1000 / (totalMs / samples)));
          if (model === "auto" && !setStarted.current && !switched && samples === 30 && totalMs / samples > 50 && detector.current!.model === "full") {
            if (!stream.current) v.pause();
            detector.current!.close(); detector.current = await Landmarker.create("lite", delegate); switched = true;
            setBackend(detector.current.model + " / " + detector.current.delegate);
            detector.current.detect(v);
            if (!stream.current) await v.play();
          }
        }
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      if (v.ended) { serialize(); setStatus("Complete"); detector.current?.close(); detector.current = null; }
    } catch (err) { setError(err instanceof Error ? err.message : "Pose processing failed"); }
    finally { processing.current = false; }
  }
  async function extract() {
    const v = video.current!;
    if (!Number.isFinite(v.duration) || !v.duration) { setError("Load a video first."); return; }
    v.pause(); reset(); setBusy(true); setError(""); extracting.current = true; cancel.current = false;
    try {
      await ready(); setStatus("Extracting…");
      const length = v.duration;
      for (let t = 0; t < length && !cancel.current; t += 1/30) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Video seek timed out")), 10000);
          v.addEventListener("seeked", () => { clearTimeout(timer); resolve(); }, { once: true }); v.currentTime = Math.max(0.00001,t);
        });
        const frame = detector.current!.detect(v); frame.t = Math.round(t*1000); processFrame(frame);
      }
      serialize(); setStatus("Complete");
    } catch (err) { setError(err instanceof Error ? err.message : "Extraction failed"); }
    finally { extracting.current = false; setBusy(false); detector.current?.close(); detector.current = null; }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([serialize()], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = exercise + ".json"; link.click(); URL.revokeObjectURL(url);
  }
  return <main className={styles.lab}><header><h1>Pose lab</h1><p>On-device only · no frames uploaded</p></header>
    <label>Exercise<select aria-label="Exercise" disabled={busy || camera} value={exercise} onChange={event => { video.current?.pause(); setExercise(event.target.value as Exercise); reset(); }}>{Object.entries(EXERCISES).map(([id, config]) => <option key={id} value={id}>{config.label}</option>)}</select></label>
    <label>Delegate<select aria-label="Delegate" disabled={busy || camera} value={delegate} onChange={event => { video.current?.pause(); detector.current?.close(); detector.current = null; setDelegate(event.target.value as "GPU" | "CPU"); reset(); }}><option value="GPU">Auto (GPU → CPU)</option><option value="CPU">CPU</option></select></label>
    <label>Model<select aria-label="Model" disabled={busy || camera} value={model} onChange={event => { video.current?.pause(); detector.current?.close(); detector.current = null; setModel(event.target.value as Model | "auto"); reset(); }}><option value="auto">Auto</option><option value="full">full</option><option value="lite">lite</option></select></label>
    <div className={styles.buttons}><button disabled={busy || camera} onClick={() => load("/videos/" + exercise + ".mp4")}>Load demo</button><button disabled={busy || camera} onClick={cameraStart}>Start camera</button><button disabled={busy} onClick={() => { cancel.current = true; stopSource(); detector.current?.close(); detector.current = null; setStatus("Stopped"); }}>Stop</button></div>
    <label className={styles.upload}>Upload video<input aria-label="Upload video" type="file" accept="video/*" disabled={busy || camera} onChange={event => { const file = event.target.files?.[0]; if (file) load(URL.createObjectURL(file)); }} /></label>
    <div className={styles.picture} style={{ transform: camera ? "scaleX(-1)" : undefined }}><video ref={video} muted playsInline autoPlay={camera} controls={!busy && !camera} onPlay={play} /><canvas ref={canvas} /></div>
    <div className={styles.counter}><output data-testid="rep-count">{count}</output><span data-testid="phase">{phase}</span></div>
    <p role="status">{status}</p><p>{backend} · {rate} inference/s · Fault flags: not implemented until M3</p>
    <div className={styles.buttons}><button disabled={busy || camera} onClick={extract}>Extract fixture</button><button disabled={busy} onClick={download}>Export JSON</button></div>
    {error && <p role="alert">{error}</p>}<pre data-testid="metrics">{metrics}</pre><textarea aria-label="Fixture JSON" readOnly value={fixture} className={styles.fixture} />
  </main>;
}
