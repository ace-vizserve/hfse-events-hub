import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { getAdmin, type Admin } from './authorization';

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });

// Writes must come from this site. Cookies alone would allow cross-site form posts.
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

function guarded<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) return json({ error: 'Invalid origin' }, 403);
      return await handler(req, ctx);
    } catch (e) {
      console.error(req.method, req.nextUrl.pathname, e);
      return json({ error: 'Unable to complete request. Please try again.' }, 500);
    }
  };
}

export const publicRoute = guarded;

export function adminRoute<C>(handler: (req: NextRequest, ctx: C, admin: Admin) => Promise<Response>): Handler<C> {
  return guarded(async (req, ctx) => {
    const admin = await getAdmin();
    if (!admin) return json({ error: 'Authorised event administrators only' }, 403);
    return handler(req, ctx, admin);
  });
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
