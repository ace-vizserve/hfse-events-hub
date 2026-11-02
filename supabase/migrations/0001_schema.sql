-- Proposal for a NEW Supabase database. Review before applying.
-- Server-only access by default: no anonymous/authenticated table policies.
-- Preserve original string IDs, including evt-* event IDs and registration UUID strings.
begin;
create table public.hfse_events_hub_event_admins (
 user_id uuid primary key references auth.users(id),
 role text not null check (role in ('administrator','controller')),
 created_at timestamptz not null default now()
);
create table public.hfse_events_hub_events (
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
create table public.hfse_events_hub_event_milestones (
 event_id text not null references public.hfse_events_hub_events(id),
 position integer not null check (position between 0 and 8),
 name text not null,
 due_date date,
 done boolean not null default false,
 completion_date date,
 completed_by text not null default '',
 notes text not null default '',
 primary key(event_id,position)
);
create table public.hfse_events_hub_registrations (
 id text primary key,
 event_id text not null references public.hfse_events_hub_events(id),
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
create index hfse_events_hub_registrations_event_id_idx on public.hfse_events_hub_registrations(event_id);
create table public.hfse_events_hub_event_files (
 id uuid primary key default gen_random_uuid(),
 event_id text not null,
 milestone_position integer not null,
 original_name text not null,
 storage_path text not null unique,
 legacy_key text,
 uploaded_at timestamptz not null default now(),
 foreign key(event_id,milestone_position) references public.hfse_events_hub_event_milestones(event_id,position)
);
create table public.hfse_events_hub_event_history (
 id uuid primary key default gen_random_uuid(),
 event_id text not null references public.hfse_events_hub_events(id),
 snapshot jsonb not null,
 recorded_at timestamptz not null default now(),
 actor text,
 legacy_key text
);
alter table public.hfse_events_hub_event_admins enable row level security;
alter table public.hfse_events_hub_events enable row level security;
alter table public.hfse_events_hub_event_milestones enable row level security;
alter table public.hfse_events_hub_registrations enable row level security;
alter table public.hfse_events_hub_event_files enable row level security;
alter table public.hfse_events_hub_event_history enable row level security;
-- No public view, grants, policies, storage bucket or Auth provider is created here.
-- Supply public event data through a server endpoint with an explicit safe projection.
-- Bootstrap admin membership via an authorised server-side/admin workflow only.
commit;
