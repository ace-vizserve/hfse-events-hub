import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/shared';
import { createSessionClient } from '@/lib/supabase/server';

// Microsoft sign-in returns here. This only starts the session: pages and API routes
// still require a row in hfse_events_hub_event_admins.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(searchParams.get('next')), request.url));
    console.error('Microsoft sign-in failed', error.code ?? error.message);
  }
  return NextResponse.redirect(new URL('/login?failed=1', request.url));
}
