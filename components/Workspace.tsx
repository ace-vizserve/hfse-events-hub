'use client';

import { useMemo, useState } from 'react';
import { downloadCsv } from '@/lib/client';
import { badgeClass, blankEvent, due, fmt, status, type HubEvent } from '@/lib/shared';
import { EventEditor } from './EventEditor';

export type WorkspaceView = 'Overview' | 'Events Database' | 'Deadline tracker' | 'Calendar';

const SUBTITLES: Record<WorkspaceView, string> = {
  Overview: 'Your events, from the first proposal to the final report.',
  'Events Database': 'One workspace for every AY2027 event.',
  'Deadline tracker': 'Stay ahead of every deliverable and submission.',
  Calendar: 'The year at a glance. Select an event to see its milestones.',
};
const STATUSES = ['All statuses', 'On track', 'Overdue', 'Due soon', 'Dates to confirm', 'Complete'];
const TASK_FILTERS = ['Pending', 'Overdue', 'Due today', 'Due in 2 weeks', 'Complete', 'Unscheduled', 'All'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Badge = ({ s }: { s: string }) => <span className={badgeClass(s)}>{s}</span>;

function EventTable({ events, onOpen }: { events: HubEvent[]; onOpen: (e: HubEvent) => void }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All categories');
  const [filter, setFilter] = useState('All statuses');

  const list = events
    .filter(
      (e) =>
        (e.title + ' ' + e.owner).toLowerCase().includes(query.toLowerCase()) &&
        (cat === 'All categories' || e.category === cat) &&
        (filter === 'All statuses' || status(e) === filter),
    )
    .sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));

  return (
    <div className="panel">
      <div className="panelhead">
        <h2>Event monitoring</h2>
        <span className="sub">{events.length} events · 9 milestones each</span>
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search events or event heads…" aria-label="Search events or event heads" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
          {['All categories', ...new Set(events.map((e) => e.category))].map((x) => <option key={x}>{x}</option>)}
        </select>
        <select aria-label="Status" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {STATUSES.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="wrap">
        <table>
          <thead>
            <tr><th>EVENT / CATEGORY</th><th>EVENT DATE</th><th>EVENT HEAD/S</th><th>NEXT MILESTONE</th><th>PROGRESS</th><th>STATUS</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((e) => {
              const next = e.milestones.filter((m) => !m.done && m.due).sort((a, b) => a.due.localeCompare(b.due))[0];
              const complete = e.milestones.filter((m) => m.done).length;
              return (
                <tr key={e.id}>
                  <td>
                    <a className="eventname" href="#" onClick={(ev) => { ev.preventDefault(); onOpen(e); }}>{e.title}</a>
                    <span className="sub">{e.category}</span>
                  </td>
                  <td>
                    {fmt(e.start)}
                    {e.end && e.end !== e.start && <div className="sub">to {fmt(e.end)}</div>}
                  </td>
                  <td>{e.owner || 'Unassigned'}</td>
                  <td>
                    {next ? <>{next.name}<div className="sub">{fmt(next.due)}</div></> : 'No pending dated milestones'}
                  </td>
                  <td>
                    <span className="sub">{complete} of 9 complete</span>
                    <div className="progress"><span style={{ width: (complete / 9) * 100 + '%' }} /></div>
                  </td>
                  <td><Badge s={status(e)} /></td>
                  <td><button aria-label={'Open ' + e.title} onClick={() => onOpen(e)}>→</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">No events match your filters.</div>}
      </div>
    </div>
  );
}

function DeadlineTracker({ events, onOpen }: { events: HubEvent[]; onOpen: (e: HubEvent) => void }) {
  const [filter, setFilter] = useState('Pending');
  const tasks = useMemo(
    () =>
      events
        .flatMap((e) => e.milestones.map((m, i) => ({ e, m, i })))
        .sort((a, b) => Number(a.m.done) - Number(b.m.done) || (a.m.due || '9999').localeCompare(b.m.due || '9999')),
    [events],
  );
  const shown = tasks.filter(({ m }) => {
    const s = due(m);
    return filter === 'All' || (filter === 'Pending' ? s !== 'Complete' : s === filter);
  });

  return (
    <>
      <div className="notice">Dates are copied from the workbook. Completion is unconfirmed until recorded by your team. Missing or invalid Excel dates are shown as unscheduled.</div>
      <div className="panel">
        <div className="toolbar">
          <select aria-label="Deadline status" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {TASK_FILTERS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="wrap">
          <table>
            <thead>
              <tr><th>DELIVERABLE</th><th>EVENT</th><th>DUE DATE</th><th>STATUS</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map(({ e, m, i }) => (
                <tr key={e.id + '/' + i}>
                  <td><b>{m.name}</b></td>
                  <td>{e.title}<div className="sub">{e.owner || 'Unassigned'}</div></td>
                  <td>{fmt(m.due)}</td>
                  <td><Badge s={due(m)} /></td>
                  <td><button onClick={() => onOpen(e)}>Open →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CalendarView({ events, onOpen }: { events: HubEvent[]; onOpen: (e: HubEvent) => void }) {
  return (
    <>
      <div className="month">
        {MONTHS.map((month, i) => (
          <section key={month}>
            <h3>{month}</h3>
            {events
              .filter((e) => e.start && +e.start.slice(5, 7) === i + 1)
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((e) => (
                <button key={e.id} onClick={() => onOpen(e)}>
                  <b style={{ color: '#3453eb' }}>{e.start.slice(8)}</b> &nbsp;{e.title}
                </button>
              ))}
          </section>
        ))}
      </div>
      <div className="panel">
        <div className="panelhead"><h2>Dates to confirm</h2></div>
        <div className="toolbar">
          {events.filter((e) => !e.start).map((e) => <button key={e.id} onClick={() => onOpen(e)}>{e.title}</button>)}
        </div>
      </div>
    </>
  );
}

export function Workspace({ view, initialEvents }: { view: WorkspaceView; initialEvents: HubEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<HubEvent | null>(null);

  const total = events.length;
  const over = events.filter((e) => status(e) === 'Overdue').length;
  const soon = events.filter((e) => status(e) === 'Due soon').length;
  const tbd = events.filter((e) => !e.start).length;

  function exportCsv() {
    const rows: unknown[][] = [['Event', 'Category', 'Start', 'End', 'Event heads', 'Milestone', 'Due', 'Status', 'Completion date', 'Completed by', 'Notes', 'Registered', 'Attended']];
    events.forEach((e) =>
      e.milestones.forEach((m) =>
        rows.push([e.title, e.category, e.start, e.end, e.owner, m.name, m.due, due(m), m.completedAt, m.completedBy, m.notes, e.attendees, e.attendance]),
      ),
    );
    downloadCsv('HFSE_AY2027_Event_Monitoring.csv', rows);
  }

  return (
    <>
      <div className="titlebar">
        <div>
          <h1>{view === 'Overview' ? 'A little planning. A lot of HAPI.' : view}</h1>
          <p>{SUBTITLES[view]}</p>
        </div>
        <div className="actions">
          <button onClick={exportCsv}>↓ Export monitoring</button>
          <button className="primary" onClick={() => setEditing(blankEvent())}>＋ New event</button>
        </div>
      </div>

      {view === 'Overview' && (
        <>
          <div className="banner">
            <div>
              <span className="pill">HFSE EVENTS HUB</span>
              <h2 style={{ marginTop: 15 }}>Great experiences start with a clear plan.</h2>
              <p>Keep proposals, communications and post-event documentation moving together.</p>
            </div>
            <div className="art">2027<span style={{ color: '#ff7719' }}> ✳</span></div>
          </div>
          <div className="stats">
            {([
              [total, 'Events planned', 'All imported events', '▦'],
              [over, 'Overdue events', 'Incomplete milestones past their due date', '!'],
              [soon, 'Due within 2 weeks', 'Events needing attention soon', '◷'],
              [tbd, 'Dates to confirm', 'Set dates to complete the plan', '↗'],
            ] as const).map(([n, l, s, i]) => (
              <div className="stat" key={l}>
                <span className="ico">{i}</span>
                <div className="label">{l}</div>
                <strong>{n}</strong>
                <small>{s}</small>
              </div>
            ))}
          </div>
        </>
      )}

      {(view === 'Overview' || view === 'Events Database') && <EventTable events={events} onOpen={setEditing} />}
      {view === 'Deadline tracker' && <DeadlineTracker events={events} onOpen={setEditing} />}
      {view === 'Calendar' && <CalendarView events={events} onOpen={setEditing} />}

      <div className="foot">HFSE International School · AY2027 Events Hub &nbsp; · &nbsp; Deadlines use Singapore time</div>

      {editing && (
        <EventEditor
          key={editing.id}
          event={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEvents((list) => (list.some((e) => e.id === saved.id) ? list.map((e) => (e.id === saved.id ? saved : e)) : [...list, saved]));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
