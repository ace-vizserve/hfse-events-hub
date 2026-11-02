'use client';

import { useState } from 'react';
import { downloadCsv, postJson, toast } from '@/lib/client';
import { fmt, type Registration } from '@/lib/shared';

export function RegistrationsView({ initial }: { initial: Registration[] }) {
  const [regs, setRegs] = useState(initial);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const q = query.toLowerCase();
  const shown = regs.filter((r) => (r.parentName + ' ' + r.studentName + ' ' + r.eventTitle).toLowerCase().includes(q));

  async function checkin(id: string, attended: boolean) {
    setPending(id);
    setRegs((list) => list.map((r) => (r.id === id ? { ...r, attended } : r)));
    try {
      const saved = await postJson<Registration>('/api/checkin', { id, attended });
      setRegs((list) => list.map((r) => (r.id === id ? saved : r)));
      toast('Attendance updated.');
    } catch (e) {
      setRegs((list) => list.map((r) => (r.id === id ? { ...r, attended: !attended } : r)));
      toast((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  function exportCsv() {
    const rows: unknown[][] = [['Reference', 'Event', 'Parent/Guardian', 'Handphone', 'Student', 'Level', 'Class', 'Adults', 'Sessions', 'Questions', 'PDPA Consent', 'Submitted', 'Checked in']];
    regs.forEach((r) =>
      rows.push([r.id, r.eventTitle, r.parentName, r.phone, r.studentName, r.level, r.classSection || '', r.adults, r.sessions.join('; '), r.questions, r.consent ? 'Yes' : 'No', r.submittedAt, r.attended ? 'Yes' : 'No']),
    );
    downloadCsv('HFSE_Attendee_Registrations.csv', rows);
  }

  const stats: [number, string][] = [
    [regs.length, 'Registration submissions'],
    [regs.reduce((n, r) => n + r.adults, 0), 'Adults registered'],
    [regs.filter((r) => r.attended).length, 'Checked-in registrations'],
  ];

  return (
    <>
      <div className="titlebar">
        <div>
          <h1>Attendee registrations</h1>
          <p>Responses submitted directly through the Attendees Portal.</p>
        </div>
        <button onClick={exportCsv}>↓ Export registrations</button>
      </div>
      <div className="stats">
        {stats.map(([n, l]) => (
          <div className="stat" key={l}><div className="label">{l}</div><strong>{n}</strong></div>
        ))}
      </div>
      <div className="panel">
        <div className="toolbar">
          <input className="search" placeholder="Search parent, student or event…" aria-label="Search registrations" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="wrap">
          <table>
            <thead>
              <tr><th>EVENT / REFERENCE</th><th>PARENT / GUARDIAN</th><th>STUDENT / LEVEL</th><th>ADULTS / SESSIONS</th><th>QUESTIONS</th><th>SUBMITTED</th><th>CHECK IN</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.eventTitle}</b><div className="sub">{r.id}</div></td>
                  <td>{r.parentName}<div className="sub">{r.phone}</div></td>
                  <td>{r.studentName}<div className="sub">{r.level} {r.classSection}</div></td>
                  <td>{r.adults}<div className="sub">{r.sessions.join('; ')}</div></td>
                  <td>{r.questions}</td>
                  <td>{fmt(r.submittedAt.slice(0, 10))}</td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={'Check in ' + r.parentName}
                      checked={r.attended}
                      disabled={pending === r.id}
                      onChange={(e) => checkin(r.id, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {regs.length === 0 && <div className="empty">No registrations have been submitted yet.</div>}
        </div>
      </div>
    </>
  );
}
