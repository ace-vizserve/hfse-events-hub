import { NextResponse } from 'next/server';
import { adminRoute, json } from '@/lib/api';
import { getFileName } from '@/lib/data';
import { createServiceClient } from '@/lib/supabase/server';
import { UUID_RE } from '@/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: 'File not found' }, 404);

  const key = 'files/' + id;
  // A file uploaded but not yet saved to an event has no metadata row, so it downloads under a generic name.
  const name = (await getFileName(key)) ?? 'attachment';
  const { data, error } = await createServiceClient().storage.from('hfse-events-hub-files').createSignedUrl(key, 60, { download: name });
  if (error) return json({ error: 'File not found' }, 404);

  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'cache-control': 'no-store' } });
});
