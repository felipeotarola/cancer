-- API-based persistence without a PostgreSQL password in the app.
create function public.cancer_ensure_workspace()
returns table(id uuid, name text)
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.cancer_workspaces (owner_id, name, is_default)
  values (auth.uid(), 'OpenCancer', true)
  on conflict (owner_id) where is_default do nothing;
  return query select w.id, w.name from public.cancer_workspaces w where w.owner_id = auth.uid() and w.is_default;
end;
$$;
revoke all on function public.cancer_ensure_workspace() from public, anon;
grant execute on function public.cancer_ensure_workspace() to authenticated;

create function public.cancer_bind_session(p_owner uuid, p_chat uuid, p_session text)
returns text language plpgsql security invoker set search_path = '' as $$
declare result text;
begin
  perform 1 from public.cancer_chats where id = p_chat and owner_id = p_owner for update;
  if not found then raise exception 'Chat not found'; end if;
  insert into public.cancer_sessions (session_id, chat_id, owner_id)
  values (p_session, p_chat, p_owner) on conflict (chat_id) do nothing;
  select session_id into result from public.cancer_sessions where chat_id = p_chat and owner_id = p_owner;
  return result;
end;
$$;
revoke all on function public.cancer_bind_session(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancer_bind_session(uuid, uuid, text) to service_role;

create function public.cancer_save_message(p_owner uuid, p_session text, p_id text, p_role text, p_content text)
returns void language plpgsql security invoker set search_path = '' as $$
declare chat uuid;
begin
  select chat_id into chat from public.cancer_sessions where session_id = p_session and owner_id = p_owner;
  if chat is null then raise exception 'Session not found'; end if;
  insert into public.cancer_messages (id, chat_id, owner_id, role, content)
  values (p_id, chat, p_owner, p_role, p_content)
  on conflict (chat_id, id) do update set content = excluded.content;
  update public.cancer_chats set updated_at = now(), title = case when title = 'Ny chatt' and p_role = 'user' then left(p_content, 80) else title end
  where id = chat and owner_id = p_owner;
end;
$$;
revoke all on function public.cancer_save_message(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.cancer_save_message(uuid, text, text, text, text) to service_role;
grant all on public.cancer_workspaces, public.cancer_chats, public.cancer_sessions, public.cancer_messages to service_role;
grant usage, select on sequence public.cancer_messages_sequence_seq to service_role;
notify pgrst, 'reload schema';
