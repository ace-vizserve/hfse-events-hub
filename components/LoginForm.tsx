'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function LoginForm({ next, denied, microsoftFailed }: { next: string; denied: boolean; microsoftFailed: boolean }) {
  const [error, setError] = useState(
    denied ? 'This account does not have access to the Events Database.' : microsoftFailed ? 'Microsoft sign-in failed. Please try again.' : '',
  );
  const [busy, setBusy] = useState(false);

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setBusy(true);
    setError('');
    const { error: failed } = await createClient().auth.signInWithPassword({
      email: String(f.get('email')),
      password: String(f.get('password')),
    });
    if (failed) {
      setError('Incorrect email or password.');
      setBusy(false);
      return;
    }
    window.location.assign(next);
  }

  async function signInWithMicrosoft() {
    setBusy(true);
    setError('');
    const { error: failed } = await createClient().auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email',
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (failed) {
      setError('Microsoft sign-in failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="entrybrand"><b>H</b><strong>HFSE<span>EVENTS MONITORING CENTRE</span></strong></div>
      <form onSubmit={submit}>
        <div className="eyebrow">AUTHORISED PERSONNEL ONLY</div>
        <h1>Sign in</h1>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>Sign in</button>
        <button className="microsoft" type="button" onClick={signInWithMicrosoft} disabled={busy}>
          <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
            <path fill="#f25022" d="M0 0h10v10H0z" />
            <path fill="#7fba00" d="M11 0h10v10H11z" />
            <path fill="#00a4ef" d="M0 11h10v10H0z" />
            <path fill="#ffb900" d="M11 11h10v10H11z" />
          </svg>
          Sign in with Microsoft
        </button>
      </form>
    </div>
  );
}
