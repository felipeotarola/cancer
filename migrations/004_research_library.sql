-- Imported private repository data is scoped to explicitly connected workspaces.
create table public.cancer_research_snapshots (
  workspace_id uuid not null references public.cancer_workspaces(id) on delete cascade,
  revision text not null check (revision ~ '^[a-f0-9]{40}$'),
  imported_at timestamptz not null default now(),
  tasks jsonb not null check (jsonb_typeof(tasks) = 'array' and jsonb_array_length(tasks) <= 200),
  primary key (workspace_id, revision)
);
create table public.cancer_research_links (
  workspace_id uuid not null,
  task_id text not null check (task_id ~ '^rtk_[0-7][0-9A-HJKMNP-TV-Z]{25}$'),
  revision text not null,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, task_id),
  foreign key (workspace_id, revision) references public.cancer_research_snapshots(workspace_id, revision) on delete cascade
);
alter table public.cancer_research_snapshots enable row level security;
alter table public.cancer_research_links enable row level security;
revoke all on public.cancer_research_snapshots, public.cancer_research_links from anon, authenticated;
grant select on public.cancer_research_snapshots to authenticated;
grant select, insert, delete on public.cancer_research_links to authenticated;
grant all on public.cancer_research_snapshots, public.cancer_research_links to service_role;
create policy cancer_research_snapshot_read on public.cancer_research_snapshots for select to authenticated
  using (public.cancer_has_workspace_access(workspace_id));
create policy cancer_research_link_read on public.cancer_research_links for select to authenticated
  using (public.cancer_has_workspace_access(workspace_id));
create policy cancer_research_link_add on public.cancer_research_links for insert to authenticated
  with check (added_by = auth.uid() and public.cancer_has_workspace_access(workspace_id) and exists (
    select 1 from public.cancer_research_snapshots s, jsonb_array_elements(s.tasks) t
    where s.workspace_id = cancer_research_links.workspace_id and s.revision = cancer_research_links.revision
      and t->>'id' = cancer_research_links.task_id
  ));
create policy cancer_research_link_remove on public.cancer_research_links for delete to authenticated
  using (public.cancer_has_workspace_access(workspace_id));
notify pgrst, 'reload schema';
