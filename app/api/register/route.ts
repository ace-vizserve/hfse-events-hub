import { json, publicRoute, readJson } from '@/lib/api';
import { createRegistration, getOpenEvent } from '@/lib/data';
import { parseRegistration } from '@/lib/validate';

export const POST = publicRoute(async (req) => {
  const body = (await readJson(req)) as { eventId?: unknown } | null;
  const event = typeof body?.eventId === 'string' ? await getOpenEvent(body.eventId) : null;
  if (!event) return json({ error: 'This event is not open for registration.' }, 400);

  const parsed = parseRegistration(body, event.sessions ?? []);
  if ('error' in parsed) return json({ error: parsed.error }, 400);

  const reference = await createRegistration(event, parsed.value);
  return json({ reference, eventTitle: event.title }, 201);
});
