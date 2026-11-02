'use client';

import { useState, type FormEvent } from 'react';
import { postJson, toast } from '@/lib/client';
import { badgeClass, due, fmt, MAX_FILE_BYTES, type HubEvent, type Milestone } from '@/lib/shared';
import { createClient } from '@/lib/supabase/browser';
import { Modal } from './Modal';

type TextKey = 'title' | 'category' | 'start' | 'end' | 'owner' | 'venue';

export function EventEditor({ event, onClose, onSaved }: { event: HubEvent; onClose: () => void; onSaved: (e: HubEvent) => void }) {
  const [draft, setDraft] = useState<HubEvent>(event);
  const [sessionsText, setSessionsText] = useState((event.sessions ?? []).join('\n'));
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<HubEvent>) => setDraft((d) => ({ ...d, ...patch }));
  const setMilestone = (i: number, patch: Partial<Milestone>) =>
    setDraft((d) => ({ ...d, milestones: d.milestones.map((m, n) => (n === i ? { ...m, ...patch } : m)) }));
  const close = () => (busy ? toast('Please wait until the current upload or save finishes.') : onClose());

  async function upload(i: number, input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast('Choose a file up to 20 MB');
      input.value = '';
      return;
    }
    setBusy(true);
    try {
      const slot = await postJson('/api/upload', { name: file.name, size: file.size });
      const { error } = await createClient()
        .storage.from('hfse-events-hub-files')
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: 'application/octet-stream' });
      if (error) throw new Error('Upload failed. Please try again.');
      setDraft((d) => ({
        ...d,
        milestones: d.milestones.map((m, n) => (n === i ? { ...m, files: [...m.files, { name: slot.name, key: slot.key }] } : m)),
      }));
      toast('File uploaded. Save the event to attach it to the milestone.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      input.value = '';
    }
  }

  async function save(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    if (draft.end && (!draft.start || draft.end < draft.start)) return toast('End date must be on or after the start date.');
    for (const m of draft.milestones) {
      if (m.done && (!m.completedAt || !m.completedBy.trim())) return toast('Add the completion date and reviewer name for ' + m.name + '.');
    }
    const sessions = sessionsText.split('\n').map((x) => x.trim()).filter(Boolean);
    setBusy(true);
    try {
      const saved = await postJson<HubEvent>('/api/events', { ...draft, sessions });
      toast('Event saved successfully.');
      onSaved(saved);
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  }

  const text = (label: string, name: TextKey, type = 'text', required = false) => (
    <label>
      {label}
      <input name={name} value={draft[name]} type={type} required={required} onChange={(e) => set({ [name]: e.target.value })} />
    </label>
  );
  const count = (label: string, name: 'attendees' | 'attendance') => (
    <label>
      {label}
      <input name={name} type="number" min="0" step="1" value={draft[name]} onChange={(e) => set({ [name]: Number(e.target.value) })} />
    </label>
  );

  return (
    <Modal busy={busy} onClose={onClose}>
      <div className="modalhead">
        <div>
          <span className="sub">EVENT WORKSPACE</span>
          <h2 style={{ margin: '7px 0 0', fontSize: 20 }}>{event.title || 'Create a new event'}</h2>
        </div>
        <button type="button" aria-label="Close" onClick={close}>✕</button>
      </div>
      <form onSubmit={save}>
        <div className="modalbody">
          <div className="grid">
            {text('Event title', 'title', 'text', true)}
            {text('Category', 'category')}
            {text('Start date', 'start', 'date')}
            {text('End date', 'end', 'date')}
            {text('Event head/s', 'owner')}
            {text('Venue', 'venue')}
            <label className="wide">
              Event description
              <textarea name="description" rows={3} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
            </label>
            {count('Registered attendees (manual)', 'attendees')}
            {count('Actual attendance (manual)', 'attendance')}
            <label className="wide">
              Registration sessions (one option per line)
              <textarea
                name="sessions"
                rows={3}
                placeholder="Optional: add sessions for attendees to select"
                value={sessionsText}
                onChange={(e) => setSessionsText(e.target.value)}
              />
            </label>
            <label className="wide">
              <input
                style={{ display: 'inline', width: 'auto' }}
                type="checkbox"
                name="registration"
                checked={draft.registration}
                onChange={(e) => set({ registration: e.target.checked })}
              />{' '}
              Show in attendee portal
            </label>
          </div>
          <div className="notice" style={{ marginTop: 20 }}>
            In-system registrations: {event.registrationCount || 0} submissions · {event.registeredTotal || 0} adults. View individual responses in Registrations.
          </div>
          <h3 style={{ margin: '28px 0 8px' }}>Proposal to post-event documentation</h3>
          <p style={{ fontSize: 12 }}>Record completion, retain supporting evidence and update due dates.</p>
          {draft.milestones.map((m, i) => (
            <div className="milestone" key={i}>
              <div className="milestone-top">
                <input aria-label={'Complete ' + m.name} type="checkbox" checked={m.done} onChange={(e) => setMilestone(i, { done: e.target.checked })} />
                <b>{String(i + 1).padStart(2, '0')} &nbsp; {m.name}</b>
                <input aria-label={'Due date ' + m.name} type="date" value={m.due} onChange={(e) => setMilestone(i, { due: e.target.value })} />
                <span className={badgeClass(due(m))}>{due(m)}</span>
              </div>
              <details>
                <summary className="sub">Notes, completion record &amp; supporting files ({m.files.length})</summary>
                <div className="grid" style={{ marginTop: 12 }}>
                  <label>
                    Completion date
                    <input type="date" value={m.completedAt} onChange={(e) => setMilestone(i, { completedAt: e.target.value })} />
                  </label>
                  <label>
                    Completed / reviewed by
                    <input value={m.completedBy} onChange={(e) => setMilestone(i, { completedBy: e.target.value })} />
                  </label>
                </div>
                <textarea
                  aria-label={'Notes for ' + m.name}
                  placeholder="Submission notes, reviewer comments or document links"
                  value={m.notes}
                  onChange={(e) => setMilestone(i, { notes: e.target.value })}
                />
                <div>
                  {m.files.map((f) => (
                    <p key={f.key}>
                      <a href={'/api/' + f.key}>↧ {f.name}</a>
                    </p>
                  ))}
                </div>
                <input type="file" aria-label={'Attach evidence for ' + m.name} onChange={(e) => upload(i, e.target)} />
                <div className="sub" style={{ marginTop: 7 }}>PDF, Word, Excel, images or other evidence · up to 20 MB</div>
              </details>
            </div>
          ))}
        </div>
        <div className="modalfoot">
          <span className="sub">
            {event.updatedAt ? 'Last saved ' + fmt(event.updatedAt.slice(0, 10)) + ' · ' + (event.updatedBy ?? '') : 'Completion status awaiting team confirmation'}
          </span>
          <div>
            <button type="button" onClick={close}>Cancel</button>{' '}
            <button className="primary" type="submit" disabled={busy}>Save event</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
