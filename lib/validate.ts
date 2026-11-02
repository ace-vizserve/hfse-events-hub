// Server-side request validation. Never trust what the browser sends.
import type { HubEvent, Milestone } from './shared.ts';

export const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const FILE_KEY_RE = /^files\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (v: unknown) => {
  if (v === '') return true;
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const parsed = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
};
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const isCount = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 2147483647;

export type RegistrationInput = {
  parentName: string;
  phone: string;
  studentName: string;
  level: string;
  classSection: string;
  adults: number;
  sessions: string[];
  questions: string;
};

export function parseRegistration(body: unknown, eventSessions: string[]): { error: string } | { value: RegistrationInput } {
  const r = (body ?? {}) as Record<string, unknown>;
  const textKeys = ['parentName', 'phone', 'studentName', 'level'];
  const incomplete =
    textKeys.some((k) => typeof r[k] !== 'string' || !(r[k] as string).trim() || (r[k] as string).length > 200) ||
    !str(r.parentName).includes(',') ||
    !str(r.studentName).includes(',') ||
    !/^\+?[0-9 ()-]{7,24}$/.test(str(r.phone)) ||
    r.consent !== true ||
    !Number.isInteger(r.adults) ||
    (r.adults as number) < 1 ||
    (r.adults as number) > 20;
  if (incomplete) return { error: 'Please complete all required fields in the prescribed format and accept the PDPA notice.' };

  const sessions = r.sessions;
  if (
    !Array.isArray(sessions) ||
    sessions.some((x) => !eventSessions.includes(x)) ||
    (eventSessions.length > 0 && sessions.length === 0)
  ) {
    return { error: 'Choose at least one valid event session.' };
  }

  if (r.questions !== undefined && r.questions !== null && typeof r.questions !== 'string') {
    return { error: 'Questions must be 2,000 characters or fewer.' };
  }
  const questions = str(r.questions);
  if (questions.length > 2000) return { error: 'Questions must be 2,000 characters or fewer.' };

  return {
    value: {
      parentName: str(r.parentName).trim(),
      phone: str(r.phone).trim(),
      studentName: str(r.studentName).trim(),
      level: str(r.level),
      classSection: str(r.classSection).slice(0, 150),
      adults: r.adults as number,
      sessions: sessions as string[],
      questions,
    },
  };
}

function parseMilestone(raw: unknown): Milestone | null {
  const m = (raw ?? {}) as Record<string, unknown>;
  if (typeof m.name !== 'string' || !m.name.trim() || typeof m.done !== 'boolean') return null;
  const due = m.due ?? '';
  const completedAt = typeof m.completedAt === 'string' ? m.completedAt.slice(0, 10) : '';
  if (!isDate(due) || !isDate(completedAt) || !Array.isArray(m.files)) return null;
  const files = m.files.map((f) => f as Record<string, unknown>);
  if (files.some((f) => typeof f?.name !== 'string' || !f.name || f.name.length > 255 || typeof f.key !== 'string' || !FILE_KEY_RE.test(f.key))) {
    return null;
  }
  return {
    name: m.name,
    due: due as string,
    done: m.done,
    completedAt,
    completedBy: str(m.completedBy),
    notes: str(m.notes),
    files: files.map((f) => ({ name: f.name as string, key: f.key as string })),
  };
}

export function parseEvent(body: unknown): { error: string } | { value: HubEvent } {
  const e = (body ?? {}) as Record<string, unknown>;
  const invalid = { error: 'Invalid event' };
  if (typeof e.id !== 'string' || !/^[\w-]{1,80}$/.test(e.id)) return invalid;
  if (typeof e.title !== 'string' || !e.title.trim()) return invalid;
  if (!Array.isArray(e.milestones) || e.milestones.length !== 9) return invalid;

  const start = e.start ?? '';
  const end = e.end ?? '';
  if (!isDate(start) || !isDate(end)) return invalid;
  if (end && (!start || (end as string) < (start as string))) return { error: 'End date must be on or after the start date.' };

  const sessions = e.sessions ?? [];
  if (!Array.isArray(sessions) || sessions.some((s) => typeof s !== 'string')) return invalid;
  const attendees = e.attendees ?? 0;
  const attendance = e.attendance ?? 0;
  if (!isCount(attendees) || !isCount(attendance)) return invalid;

  const milestones = e.milestones.map(parseMilestone);
  if (milestones.some((m) => m === null)) return invalid;

  return {
    value: {
      id: e.id,
      title: e.title,
      start: start as string,
      end: end as string,
      owner: str(e.owner),
      category: str(e.category),
      venue: str(e.venue),
      description: str(e.description),
      registration: e.registration === true,
      sessions: sessions as string[],
      attendees: attendees as number,
      attendance: attendance as number,
      milestones: milestones as Milestone[],
    },
  };
}
