function normalize(text:string){
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function asksExpectedQuestion(text:string,expected:string){
  const actual=normalize(text),want=normalize(expected);
  return Boolean(want && (actual===want || actual.endsWith(" "+want)));
}
