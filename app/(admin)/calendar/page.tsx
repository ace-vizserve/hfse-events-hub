import { Workspace } from '@/components/Workspace';
import { requireAdminPage } from '@/lib/authorization';
import { listEvents } from '@/lib/data';

export default async function CalendarPage() {
  await requireAdminPage('/calendar');
  return <Workspace view="Calendar" initialEvents={await listEvents()} />;
}
