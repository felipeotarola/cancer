import { defineChannel, GET, POST, DELETE } from "eve/channels";
import { workspaceResponse } from "../../server/http/workspace.ts";
import { configResponse, researchResponse } from "../../server/http/research.ts";

// Thin HTTP transport. The application service is shared with agent tools.
export default defineChannel({
  routes: [GET("/api/workspace", workspaceResponse), GET('/api/auth/config', configResponse),
    GET('/api/workspaces', researchResponse), POST('/api/workspaces', researchResponse),
    GET('/api/workspace-shares', researchResponse), POST('/api/workspace-shares', researchResponse), DELETE('/api/workspace-shares', researchResponse),
    GET('/api/chats', researchResponse), POST('/api/chats', researchResponse)],
});
