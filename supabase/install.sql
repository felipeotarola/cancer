begin;
select pg_advisory_xact_lock(hashtext('opencancer:migrations'));
create table public.cancer_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now());
alter table public.cancer_migrations enable row level security;
revoke all on public.cancer_migrations from anon, authenticated;
create table public.cancer_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create unique index cancer_workspaces_default_owner on public.cancer_workspaces(owner_id) where is_default;
create index cancer_workspaces_owner on public.cancer_workspaces(owner_id);
create table public.cancer_chats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Ny chatt' check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (workspace_id, owner_id) references public.cancer_workspaces(id, owner_id) on delete cascade
);
create index cancer_chats_workspace on public.cancer_chats(workspace_id, owner_id, updated_at desc);
-- Session bindings and history are written only by the application server.
create table public.cancer_sessions (
  session_id text primary key,
  chat_id uuid not null unique,
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (chat_id, owner_id) references public.cancer_chats(id, owner_id) on delete cascade
);
create index cancer_sessions_owner on public.cancer_sessions(owner_id);
create table public.cancer_messages (
  id text not null,
  chat_id uuid not null,
  owner_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  sequence bigint generated always as identity,
  primary key (chat_id, id),
  foreign key (chat_id, owner_id) references public.cancer_chats(id, owner_id) on delete cascade
);
create index cancer_messages_order on public.cancer_messages(chat_id, sequence);
create index cancer_messages_owner on public.cancer_messages(owner_id);
alter table public.cancer_workspaces enable row level security;
alter table public.cancer_chats enable row level security;
alter table public.cancer_sessions enable row level security;
alter table public.cancer_messages enable row level security;
create policy cancer_workspace_owner on public.cancer_workspaces to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cancer_chat_owner on public.cancer_chats to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cancer_session_owner on public.cancer_sessions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy cancer_message_owner on public.cancer_messages for select to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.cancer_workspaces, public.cancer_chats, public.cancer_sessions, public.cancer_messages from anon, authenticated;
grant select, insert, delete on public.cancer_workspaces, public.cancer_chats to authenticated;
grant update (name) on public.cancer_workspaces to authenticated;
grant update (title) on public.cancer_chats to authenticated;
grant select on public.cancer_sessions, public.cancer_messages to authenticated;

insert into public.cancer_migrations (name, checksum) values ('001_cancer_workspace.sql', 'a8cde905009a7201c9530110c5a10065e4bb65d694cdc7a2613609f181adff84');
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

insert into public.cancer_migrations (name, checksum) values ('002_cancer_api.sql', 'f91a72cd5dbd29bd48f32bfcc766a0653e3bb98f82fb001a82486988c3080d0e');
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

insert into public.cancer_migrations (name, checksum) values ('003_workspace_sharing.sql', 'ec61f5666046ad9ba0ac11a1b65fe7fda90b8133c6b3ffe881d571cf8d031e56');
commit;
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename like 'cancer_%' order by tablename;
