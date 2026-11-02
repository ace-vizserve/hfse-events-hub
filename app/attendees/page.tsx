import { PortalView } from '@/components/PortalView';
import { listPortalEvents } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AttendeesPage() {
  return <PortalView events={await listPortalEvents()} />;
}
