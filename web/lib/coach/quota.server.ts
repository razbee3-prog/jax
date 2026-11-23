import {isIP} from "node:net";
const defaults={thread:120,user:240,ip:1200};
export function coachLimits(){
  const limit=(name:string,fallback:number)=>{const n=Number(process.env[name]);return Number.isSafeInteger(n) && n>0 ? n:fallback;};
  return {thread:limit("COACH_MAX_TURNS_PER_THREAD",defaults.thread),user:limit("COACH_MAX_TURNS_PER_USER_DAY",defaults.user),ip:limit("COACH_MAX_TURNS_PER_IP_DAY",defaults.ip)};
}
export function coachIp(request:Request){
  const ip=request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return ip && isIP(ip) ? ip:"unknown";
}
export class CoachQuota {
  private threads=new Map<string,number>();
  private users=new Map<string,number>();
  private ips=new Map<string,number>();
  private day=-1;
  consume(user:string,thread:string,ip:string,limits=coachLimits(),now=Date.now()){
    const day=Math.floor(now/86400000);if(day!==this.day){this.day=day;this.threads.clear();this.users.clear();this.ips.clear();}
    const entries=[[this.threads,`${user}:${thread}`,limits.thread,"thread"],[this.users,user,limits.user,"user"],[this.ips,ip,limits.ip,"ip"]] as const;
    for(const [map,key,limit,scope] of entries)if((map.get(key)??0)>=limit || (!map.has(key) && map.size>=20000))return scope;
    for(const [map,key] of entries)map.set(key,(map.get(key)??0)+1);
    return null;
  }
}
export const coachQuota=new CoachQuota();
