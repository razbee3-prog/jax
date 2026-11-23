const topics=[
  /dumbbells?|weights/iu,
  /injur|pain|hurt|limitation|careful/iu,
  /time|duration|minutes/iu,
  /focus|work on|workout|train|session|(?:upper|lower|full)[ -]body/iu,
];
function normalize(text:string){
  return text.toLowerCase().replace(/\bfive\b/gu,"5").replace(/\bten\b/gu,"10").replace(/\btwenty\b/gu,"20").replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function asksExpectedQuestion(text:string,expected:string){
  const want=normalize(expected);if(!want)return false;
  if(normalize(text).includes(want))return true;
  const topic=topics.find(pattern=>pattern.test(expected));if(!topic)return false;
  const choices=[...expected.matchAll(/\b\d+\b|\b(?:upper|lower|full)[ -]body\b/giu)].map(match=>normalize(match[0]));
  return (text.match(/[^.!?]+\?/gu)??[]).some(question=>topic.test(question) && (topic!==topics[0] || (/have|got|access|available|nearby|with you|ready|handy/iu.test(question) && !/how (?:heavy|much)|what weight/iu.test(question))) && choices.every(choice=>` ${normalize(question)} `.includes(` ${choice} `)));
}
