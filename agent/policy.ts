import { createMiddleware } from "langchain";

type Message = { content: unknown; type?: string; role?: string; name?: string; status?: string; getType?: () => string; _getType?: () => string };
export function latestEvent(messages: readonly Message[]): Record<string,unknown> | null {
  for (let i=messages.length-1;i>=0;i--) {
    const m=messages[i],type=m.getType?.() ?? m._getType?.() ?? m.role ?? m.type;
    if (type !== "human" && type !== "user") continue;
    try { const event=JSON.parse(typeof m.content === "string" ? m.content : "null"); return event && typeof event === "object" && !Array.isArray(event) ? event : null; }
    catch { return null; }
  }
  return null;
}
export function latestEventType(messages: readonly Message[]): string | null {
  const event=latestEvent(messages);return typeof event?.type === "string" ? event.type : null;
}
export function memoryWriteCompleted(messages: readonly Message[]) {
  for(let i=messages.length-1;i>=0;i--){
    const m=messages[i],type=m.getType?.() ?? m._getType?.() ?? m.role ?? m.type;
    if(type === "human" || type === "user")return false;
    if(type === "tool" && ["write_file","edit_file"].includes(m.name ?? "") && m.status !== "error" && typeof m.content === "string" && !/^error/i.test(m.content.trim()))return true;
  }
  return false;
}
export function currentSetMessages<T extends Message>(messages: readonly T[]): T[] {
  for(let i=messages.length-1;i>=0;i--){
    const event=latestEvent([messages[i]]);
    const report=event?.report as {rep?:unknown}|undefined;
    if(event?.type === "set_start" || (event?.type === "rep" && report?.rep === 1))return messages.slice(i);
  }
  return [...messages];
}
export function toolAllowed(event: string | null, name: string) {
  return event === "onboarding_answer" && ["read_file", "write_file", "edit_file"].includes(name);
}
export const coachToolPolicy = createMiddleware({
  name: "CoachToolPolicy",
  wrapModelCall: (request, handler) => {
    const event=latestEvent(request.messages);
    const mustWrite=event?.type === "onboarding_answer" && event.question === "injuries" && !memoryWriteCompleted(request.messages);
    return handler({...request,
      messages:event?.type === "rep" && ["short","trim"].includes(process.env.JAX_AGENT_PROFILE ?? "") ? currentSetMessages(request.messages) : request.messages,
      tools:request.tools.filter(tool=>toolAllowed(latestEventType(request.messages),String(tool.name ?? "")) && (!mustWrite || ["write_file","edit_file"].includes(String(tool.name ?? "")))),
      ...(mustWrite ? {responseFormat:undefined,toolChoice:"required" as const} : {}),
    });
  },
  wrapToolCall: (request, handler) => {
    if (!toolAllowed(latestEventType(request.state.messages),request.toolCall.name)) throw new Error("Tools are restricted to onboarding memory updates");
    return handler(request);
  },
});
