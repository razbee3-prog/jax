function normalize(text:string){
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function asksExpectedQuestion(text:string,expected:string){
  const actual=normalize(text),want=normalize(expected);
  if(!want || !(actual===want || actual.endsWith(" "+want)))return false;
  const positions=[...text.matchAll(/[\p{L}\p{N}]+/gu)].flatMap(match=>normalize(match[0]).split(" ").map(()=>match.index));
  const start=positions.at(-want.split(" ").length);
  return start!==undefined && !text.slice(0,start).includes("?");
}
