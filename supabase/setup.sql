-- Combined copy of migrations/0001_schema.sql and migrations/0002_app.sql for pasting into
-- the Supabase SQL editor. Run once on a new, empty project. Fails on a second run.
-- If you change a migration, regenerate this file.

-- Proposal for a NEW Supabase database. Review before applying.
-- Server-only access by default: no anonymous/authenticated table policies.
-- Preserve original string IDs, including evt-* event IDs and registration UUID strings.
begin;
create table public.event_admins (
 user_id uuid primary key references auth.users(id),
 role text not null check (role in ('administrator','controller')),
 created_at timestamptz not null default now()
);
create table public.events (
 id text primary key,
 title text not null,
 start_date date,
 end_date date,
 owner text not null default '',
 category text not null default '',
 venue text not null default '',
 description text not null default '',
 registration_open boolean not null default false,
 sessions jsonb not null default '[]'::jsonb,
 manual_registered integer not null default 0 check (manual_registered >= 0),
 manual_attendance integer not null default 0 check (manual_attendance >= 0),
 updated_at timestamptz not null default now(),
 updated_by text,
 check (end_date is null or (start_date is not null and end_date >= start_date))
);
create table public.event_milestones (
 event_id text not null references public.events(id),
 position integer not null check (position between 0 and 8),
 name text not null,
 due_date date,
 done boolean not null default false,
 completion_date date,
 completed_by text not null default '',
 notes text not null default '',
 primary key(event_id,position)
);
create table public.registrations (
 id text primary key,
 event_id text not null references public.events(id),
 event_title_snapshot text not null,
 parent_name text not null,
 phone text not null,
 student_name text not null,
 level text not null,
 class_section text not null default '',
 adults integer not null check (adults between 1 and 20),
 sessions jsonb not null default '[]'::jsonb,
 questions text not null default '',
 consent boolean not null check (consent),
 consent_notice text not null,
 consent_version text not null,
 submitted_at timestamptz not null default now(),
 attended boolean not null default false,
 checked_at timestamptz,
 checked_by text
);
create index registrations_event_id_idx on public.registrations(event_id);
create table public.event_files (
 id uuid primary key default gen_random_uuid(),
 event_id text not null,
 milestone_position integer not null,
 original_name text not null,
 storage_path text not null unique,
 legacy_key text,
 uploaded_at timestamptz not null default now(),
 foreign key(event_id,milestone_position) references public.event_milestones(event_id,position)
);
create table public.event_history (
 id uuid primary key default gen_random_uuid(),
 event_id text not null references public.events(id),
 snapshot jsonb not null,
 recorded_at timestamptz not null default now(),
 actor text,
 legacy_key text
);
alter table public.event_admins enable row level security;
alter table public.events enable row level security;
alter table public.event_milestones enable row level security;
alter table public.registrations enable row level security;
alter table public.event_files enable row level security;
alter table public.event_history enable row level security;
-- No public view, grants, policies, storage bucket or Auth provider is created here.
-- Supply public event data through a server endpoint with an explicit safe projection.
-- Bootstrap admin membership via an authorised server-side/admin workflow only.
commit;

-- Run after 0001_schema.sql. Adds what the Next.js app needs on top of the handover schema.
begin;

