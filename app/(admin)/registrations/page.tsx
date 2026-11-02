import { RegistrationsView } from '@/components/RegistrationsView';
import { requireAdminPage } from '@/lib/authorization';
import { listRegistrations } from '@/lib/data';

export default async function RegistrationsPage() {
  await requireAdminPage('/registrations');
  return <RegistrationsView initial={await listRegistrations()} />;
}
