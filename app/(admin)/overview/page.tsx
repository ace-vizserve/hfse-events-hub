import { Workspace } from '@/components/Workspace';
import { requireAdminPage } from '@/lib/authorization';
import { listEvents } from '@/lib/data';

export default async function OverviewPage() {
  await requireAdminPage('/overview');
  return <Workspace view="Overview" initialEvents={await listEvents()} />;
}
