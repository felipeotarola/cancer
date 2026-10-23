import type { SupabaseClient } from '@supabase/supabase-js';
import { checked, serverDatabase } from '../db.ts';
import type { WorkspaceSummary } from '../../shared/workspace.ts';
export async function getWorkspaceSummary(client: SupabaseClient): Promise<WorkspaceSummary> {
  const rows = checked(await client.rpc('cancer_ensure_workspace'));
  return { id: rows[0].id, name: rows[0].name, capabilities: { chat: true, serverFiles: false } };
}
export async function sessionWorkspace(userId: string, sessionId: string): Promise<WorkspaceSummary> {
  const db = serverDatabase();
  const session = checked(await db.from('cancer_sessions').select('chat_id').eq('session_id', sessionId).eq('owner_id', userId).single());
  const chat = checked(await db.from('cancer_chats').select('workspace_id').eq('id', session.chat_id).eq('owner_id', userId).single());
  if (!checked(await db.rpc('cancer_user_has_workspace_access', { p_workspace: chat.workspace_id, p_user: userId }))) throw new Error('Workspace access denied');
  const workspace = checked(await db.from('cancer_workspaces').select('id,name').eq('id', chat.workspace_id).single());
  return { ...workspace, capabilities: { chat: true, serverFiles: false } };
}
export async function saveSessionMessage(userId: string, sessionId: string, message: { id: string; role: 'user' | 'assistant'; content: string }) {
  const { error } = await serverDatabase().rpc('cancer_save_message', { p_owner: userId, p_session: sessionId, p_id: message.id, p_role: message.role, p_content: message.content });
  if (error) throw new Error('Unable to save chat message');
}
