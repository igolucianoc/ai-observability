'use client';

import type { ReactElement } from 'react';
import { Dashboard } from '@/components/dashboard';
import { LoginForm } from '@/components/login-form';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage(): ReactElement {
  const auth = useAuth();

  if (auth.state === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-body text-graphite">Loading…</p>
      </main>
    );
  }

  if (auth.state === 'anonymous' || !auth.user) {
    return <LoginForm onSubmit={auth.login} error={auth.error} />;
  }

  return <Dashboard user={auth.user} onLogout={auth.logout} />;
}
