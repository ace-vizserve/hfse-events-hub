import { adminRoute, json, readJson } from '@/lib/api';
import { MAX_FILE_BYTES } from '@/lib/shared';
import { createServiceClient } from '@/lib/supabase/server';

// Vercel limits function request bodies to about 4.5 MB, so the browser sends the file straight
// to private storage using this short-lived signed URL. The bucket also enforces the 20 MB limit.
export const POST = adminRoute(async (req) => {
  const body = (await readJson(req)) as { name?: unknown; size?: unknown } | null;
  const name = body?.name;
  const size = body?.size;
  if (typeof name !== 'string' || !name || name.length > 255 || typeof size !== 'number' || size > MAX_FILE_BYTES) {
    return json({ error: 'Choose a file up to 20 MB' }, 400);
  }

  const key = 'files/' + crypto.randomUUID();
  const { data, error } = await createServiceClient().storage.from('hfse-events-hub-files').createSignedUploadUrl(key);
  if (error) throw error;
  return json({ name, key, path: data.path, token: data.token });
});
