// Loads the 47 starter events once. Safe to re-run: existing rows are left untouched,
// so this can never overwrite newer records. Do not run it as part of a deployment.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const seed = JSON.parse(readFileSync(new URL('../supabase/events-seed.json', import.meta.url), 'utf8'));

const events = seed.map((e) => ({
  id: e.id,
  title: e.title,
  start_date: e.start || null,
  end_date: e.end || null,
  owner: e.owner ?? '',
  category: e.category ?? '',
  venue: e.venue ?? '',
  description: e.description ?? '',
  registration_open: !!e.registration,
  sessions: e.sessions ?? [],
  manual_registered: e.attendees ?? 0,
  manual_attendance: e.attendance ?? 0,
  updated_by: 'Starter data',
}));
const milestones = seed.flatMap((e) =>
  e.milestones.map((m, position) => ({
    event_id: e.id,
    position,
    name: m.name,
    due_date: m.due || null,
    done: !!m.done,
    completion_date: m.completedAt ? m.completedAt.slice(0, 10) : null,
    completed_by: m.completedBy ?? '',
    notes: m.notes ?? '',
  })),
);

const first = await db.from('hfse_events_hub_events').upsert(events, { onConflict: 'id', ignoreDuplicates: true });
if (first.error) throw first.error;
const second = await db
  .from('hfse_events_hub_event_milestones')
  .upsert(milestones, { onConflict: 'event_id,position', ignoreDuplicates: true });
if (second.error) throw second.error;

console.log(`Done. Checked ${events.length} starter events; existing records were left unchanged.`);
