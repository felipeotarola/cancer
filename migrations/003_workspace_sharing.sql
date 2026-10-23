create table public.cancer_workspace_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cancer_workspaces(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254 and position('@' in email) > 1),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);
alter table public.cancer_workspace_shares enable row level security;
create function public.cancer_user_has_workspace_access(p_workspace uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cancer_workspaces w where w.id = p_workspace and
    (w.owner_id = p_user or exists (
      select 1 from public.cancer_workspace_shares s join auth.users u
        on lower(u.email) = s.email and u.email_confirmed_at is not null
      where s.workspace_id = w.id and u.id = p_user
    )));
$$;
revoke all on function public.cancer_user_has_workspace_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancer_user_has_workspace_access(uuid, uuid) to service_role;
create function public.cancer_has_workspace_access(p_workspace uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.cancer_user_has_workspace_access(p_workspace, auth.uid());
$$;
revoke all on function public.cancer_has_workspace_access(uuid) from public, anon;
grant execute on function public.cancer_has_workspace_access(uuid) to authenticated;
create policy cancer_shares_owner on public.cancer_workspace_shares to authenticated
  using (exists (select 1 from public.cancer_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.cancer_workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));
revoke all on public.cancer_workspace_shares from anon, authenticated;
grant select, insert, delete on public.cancer_workspace_shares to authenticated;
grant all on public.cancer_workspace_shares to service_role;
create policy cancer_workspace_member_read on public.cancer_workspaces for select to authenticated
  using (public.cancer_has_workspace_access(id));
-- Shared workspace, private chats: each member owns only their own conversations.
alter table public.cancer_chats drop constraint cancer_chats_workspace_id_owner_id_fkey;
alter table public.cancer_chats add constraint cancer_chats_workspace_id_fkey foreign key (workspace_id) references public.cancer_workspaces(id) on delete cascade;
drop policy cancer_chat_owner on public.cancer_chats;
create policy cancer_chat_owner on public.cancer_chats to authenticated
  using (owner_id = auth.uid() and public.cancer_has_workspace_access(workspace_id))
  with check (owner_id = auth.uid() and public.cancer_has_workspace_access(workspace_id));
drop policy cancer_session_owner on public.cancer_sessions;
create policy cancer_session_owner on public.cancer_sessions for select to authenticated
  using (owner_id = auth.uid() and exists(select 1 from public.cancer_chats c where c.id = chat_id));
drop policy cancer_message_owner on public.cancer_messages;
create policy cancer_message_owner on public.cancer_messages for select to authenticated
  using (owner_id = auth.uid() and exists(select 1 from public.cancer_chats c where c.id = chat_id));
notify pgrst, 'reload schema';

create or replace function public.cancer_bind_session(p_owner uuid, p_chat uuid, p_session text)
returns text language plpgsql security invoker set search_path = '' as $$
declare result text;
begin
  perform 1 from public.cancer_chats where id = p_chat and owner_id = p_owner and public.cancer_user_has_workspace_access(workspace_id, p_owner) for update;
  if not found then raise exception 'Chat not found'; end if;
  insert into public.cancer_sessions (session_id, chat_id, owner_id)
  values (p_session, p_chat, p_owner) on conflict (chat_id) do nothing;
  select session_id into result from public.cancer_sessions where chat_id = p_chat and owner_id = p_owner;
  return result;
end;
$$;
revoke all on function public.cancer_bind_session(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancer_bind_session(uuid, uuid, text) to service_role;

create or replace function public.cancer_save_message(p_owner uuid, p_session text, p_id text, p_role text, p_content text)
returns void language plpgsql security invoker set search_path = '' as $$
declare chat uuid;
begin
  select chat_id into chat from public.cancer_sessions where session_id = p_session and owner_id = p_owner;
  if not exists(select 1 from public.cancer_chats c where c.id = chat and public.cancer_user_has_workspace_access(c.workspace_id, p_owner)) then raise exception 'Workspace access denied'; end if;
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
