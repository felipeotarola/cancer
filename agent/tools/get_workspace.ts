import { defineTool } from "eve/tools";
import { z } from "zod";
import { workspaceSummarySchema } from "../../shared/workspace.ts";
import { sessionWorkspace } from "../../server/services/workspace.ts";

export default defineTool({
  description: "Read the current workspace name and supported capabilities. Does not read browser-local files.",
  inputSchema: z.object({}),
  outputSchema: workspaceSummarySchema,
  label: { start: () => "Läser workspace" },
  execute(_input, ctx) {
    if (!ctx.session.auth.current) throw new Error("Authentication required");
    return sessionWorkspace(ctx.session.auth.current.principalId, ctx.session.id);
  },
});
