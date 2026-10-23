import { z } from "zod";

export const workspaceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  capabilities: z.object({ chat: z.literal(true), serverFiles: z.literal(false) }),
});
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
