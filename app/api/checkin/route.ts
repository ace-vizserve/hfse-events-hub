import { adminRoute, json, readJson } from '@/lib/api';
import { setAttendance } from '@/lib/data';
import { UUID_RE } from '@/lib/validate';

export const POST = adminRoute(async (req, _ctx, admin) => {
  const body = (await readJson(req)) as { id?: unknown; attended?: unknown } | null;
  if (typeof body?.id !== 'string' || !UUID_RE.test(body.id)) return json({ error: 'Invalid registration' }, 400);

  // The checker's identity comes from the verified session, never from the request.
  const saved = await setAttendance(body.id, !!body.attended, admin.email);
  if (!saved) return json({ error: 'Registration not found' }, 404);
  return json(saved);
});
