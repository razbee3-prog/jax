import { defineDeepAgent } from "managed-deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { providerStrategy } from "langchain";
import { registerHarnessProfile } from "deepagents";
import { CoachDecisionSchema } from "./shared/coach-decision";
import { coachToolPolicy } from "./policy";

if (process.env.JAX_AGENT_PROFILE === "trim") registerHarnessProfile("anthropic:claude-haiku-5-5", {
  excludedTools: ["task", "write_todos", "execute", "start_async_task", "check_async_task", "update_async_task", "cancel_async_task", "list_async_tasks"],
  excludedMiddleware: ["todoListMiddleware", "SummarizationMiddleware", "asyncSubAgentMiddleware", "parentNotifierMiddleware", "SteeringMiddleware"],
});

export const agent = defineDeepAgent({
  name: "jax-coach",
  model: new ChatAnthropic({
    model: "claude-haiku-5-5", maxTokens: 300, maxRetries: 0,
    thinking: { type: "disabled" }, outputConfig: { effort: "low" },
  }),
  responseFormat: providerStrategy(CoachDecisionSchema),
  middleware: [coachToolPolicy],
  permissions: [
    { operations: ["read", "write"], paths: ["/memories/user/AGENTS.md"] },
    { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
  ],
});
