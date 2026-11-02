// Types and rules shared by the server and browser. Ported from the original Worker UI.

export type EventFile = { name: string; key: string };

export type Milestone = {
  name: string;
  due: string;
  done: boolean;
  completedAt: string;
  completedBy: string;
  notes: string;
  files: EventFile[];
};

export type HubEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  owner: string;
  category: string;
  venue: string;
  description: string;
  registration: boolean;
  sessions: string[];
  attendees: number;
  attendance: number;
  milestones: Milestone[];
  updatedAt?: string;
  updatedBy?: string;
  registeredTotal?: number;
  registrationCount?: number;
};

export type PortalEvent = Pick<HubEvent, 'id' | 'title' | 'start' | 'end' | 'category' | 'venue' | 'description' | 'sessions'>;

export type Registration = {
  id: string;
  eventId: string;
  eventTitle: string;
  parentName: string;
  phone: string;
  studentName: string;
  level: string;
  classSection: string;
  adults: number;
  sessions: string[];
  questions: string;
  consent: boolean;
  consentNotice: string;
  consentVersion: string;
  submittedAt: string;
  attended: boolean;
  checkedAt?: string | null;
  checkedBy?: string | null;
};

export const MILESTONE_NAMES = [
  'Proposal submission',
  'Approval',
  'Collaterals',
  'Advisory',
  'Follow-up / reminder',
  'Team briefing',
  'Post-event video / posting',
  'Report submission',
  'Report presentation',
];

export const LEVELS = [
  'YoungStarters',
  'Primary One',
  'Primary Two',
  'Primary Three',
  'Primary Four',
  'Primary Five',
  'Primary Six',
  'Secondary One',
  'Secondary Two',
  'Secondary Three',
  'Secondary Four',
  'STAFF',
  'PARENT',
  'ALUMNI',
  'VizSchool',
  'Other',
];

export const PDPA_NOTICE = 'https://bit.ly/HFSE_GEG_PDPA';
export const PDPA_VERSION = '2026-10-06';
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Dates are calendar dates, so format in UTC to get the same text on the server and in any browser.
export const fmt = (d?: string | null) =>
  d
    ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : 'Dates to confirm';

const days = (d: string, now: string) => Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(now + 'T00:00:00Z')) / 86400000);

export function due(m: Pick<Milestone, 'done' | 'due'>, now = today()) {
  if (m.done) return 'Complete';
  if (!m.due) return 'Unscheduled';
  const n = days(m.due, now);
  return n < 0 ? 'Overdue' : n === 0 ? 'Due today' : n <= 14 ? 'Due in 2 weeks' : 'Upcoming';
}

export function status(e: Pick<HubEvent, 'start' | 'milestones'>, now = today()) {
  if (e.milestones.every((m) => m.done)) return 'Complete';
  if (!e.start) return 'Dates to confirm';
  if (e.milestones.some((m) => due(m, now) === 'Overdue')) return 'Overdue';
  if (e.milestones.some((m) => ['Due today', 'Due in 2 weeks'].includes(due(m, now)))) return 'Due soon';
  return 'On track';
}

export function badgeClass(s: string) {
  if (s === 'Overdue') return 'badge red';
  if (['Due soon', 'Due today', 'Due in 2 weeks', 'Dates to confirm', 'Unscheduled'].includes(s)) return 'badge orange';
  if (s === 'Complete') return 'badge green';
  return 'badge';
}

export const blankEvent = (): HubEvent => ({
  id: 'evt-' + crypto.randomUUID(),
  title: '',
  start: '',
  end: '',
  owner: '',
  category: 'School events',
  venue: '',
  description: '',
  registration: false,
  sessions: [],
  attendees: 0,
  attendance: 0,
  milestones: MILESTONE_NAMES.map((name) => ({ name, due: '', done: false, completedAt: '', completedBy: '', notes: '', files: [] })),
});

// A leading quote stops spreadsheets running a cell as a formula while keeping its text, such as +65 phones.
export const csvCell = (v: unknown) => {
  const text = String(v ?? '');
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
};

export const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
