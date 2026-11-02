import { Workspace } from '@/components/Workspace';
import { requireAdminPage } from '@/lib/authorization';
import { listEvents } from '@/lib/data';

export default async function DeadlinesPage() {
  await requireAdminPage('/deadlines');
  return <Workspace view="Deadline tracker" initialEvents={await listEvents()} />;
}
