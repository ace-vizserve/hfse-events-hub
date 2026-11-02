import { LoginForm } from '@/components/LoginForm';

type Props = { searchParams: Promise<{ next?: string; denied?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, denied } = await searchParams;
  // Only same-site paths, so a crafted link cannot send someone elsewhere after sign-in.
  const safeNext = next && /^\/(?![/\\])/.test(next) ? next : '/events';
  return <LoginForm next={safeNext} denied={denied === '1'} />;
}
