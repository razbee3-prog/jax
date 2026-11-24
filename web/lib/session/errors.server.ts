import {auditError} from "./audit-errors.server";
export function logApiError(path:string,error:unknown,request:Request,context:Record<string,unknown>={}){
  const thread=request.headers.get("x-jax-thread-id");
  console.error("jax.api.error",{path,...(thread && /^[0-9a-f-]{36}$/i.test(thread) ? {thread_id:thread}:{}),...context,...auditError(error)});
}
