import { Workspace } from '@/components/Workspace';
import { requireAdminPage } from '@/lib/authorization';
import { listEvents } from '@/lib/data';

export default async function EventsPage() {
  await requireAdminPage('/events');
  return <Workspace view="Events Database" initialEvents={await listEvents()} />;
}
