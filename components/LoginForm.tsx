'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function LoginForm({ next, denied }: { next: string; denied: boolean }) {
  const [error, setError] = useState(denied ? 'This account does not have access to the Events Database.' : '');
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
      </form>
    </div>
  );
}
