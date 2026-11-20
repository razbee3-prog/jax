import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { angle, derive, sideVisibility } from "./angles";
import { OneEuroFilter } from "./filter";
import { PosePipeline } from "./pipeline";
import { RepCounter } from "./repCounter";
import type { Angles, Exercise, Fixture } from "./types";

const exercises: Exercise[] = ["rdl", "push-press", "curl", "push-up"];
const fixtureDir = resolve("evals/fixtures");
const replay = (fixture: Fixture, exercise = fixture.exercise) => {
  const pipeline = new PosePipeline(exercise, fixture.width, fixture.height);
  for (const frame of fixture.frames) pipeline.process(frame);
  return pipeline;
};
describe("demo landmark fixtures", () => {
  for (const exercise of exercises) it(exercise + " matches independently frame-labelled truth", () => {
    const fixture: Fixture = JSON.parse(readFileSync(resolve(fixtureDir, exercise + ".json"), "utf8"));
    expect(fixture.frames.length).toBeGreaterThan(200);
    expect(replay(fixture).counter.count).toBe(fixture.expected);
  });
  for (const name of readdirSync(resolve(fixtureDir, "negative"))) for (const exercise of exercises) it(name + " counts zero for " + exercise, () => {
    const fixture: Fixture = JSON.parse(readFileSync(resolve(fixtureDir, "negative", name), "utf8"));
    expect(replay(fixture, exercise).counter.count).toBe(0);
  });
  it("push press also counts on CPU with the other near-side selection", () => {
    const fixture: Fixture = JSON.parse(readFileSync(resolve(fixtureDir,"variants/push-press-cpu.json"),"utf8"));
    expect(replay(fixture).counter.count).toBe(fixture.expected);
  });
  it("empty frames count zero", () => {
    const pipeline = new PosePipeline("rdl", 1280, 720);
    for (let t=0; t<5000; t+=100) pipeline.process({ t, landmarks: [] });
    expect(pipeline.counter.count).toBe(0);
  });
  it("low visibility and duplicate timestamps cannot count", () => {
    const fixture: Fixture = JSON.parse(readFileSync(resolve(fixtureDir, "curl.json"), "utf8"));
    const hidden = { ...fixture, frames: fixture.frames.map(frame => ({ ...frame, landmarks: frame.landmarks.map(p => ({ ...p, visibility: 0.1 })) })) };
    expect(replay(hidden).counter.count).toBe(0);
    expect(replay({ ...fixture, frames: fixture.frames.map(frame => ({ ...frame, t: 0 })) }).counter.count).toBe(0);
  });
});
const normal: Angles = { hip: 175, knee: 175, elbow: 175, shoulderFlex: 0, bodyLine: 175, torsoLean: 0, torsoLength: 200, wristHeight: -1, wristY: 400, shoulderY: 100, bodyHorizontal: 80, wristsBelowHips: true, viewOk: true, valid: true };
function rdlCycle(counter: RepCounter, options: { far?: boolean; visible?: boolean; gate?: boolean; gap?: boolean; speed?: number } = {}) {
  const step = options.speed ?? 100;
  let t=0;
  for (;t<=600;t+=100) counter.update(normal,t);
  for (let i=0;i<15;i++) {
    t+=step;
    const hip = i<7 ? 150-i*6 : 114+(i-7)*10;
    counter.update({ ...normal, hip: options.far === false ? Math.max(130,hip) : hip, torsoLean: 45, valid: options.visible === false ? i%2===0 : true, wristsBelowHips: options.gate !== false }, options.gap && i===7 ? t+1600 : t);
  }
  return counter;
}
describe("rep hysteresis and timing", () => {
  it("requires excursion and return", () => { expect(rdlCycle(new RepCounter("rdl")).count).toBe(1); expect(rdlCycle(new RepCounter("rdl"),{far:false}).count).toBe(0); });
  it("rejects poor tracking and exercise gate failure", () => { expect(rdlCycle(new RepCounter("rdl"),{visible:false}).count).toBe(0); expect(rdlCycle(new RepCounter("rdl"),{gate:false}).count).toBe(0); });
  it("rejects too fast and too slow", () => { expect(rdlCycle(new RepCounter("rdl"),{speed:20}).count).toBe(0); expect(rdlCycle(new RepCounter("rdl"),{speed:1000}).count).toBe(0); });
  it("requires start pose held 500ms", () => { const c=new RepCounter("rdl"); c.update(normal,0); c.update(normal,499); expect(c.phase).toBe("IDLE"); c.update(normal,500); expect(c.phase).toBe("READY"); });
  it("rejects a sub-250ms return even after a long bottom hold", () => {
    const c=new RepCounter("rdl"); c.update(normal,0); c.update(normal,500);
    c.update({...normal,hip:150,torsoLean:40},600); c.update({...normal,hip:100,torsoLean:50},1000);
    c.update({...normal,hip:100,torsoLean:50},2000); c.update({...normal,hip:110,torsoLean:45},2050); c.update(normal,2150);
    expect(c.count).toBe(0);
  });
  it("tracking loss over 1.5s resets readiness", () => { const c=new RepCounter("rdl"); c.update(normal,0); c.update(normal,500); c.update(null,2101); expect(c.phase).toBe("IDLE"); expect(c.count).toBe(0); });
  it("ignores non-finite angles and time", () => { const c=new RepCounter("rdl"); c.update({...normal,hip:NaN},0); c.update(normal,NaN); expect(c.phase).toBe("IDLE"); });
  it("does not count if the video starts at the bottom", () => { const c=new RepCounter("rdl"); for(let t=0;t<1000;t+=100)c.update({...normal,hip:100,torsoLean:50},t); c.update(normal,1100); expect(c.count).toBe(0); });
});
describe("signal processing", () => {
  it("angle uses 2D scaled image coordinates", () => {
    const point=(x:number,y:number)=>({x,y,visibility:1});
    expect(angle(point(1,0),point(0,0),point(0,1))).toBeCloseTo(90);
    expect(angle(point(1,0),point(0,0),point(-1,0))).toBeCloseTo(180);
    expect(angle(point(0,0),point(0,0),point(0,0))).toBeNaN();
    expect(derive([],1280,720,"left")).toBeNull();
    expect(sideVisibility([],"left")).toBe(0);
  });
  it("1 Euro filter stays constant, damps jitter and resets", () => {
    const filter=new OneEuroFilter();
    expect(filter.filter(1,0)).toBe(1); expect(filter.filter(1,100)).toBe(1);
    const value=filter.filter(2,200); expect(value).toBeGreaterThan(1); expect(value).toBeLessThan(2);
    expect(filter.filter(0,200)).toBe(value); filter.reset(); expect(filter.filter(7,500)).toBe(7);
  });
});
