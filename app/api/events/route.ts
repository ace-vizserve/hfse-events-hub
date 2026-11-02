import { adminRoute, json, readJson } from '@/lib/api';
import { listEvents, saveEvent } from '@/lib/data';
import { parseEvent } from '@/lib/validate';

export const GET = adminRoute(async () => json(await listEvents()));

export const POST = adminRoute(async (req, _ctx, admin) => {
  const parsed = parseEvent(await readJson(req));
  if ('error' in parsed) return json({ error: parsed.error }, 400);

  await saveEvent(parsed.value, admin.email);
  const saved = (await listEvents()).find((e) => e.id === parsed.value.id);
  return json(saved);
});
