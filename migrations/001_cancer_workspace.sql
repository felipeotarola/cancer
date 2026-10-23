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