-- All data access goes through server routes using the service role.
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- Saving an event touches several tables, so it runs as one transaction:
-- keep the earlier version in event_history, then write the event, its nine
-- milestones and its file list. p_event uses the API's field names.
create function public.save_event(p_event jsonb, p_actor text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id text := p_event->>'id';
  v_exists boolean;
begin
  perform 1 from public.events e where e.id = v_id for update;
  v_exists := found;

  if v_exists then
    insert into public.event_history (event_id, actor, snapshot)
    select v_id, p_actor, jsonb_build_object(
      'id', e.id, 'title', e.title,
      'start', coalesce(e.start_date::text, ''), 'end', coalesce(e.end_date::text, ''),
      'owner', e.owner, 'category', e.category, 'venue', e.venue, 'description', e.description,
      'registration', e.registration_open, 'sessions', e.sessions,
      'attendees', e.manual_registered, 'attendance', e.manual_attendance,
      'updatedAt', e.updated_at, 'updatedBy', e.updated_by,
      'milestones', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', m.name, 'due', coalesce(m.due_date::text, ''), 'done', m.done,
          'completedAt', coalesce(m.completion_date::text, ''), 'completedBy', m.completed_by,
          'notes', m.notes,
          'files', (
            select coalesce(jsonb_agg(jsonb_build_object('name', f.original_name, 'key', f.storage_path)), '[]'::jsonb)
            from public.event_files f
            where f.event_id = m.event_id and f.milestone_position = m.position
          )
        ) order by m.position), '[]'::jsonb)
        from public.event_milestones m where m.event_id = e.id
      )
    )
    from public.events e where e.id = v_id;
  end if;

  insert into public.events (
    id, title, start_date, end_date, owner, category, venue, description,
    registration_open, sessions, manual_registered, manual_attendance, updated_at, updated_by
  ) values (
    v_id, p_event->>'title',
    nullif(p_event->>'start', '')::date, nullif(p_event->>'end', '')::date,
    p_event->>'owner', p_event->>'category', p_event->>'venue', p_event->>'description',
    (p_event->>'registration')::boolean, p_event->'sessions',
    (p_event->>'attendees')::integer, (p_event->>'attendance')::integer, now(), p_actor
  )
  on conflict (id) do update set
    title = excluded.title, start_date = excluded.start_date, end_date = excluded.end_date,
    owner = excluded.owner, category = excluded.category, venue = excluded.venue,
    description = excluded.description, registration_open = excluded.registration_open,
    sessions = excluded.sessions, manual_registered = excluded.manual_registered,
    manual_attendance = excluded.manual_attendance,
    updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  insert into public.event_milestones (
    event_id, position, name, due_date, done, completion_date, completed_by, notes
  )
  select v_id, (t.ord - 1)::integer, t.m->>'name', nullif(t.m->>'due', '')::date,
         (t.m->>'done')::boolean, nullif(t.m->>'completedAt', '')::date,
         t.m->>'completedBy', t.m->>'notes'
  from jsonb_array_elements(p_event->'milestones') with ordinality as t(m, ord)
  on conflict (event_id, position) do update set
    name = excluded.name, due_date = excluded.due_date, done = excluded.done,
    completion_date = excluded.completion_date, completed_by = excluded.completed_by,
    notes = excluded.notes;

  -- Sync this event's file list, keeping uploaded_at and legacy_key on existing rows.
  delete from public.event_files x
  where x.event_id = v_id and x.storage_path not in (
    select f->>'key'
    from jsonb_array_elements(p_event->'milestones') as m, jsonb_array_elements(m->'files') as f
  );

  -- A key attached to a different event must not be taken over.
  if exists (
    select 1
    from jsonb_array_elements(p_event->'milestones') as m, jsonb_array_elements(m->'files') as f
    join public.event_files x on x.storage_path = f->>'key'
    where x.event_id <> v_id
  ) then
    raise exception 'File is attached to another event';
  end if;

  insert into public.event_files (event_id, milestone_position, original_name, storage_path)
  select v_id, (t.ord - 1)::integer, f->>'name', f->>'key'
  from jsonb_array_elements(p_event->'milestones') with ordinality as t(m, ord),
       jsonb_array_elements(t.m->'files') as f
  on conflict (storage_path) do update set
    milestone_position = excluded.milestone_position, original_name = excluded.original_name;
end;
$$;

-- Functions are executable by PUBLIC by default and the Data API exposes them.
revoke all on function public.save_event(jsonb, text) from public, anon, authenticated;
grant execute on function public.save_event(jsonb, text) to service_role;

-- Private bucket for evidence. No storage.objects policies: all access is through
-- short-lived signed URLs issued by the server after an admin check.
insert into storage.buckets (id, name, public, file_size_limit)
values ('event-files', 'event-files', false, 20971520)
on conflict (id) do nothing;

commit;
