import 'server-only';
import { redirect } from 'next/navigation';
import { createServiceClient, createSessionClient } from './supabase/server';

export type Admin = { id: string; email: string; role: string };

// getUser() verifies the session with Supabase Auth rather than trusting the cookie's contents.
export async function getSessionUser() {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

async function adminFor(user: { id: string; email?: string }): Promise<Admin | null> {
  const { data, error } = await createServiceClient().from('hfse_events_hub_event_admins').select('role').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data ? { id: user.id, email: user.email ?? user.id, role: data.role } : null;
}

export async function getAdmin(): Promise<Admin | null> {
  const user = await getSessionUser();
  return user ? adminFor(user) : null;
}

export async function requireAdminPage(path: string): Promise<Admin> {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(path));
  const admin = await adminFor(user);
  if (!admin) redirect('/login?denied=1');
  return admin;
}
