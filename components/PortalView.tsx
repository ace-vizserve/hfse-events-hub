'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/lib/client';
import { fmt, type PortalEvent } from '@/lib/shared';
import { RegistrationDialog } from './RegistrationDialog';

export function PortalView({ events }: { events: PortalEvent[] }) {
  const router = useRouter();
  const [category, setCategory] = useState('All events');
  const [query, setQuery] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);

  const cats = ['All events', ...new Set(events.map((e) => e.category))];
  const list = events
    .filter((e) => (category === 'All events' || e.category === category) && e.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));

  return (
    <div className="portalwrap">
      <div className="portalbar">
        <div className="entrybrand" style={{ margin: 0 }}><b>H</b><strong>HFSE<span>ATTENDEES PORTAL</span></strong></div>
        <div className="actions">
          <button
            className="primary"
            onClick={() => (events.length ? setRegistering('') : toast('No events are open for registration yet.'))}
          >
            Register for an event
          </button>
          <button onClick={() => router.push('/')}>⌂ Home</button>
        </div>
      </div>
      <div className="eyebrow">OUR HAPI COMMUNITY</div>
      <h1 style={{ marginTop: 18 }}>Find your next HFSE experience.</h1>
      <p>Browse events and register here. International School for All.</p>
      <div className="portalcat">
        {cats.map((c) => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
            {c} <span className="sub">{events.filter((e) => c === 'All events' || e.category === c).length}</span>
          </button>
        ))}
      </div>
      <input
        className="search"
        style={{ width: '100%', marginBottom: 25 }}
        placeholder="Search events…"
        aria-label="Search events"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="cards">
        {list.map((e) => (
          <div className="card" key={e.id}>
            <div className="datebox">{fmt(e.start)}</div>
            <div className="sub" style={{ marginTop: 18 }}>{e.category}</div>
            <h3>{e.title}</h3>
            <p>{e.description || 'Join our HFSE community for this event. Please provide complete and accurate information when registering.'}</p>
            <p>⌖ {e.venue || 'Venue to be announced'}</p>
            <button className="primary" onClick={() => setRegistering(e.id)}>View details &amp; register →</button>
          </div>
        ))}
        {list.length === 0 &&
          (events.length ? (
            <div className="empty">No matching events.</div>
          ) : (
            <div className="empty" style={{ gridColumn: '1/-1' }}>Registration has not opened for any events yet. Please check back for updates.</div>
          ))}
      </div>
      <div className="foot">HFSE International School · Registration is saved directly in the Events Database.</div>
      {registering !== null && <RegistrationDialog events={events} initialId={registering} onClose={() => setRegistering(null)} />}
    </div>
  );
}
