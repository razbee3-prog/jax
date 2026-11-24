import {afterEach,describe,expect,it,vi} from "vitest";
import {isLandscape,subscribeOrientation} from "./orientation";
afterEach(()=>vi.unstubAllGlobals());
function browser(type?:string,angle?:number,matches=false){
  const orientation=type===undefined ? undefined:Object.assign(new EventTarget(),{type});
  const query=Object.assign(new EventTarget(),{matches});
  const window=Object.assign(new EventTarget(),{screen:{orientation},orientation:angle,matchMedia:vi.fn(()=>query)});
  vi.stubGlobal("window",window);return{window,orientation,query};
}
describe("physical device orientation",()=>{
  it.each([["portrait-primary",false],["portrait-secondary",false],["landscape-primary",true],["landscape-secondary",true]])("uses screen orientation %s instead of the keyboard viewport",(type,expected)=>{
    const {window}=browser(type,expected ? 0:90,!expected);
    expect(isLandscape()).toBe(expected);expect(window.matchMedia).not.toHaveBeenCalled();
  });
  it.each([[0,false],[180,false],[90,true],[-90,true],[270,true]])("falls back to legacy angle %s",(angle,expected)=>{
    const {window}=browser(undefined,angle,!expected);expect(isLandscape()).toBe(expected);expect(window.matchMedia).not.toHaveBeenCalled();
  });
  it.each([true,false])("uses the viewport only without usable device APIs (%s)",matches=>{
    browser("",NaN,matches);expect(isLandscape()).toBe(matches);
  });
  it("handles server rendering without browser APIs",()=>{
    vi.stubGlobal("window",undefined);expect(isLandscape()).toBe(false);expect(subscribeOrientation(()=>{})()).toBeUndefined();
  });
  it.each(["screen","legacy","viewport"])("subscribes and cleans up the %s source only",source=>{
    const {window,orientation,query}=browser(source==="screen" ? "portrait-primary":undefined,source==="viewport" ? undefined:0);
    const notify=vi.fn(),stop=subscribeOrientation(notify);
    query.dispatchEvent(new Event("change"));window.dispatchEvent(new Event("orientationchange"));orientation?.dispatchEvent(new Event("change"));
    expect(notify).toHaveBeenCalledTimes(1);stop();
    query.dispatchEvent(new Event("change"));window.dispatchEvent(new Event("orientationchange"));orientation?.dispatchEvent(new Event("change"));
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
