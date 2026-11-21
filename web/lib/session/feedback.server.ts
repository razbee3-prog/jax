import { createHmac,timingSafeEqual } from "node:crypto";
export function feedbackReceipt(thread:string,run:string){return createHmac("sha256",process.env.SESSION_SECRET!).update(`${thread}.${run}`).digest("hex");}
export function validReceipt(thread:string,run:string,receipt:string){return /^[a-f0-9]{64}$/.test(receipt) && timingSafeEqual(Buffer.from(receipt),Buffer.from(feedbackReceipt(thread,run)));}
