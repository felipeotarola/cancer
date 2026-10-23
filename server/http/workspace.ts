import { routeAuth } from "eve/channels/auth";
import { appAuth } from "../auth.ts";
import { getWorkspaceSummary } from "../services/workspace.ts";
import { userDatabase } from '../db.ts';

export async function workspaceResponse(request: Request): Promise<Response> {
  const auth = await routeAuth(request, appAuth);
  if (auth instanceof Response) return auth;
  return Response.json(await getWorkspaceSummary(userDatabase(request.headers.get('authorization')!.slice(7))), {
    headers: { "cache-control": "no-store" },
  });
}
