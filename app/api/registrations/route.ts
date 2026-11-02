import { adminRoute, json } from '@/lib/api';
import { listRegistrations } from '@/lib/data';

export const GET = adminRoute(async () => json(await listRegistrations()));
