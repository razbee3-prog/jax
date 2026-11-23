import type {Page,Route} from "@playwright/test";
export async function mockSessionEvents(page:Page,handler:(route:Route)=>unknown){
  await page.route("**/api/session/audit",route=>{const body=route.request().postDataJSON();return route.fulfill({json:{pass:true,thread_id:body.thread_id,expected:body.ledger.length,recorded:body.ledger.length,missing:[]}});});
  await page.route("**/api/telemetry",async route=>{
    const events=route.request().postDataJSON().events,acknowledged:string[]=[];let receipt={};
    for(const event of events){
      const proxy={request:()=>({postDataJSON:()=>event}),fulfill:async({json}:{json:Record<string,unknown>})=>{if(json.event_id)acknowledged.push(json.event_id as string);if(json.run_id)receipt={run_id:json.run_id,receipt:json.receipt};},abort:()=>route.abort()} as unknown as Route;
      await handler(proxy);
    }
    return route.fulfill({json:{acknowledged,...receipt}});
  });
}
export function observeSessionEvents(page:Page,events:unknown[]){page.on("request",request=>{if(request.url().endsWith("/api/telemetry"))events.push(...request.postDataJSON().events);});}
