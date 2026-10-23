import { defineAgent, defineDynamic } from "eve";
import { openai } from "eve/models/openai";
import { agentModel, resolveReasoning } from "../shared/agent-config.ts";

export default defineAgent({
  model: defineDynamic({ events: {
    "step.started": (_event, ctx) => ({
      model: openai(agentModel),
      modelContextWindowTokens: 1_050_000,
      reasoning: "provider-default" as const,
      modelOptions: { providerOptions: { openai: {
        reasoningEffort: resolveReasoning(ctx.session.auth.current?.attributes.cancerReasoning),
      } } },
    }),
  } }),
  defaultTools: false,
  tool: false,
  limits: { maxInputTokensPerSession: 100_000, maxOutputTokensPerSession: 15_000 },
});
