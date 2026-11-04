import { LoginForm } from '@/components/LoginForm';
import { safeNext } from '@/lib/shared';

type Props = { searchParams: Promise<{ next?: string; denied?: string; failed?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, denied, failed } = await searchParams;
  return <LoginForm next={safeNext(next)} denied={denied === '1'} microsoftFailed={failed === '1'} />;
}
