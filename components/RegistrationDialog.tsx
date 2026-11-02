'use client';

import { useState, type FormEvent } from 'react';
import { postJson, toast } from '@/lib/client';
import { fmt, LEVELS, PDPA_NOTICE, type PortalEvent } from '@/lib/shared';
import { Modal } from './Modal';

export function RegistrationDialog({ events, initialId, onClose }: { events: PortalEvent[]; initialId: string; onClose: () => void }) {
  const [eventId, setEventId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string; eventTitle: string } | null>(null);

  const selected = events.find((x) => x.id === eventId);
  const sessions = selected?.sessions ?? [];
  const close = () => (busy ? toast('Please wait until the current upload or save finishes.') : onClose());

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (busy) return;
    const f = new FormData(ev.currentTarget);
    if (!eventId) return toast('Please select an event.');
    const parentName = String(f.get('parentName'));
    const studentName = String(f.get('studentName'));
    if (!parentName.includes(',') || !studentName.includes(',')) return toast('Please use Last Name, First Name for both name fields.');
    setBusy(true);
    try {
      const r = await postJson('/api/register', {
        eventId,
        parentName,
        phone: f.get('phone'),
        studentName,
        level: f.get('level'),
        classSection: f.get('classSection'),
        adults: Number(f.get('adults')),
        sessions: f.getAll('sessions'),
        questions: f.get('questions'),
        consent: f.has('consent'),
      });
      setDone(r);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal busy={false} onClose={onClose}>
        <div className="confirm">
          <div className="check">✓</div>
          <h2>Registration received!</h2>
          <p>Thank you for registering for {done.eventTitle}.</p>
          <p style={{ marginTop: 18 }}>Please keep your registration reference:</p>
          <code>{done.reference}</code>
          <p>No email confirmation has been sent. Your registration is saved in the HFSE Events Database.</p>
          <button className="primary" style={{ marginTop: 25 }} onClick={onClose}>Back to events</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal busy={busy} onClose={onClose}>
      <div className="modalhead">
        <div>
          <div className="eyebrow">HFSE AY2027 · EVENTS REGISTRATION</div>
          <h2>{selected?.title ?? 'Register for an event'}</h2>
          <p>{fmt(selected?.start)} · {selected?.venue || 'Venue to be announced'}</p>
        </div>
        <button type="button" aria-label="Close" onClick={close}>✕</button>
      </div>
      <form onSubmit={submit}>
        <div className="modalbody">
          <label style={{ marginBottom: 22 }}>
            Event *
            <select name="eventId" required value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">Select an event</option>
              {events
                .slice()
                .sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'))
                .map((x) => <option key={x.id} value={x.id}>{x.title} | {fmt(x.start)}</option>)}
            </select>
          </label>
          <p>{selected?.description}</p>
          <div className="regnotice">
            <b>Important Reminder</b><br />
            Please ensure that all information is complete, accurate and follows the prescribed format for each field. This helps us process your registration smoothly.<br />
            Warm regards, HFSE International School · International School for All.
          </div>
          <div className="grid">
            <label>Name of parent/guardian or attendee * | Last Name, First Name<input name="parentName" required /></label>
            <label>Handphone no. of parent/guardian or attendee *<input name="phone" type="tel" required /></label>
            <label>Student name * | Last Name, First Name (use N/A, N/A if not applicable)<input name="studentName" required /></label>
            <label>
              Level / attendee category *
              <select name="level" required defaultValue="">
                <option value="">Select your answer</option>
                {LEVELS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Class / section (optional)<input name="classSection" placeholder="For example: Primary Four Trust" /></label>
            <label>
              How many adults are attending? *
              <select name="adults" required>
                {Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
            {sessions.length > 0 && (
              <div className="wide" key={eventId}>
                <b>I will be attending (check all that apply) *</b>
                {sessions.map((x) => (
                  <label style={{ marginTop: 12 }} key={x}>
                    <input style={{ width: 'auto', display: 'inline' }} type="checkbox" name="sessions" value={x} /> {x}
                  </label>
                ))}
              </div>
            )}
            <label className="wide">
              Questions for our speaker or suggested sub-topics for discussion
              <textarea name="questions" maxLength={2000} rows={3} />
            </label>
            <label className="wide" style={{ lineHeight: 1.8 }}>
              <input name="consent" type="checkbox" style={{ width: 'auto', display: 'inline' }} required /> I acknowledge that I have read and understood the{' '}
              <a href={PDPA_NOTICE} target="_blank" rel="noopener">PDPA Notice</a>, and consent to the collection, use and disclosure of my personal data by HFSE Global Education Group for the purposes set out in the Notice. *
            </label>
          </div>
          <p className="sub" style={{ marginTop: 20 }}>Your details are collected only through the information you provide in this form.</p>
        </div>
        <div className="modalfoot">
          <button type="button" onClick={close}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>Submit registration</button>
        </div>
      </form>
    </Modal>
  );
}
