const topics=[
  /dumbbells?|weights/iu,
  /injur|pain|hurt|limitation|careful/iu,
  /time|duration|minutes?|mins?/iu,
  /focus|work on|workout|train|session|(?:upper|lower|full)[ -]body/iu,
];
function normalize(text:string){
  return text.toLowerCase().replace(/\bfive\b/gu,"5").replace(/\bten\b/gu,"10").replace(/\btwenty\b/gu,"20").replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
function sameIntent(question:string,topic:RegExp){
  if(topic===topics[0])return /\b(?:have|got|access|available|nearby|ready|handy)\b|with you/iu.test(question) && !/\b(?:what|which|how|kind|type|brand|size|heavy|light|color|colour)\b/iu.test(question);
  if(topic===topics[2])return !/\b(?:reps?|sets?|pounds?|kilograms?)\b/iu.test(question) && (/how (?:much time|long)|what (?:duration|length)|which.{0,25}(?:duration|length|time)|\b(?:would|do|could|can|will|does|is|are)\b.{0,80}\b(?:prefer|choose|pick|want|like|work|fit|best|enough|have)\b|have you got/iu.test(question) || /^(?:(?:5|10|20|or|and|a|minutes?|mins?)\s*)+$/u.test(normalize(question)));
  return true;
}
export function asksExpectedQuestion(text:string,expected:string){
  const want=normalize(expected);if(!want)return false;
  if(normalize(text).includes(want))return true;
  const topic=topics.find(pattern=>pattern.test(expected));if(!topic)return false;
  const choices=[...expected.matchAll(/\b\d+\b|\b(?:upper|lower|full)[ -]body\b/giu)].map(match=>normalize(match[0]));
  return (text.match(/[^.!?]+\?/gu)??[]).some(question=>topic.test(question) && sameIntent(question,topic) && choices.every(choice=>` ${normalize(question)} `.includes(` ${choice} `)));
}
