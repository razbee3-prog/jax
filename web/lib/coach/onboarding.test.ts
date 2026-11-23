import {describe,it,expect} from "vitest";
import {onboardingAnswer as answer} from "./onboarding";
describe("explicit onboarding answers",()=>{
  it("normalizes both remembered-injury chip answers without inventing an injury",()=>{
    expect(answer(2,"Yes, still",["Shoulder discomfort"])).toBe("Shoulder discomfort");expect(answer(2,"No, it's better",["Shoulder discomfort"])).toBe("No injuries");expect(answer(2,"Yes, still")).toBeNull();expect(answer(2,"No, it's better")).toBeNull();
  });
  it("confirms and clears arbitrary remembered injuries, not just chip presets",()=>{
    for(const injuries of [["left knee"],["left knee","right elbow"]]){expect(answer(2,"Yes, still",injuries)).toBe(injuries.join(" and "));expect(answer(2,"No, it's better",injuries)).toBe("No injuries");}
  });
  it("does not turn rejected or fractional durations into supported choices",()=>{for(const text of ["not ten minutes","no 5 minutes","5.5 minutes"])expect(answer(1,text)).toBeNull();});
  it("accepts explicit slots without inventing defaults",()=>{
    expect(answer(0,"upper body")).toBe("upper body");expect(answer(0,"Full-body")).toBe("full body");expect(answer(1,"Ten minutes, please.")).toBe("10");expect(answer(1,"5")).toBe("5");expect(answer(2,"Shoulder discomfort")).toBe("Shoulder discomfort");expect(answer(2,"No injuries")).toBe("No injuries");expect(answer(3,"I have a pair of dumbbells")).toBe("Yes");expect(answer(3,"I don't have dumbbells")).toBe("No");
  });
  it("keeps empty, unrelated, contradictory and uncertain answers unresolved",()=>{
    for(let q=0;q<4;q++)for(const text of [""," ","maybe","not sure"])expect(answer(q,text)).toBeNull();
    for(const [q,text] of [[0,"hello"],[0,"upper body or lower body"],[0,"not upper body"],[1,"Yes, I have dumbbells."],[1,"5 or 20 minutes"],[1,"ten dumbbells"],[2,"yes"],[2,"I have dumbbells"],[3,"hello"],[3,"yes and no"]] as const)expect(answer(q,text),text).toBeNull();expect(answer(0,"x".repeat(1001))).toBeNull();
  });
  it("handles a complete WAV answer and returning-injury confirmation",()=>{
    const wav="Full body. Ten minutes. No injuries. Yes, I have dumbbells.";
    expect([0,1,2,3].map(q=>answer(q,wav))).toEqual(["full body","10","No injuries","Yes"]);
    expect(answer(2,"yes",["Shoulder discomfort"])).toBe("Shoulder discomfort");expect(answer(2,"no",["Shoulder discomfort"])).toBe("No injuries");expect(answer(2,"No injuries except shoulder pain")).toBe("No injuries except shoulder pain");
  });
});
