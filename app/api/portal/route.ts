import { json, publicRoute } from '@/lib/api';
import { listPortalEvents } from '@/lib/data';

export const GET = publicRoute(async () => json(await listPortalEvents()));
