'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, toast } from '@/lib/client';
import type { PortalEvent } from '@/lib/shared';
import { RegistrationDialog } from './RegistrationDialog';

export function HomeView() {
  const router = useRouter();
  const [events, setEvents] = useState<PortalEvent[] | null>(null);

  async function openRegistration() {
    try {
      const list = await api<PortalEvent[]>('/api/portal');
      if (!list.length) return toast('No events are open for registration yet.');
      setEvents(list);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <div className="entry">
      <div className="entrybrand"><b>H</b><strong>HFSE<span>EVENTS MONITORING CENTRE</span></strong></div>
      <div className="eyebrow">ONE COMMUNITY. EVERY MILESTONE.</div>
      <h1>Meaningful events.<br />Every time.</h1>
      <p className="intro">Discover upcoming events and register your attendance.<br />Keep every proposal and post-event record clear and accountable.</p>
      <div className="entrycards">
        <section>
          <div className="eyebrow">FOR PARENTS &amp; ATTENDEES</div>
          <h2>Attendees Portal</h2>
          <p>Browse released events, view event details and register directly with HFSE.</p>
          <button className="primary" onClick={() => router.push('/attendees')}>Open Attendees Portal →</button>
          <button style={{ marginLeft: 8 }} onClick={openRegistration}>Register for an event</button>
          <small>Complete your registration within the system and receive an on-screen reference.</small>
        </section>
        <section>
          <div className="eyebrow">AUTHORISED PERSONNEL ONLY</div>
          <h2>Events Database</h2>
          <p>Maintain the events register, monitor deadlines and manage proposal-to-post-event documentation.</p>
          <button className="primary" onClick={() => router.push('/events')}>Open Events Database →</button>
          <small>Includes milestone tracking, supporting documents and attendee registration records. Administrator access is checked on the server.</small>
        </section>
      </div>
      <footer>HFSE International School · Office of Human Resources, Policies &amp; Compliance</footer>
      {events && <RegistrationDialog events={events} initialId="" onClose={() => setEvents(null)} />}
    </div>
  );
}
