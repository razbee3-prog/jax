export function onboardingAnswer(question:number,raw:string,injuries:readonly string[]=[]):string|null{
  const text=raw.trim();if(!text || text.length>1000 || /\b(?:maybe|unsure|not sure|don't know)\b/i.test(text))return null;
  if(question===0){
    if(/\b(?:not|no)\s+(?:upper|lower|full)/i.test(text))return null;
    const matches=[...text.matchAll(/\b(upper|lower|full)[\s-]+body\b/gi)].map(m=>m[1].toLowerCase());
    const choices=[...new Set(matches)];return choices.length===1 ? `${choices[0]} body`:null;
  }
  if(question===1){
    if(!/\b(?:5|five|10|ten|20|twenty)\s*(?:minutes?|mins?)\b/i.test(text) && !/^(?:5|five|10|ten|20|twenty)[.!]?$/i.test(text))return null;
    const values=[...text.matchAll(/\b(5|five|10|ten|20|twenty)\b/gi)].map(m=>m[1]);
    const choices=[...new Set(values.map(v=>({five:"5",ten:"10",twenty:"20"}[v.toLowerCase()]??v)))];return choices.length===1 ? choices[0]:null;
  }
  if(question===2){
    if(/^(?:yes|yes,? (?:it is|still the case))[.!]?$/i.test(text))return injuries.length ? injuries.join(" and "):null;
    if(/^(?:no|none)[.!]?$/i.test(text) || (/\bno (?:injuries|pain)\b/i.test(text) && !/\b(?:but|except)\b/i.test(text)))return "No injuries";
    if(/^(?:(?:upper|lower|full) body|\d+(?: minutes?)?|(?:yes,? )?i have dumbbells)[.!]?$/i.test(text))return null;
    return text;
  }
  if(question===3){
    const negative=/\bno\b(?!\s+(?:injuries|pain))|\b(?:don't|do not|without)\s+(?:have\s+)?(?:any\s+)?dumbbells/i.test(text);
    const positive=/\byes\b/i.test(text) || (!negative && /\bhave\s+(?:a pair of |some |a )?dumbbells\b/i.test(text));
    return positive===negative ? null:positive ? "Yes":"No";
  }
  return null;
}
