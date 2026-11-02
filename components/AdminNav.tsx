'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const TABS = [
  ['/overview', 'Overview', '▦'],
  ['/events', 'Events Database', '▤'],
  ['/deadlines', 'Deadline tracker', '◷'],
  ['/calendar', 'Calendar', '▦'],
  ['/attendees', 'Attendees Portal', '↗'],
  ['/registrations', 'Registrations', '♙'],
  ['/', 'Home', '⌂'],
];

export function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  return (
    <nav>
      {TABS.map(([href, label, icon]) => (
        <button key={href} className={path === href ? 'active' : ''} onClick={() => router.push(href)}>
          <b>{icon}</b>
          {label}
        </button>
      ))}
    </nav>
  );
}

export function SignOutButton() {
  return (
    <button
      className="signout"
      onClick={async () => {
        await createClient().auth.signOut();
        window.location.assign('/');
      }}
    >
      Sign out
    </button>
  );
}
