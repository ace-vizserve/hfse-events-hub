import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PDPA_NOTICE, PDPA_VERSION, type EventFile, type HubEvent, type PortalEvent, type Registration } from './shared';
import { createServiceClient } from './supabase/server';
import type { RegistrationInput } from './validate';

type Row = Record<string, any>;
const PAGE = 1000;

// The Data API caps each response (1,000 rows by default), so read in pages to avoid silent truncation.
async function fetchAll(build: (db: SupabaseClient) => any, db: SupabaseClient = createServiceClient()): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(db).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

const toRegistration = (r: Row): Registration => ({
  id: r.id,
  eventId: r.event_id,
  eventTitle: r.event_title_snapshot,
  parentName: r.parent_name,
  phone: r.phone,
  studentName: r.student_name,
  level: r.level,
  classSection: r.class_section,
  adults: r.adults,
  sessions: r.sessions ?? [],
  questions: r.questions,
  consent: r.consent,
  consentNotice: r.consent_notice,
  consentVersion: r.consent_version,
  submittedAt: r.submitted_at,
  attended: r.attended,
  checkedAt: r.checked_at,
  checkedBy: r.checked_by,
});

export async function listEvents(): Promise<HubEvent[]> {
  const db = createServiceClient();
  const [events, milestones, files, regs] = await Promise.all([
    fetchAll((c) => c.from('hfse_events_hub_events').select('*').order('id'), db),
    fetchAll((c) => c.from('hfse_events_hub_event_milestones').select('*').order('event_id').order('position'), db),
    fetchAll((c) => c.from('hfse_events_hub_event_files').select('event_id,milestone_position,original_name,storage_path').order('uploaded_at').order('id'), db),
    fetchAll((c) => c.from('hfse_events_hub_registrations').select('event_id,adults').order('id'), db),
  ]);

  const filesBy = new Map<string, EventFile[]>();
  for (const f of files) {
    const key = f.event_id + '/' + f.milestone_position;
    filesBy.set(key, [...(filesBy.get(key) ?? []), { name: f.original_name, key: f.storage_path }]);
  }
  const milestonesBy = new Map<string, Row[]>();
  for (const m of milestones) milestonesBy.set(m.event_id, [...(milestonesBy.get(m.event_id) ?? []), m]);

  return events.map((e) => {
    const own = regs.filter((r) => r.event_id === e.id);
    return {
      id: e.id,
      title: e.title,
      start: e.start_date ?? '',
      end: e.end_date ?? '',
      owner: e.owner,
      category: e.category,
      venue: e.venue,
      description: e.description,
      registration: e.registration_open,
      sessions: e.sessions ?? [],
      attendees: e.manual_registered,
      attendance: e.manual_attendance,
      updatedAt: e.updated_at,
      updatedBy: e.updated_by ?? undefined,
      registeredTotal: own.reduce((n, r) => n + r.adults, 0),
      registrationCount: own.length,
      milestones: (milestonesBy.get(e.id) ?? []).map((m) => ({
        name: m.name,
        due: m.due_date ?? '',
        done: m.done,
        completedAt: m.completion_date ?? '',
        completedBy: m.completed_by,
        notes: m.notes,
        files: filesBy.get(e.id + '/' + m.position) ?? [],
      })),
    };
  });
}

export async function saveEvent(event: HubEvent, actor: string) {
  const { error } = await createServiceClient().rpc('hfse_events_hub_save_event', { p_event: event, p_actor: actor });
  if (error) throw error;
}

// Explicit safe projection: no owners, milestones or attendee details.
export async function listPortalEvents(): Promise<PortalEvent[]> {
  const rows = await fetchAll((c) =>
    c.from('hfse_events_hub_events').select('id,title,start_date,end_date,category,venue,description,sessions').eq('registration_open', true).order('id'),
  );
  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start_date ?? '',
    end: e.end_date ?? '',
    category: e.category,
    venue: e.venue,
    description: e.description,
    sessions: e.sessions ?? [],
  }));
}

export async function getOpenEvent(id: string) {
  const { data, error } = await createServiceClient()
    .from('hfse_events_hub_events')
    .select('id,title,sessions')
    .eq('id', id)
    .eq('registration_open', true)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; title: string; sessions: string[] | null } | null;
}

export async function createRegistration(event: { id: string; title: string }, r: RegistrationInput) {
  const id = crypto.randomUUID();
  const { error } = await createServiceClient().from('hfse_events_hub_registrations').insert({
    id,
    event_id: event.id,
    event_title_snapshot: event.title,
    parent_name: r.parentName,
    phone: r.phone,
    student_name: r.studentName,
    level: r.level,
    class_section: r.classSection,
    adults: r.adults,
    sessions: r.sessions,
    questions: r.questions,
    consent: true,
    consent_notice: PDPA_NOTICE,
    consent_version: PDPA_VERSION,
  });
  if (error) throw error;
  return id;
}

export async function listRegistrations(): Promise<Registration[]> {
  return (await fetchAll((c) => c.from('hfse_events_hub_registrations').select('*').order('submitted_at').order('id'))).map(toRegistration);
}

export async function setAttendance(id: string, attended: boolean, actor: string) {
  const { data, error } = await createServiceClient()
    .from('hfse_events_hub_registrations')
    .update({ attended, checked_by: actor, checked_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? toRegistration(data) : null;
}

export async function getFileName(storagePath: string) {
  const { data, error } = await createServiceClient()
    .from('hfse_events_hub_event_files')
    .select('original_name')
    .eq('storage_path', storagePath)
    .maybeSingle();
  if (error) throw error;
  return data?.original_name as string | undefined;
}
