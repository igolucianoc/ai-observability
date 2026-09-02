'use client';

import { useState, type FormEvent, type ReactElement } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
}

/**
 * Centered login card. Pre-fills the demo credentials to make the portfolio
 * demo easy to explore.
 */
export function LoginForm({ onSubmit, error }: LoginFormProps): ReactElement {
  const [email, setEmail] = useState('demo@ai-observability.dev');
  const [password, setPassword] = useState('demo-password-123');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch {
      // error surfaced via the `error` prop
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-24">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-24 rounded-2xl border border-hairline bg-snow p-32"
        style={{ boxShadow: 'var(--shadow-subtle)' }}
      >
        <h1
          className="font-[family-name:var(--font-inter-tight)] text-heading font-semibold text-transparent bg-clip-text"
          style={{
            backgroundImage:
              'linear-gradient(105deg, var(--color-pine) 0%, var(--color-emerald-pulse) 40%, #a3a02f 100%)',
          }}
        >
          AI Observability Hub
        </h1>
        <label className="flex flex-col gap-8 text-caption text-graphite">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-hairline px-16 py-8 text-body text-forest-ink"
            required
          />
        </label>
        <label className="flex flex-col gap-8 text-caption text-graphite">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-hairline px-16 py-8 text-body text-forest-ink"
            required
          />
        </label>
        {error ? <p className="text-caption text-signal-red">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-pulse px-24 py-8 text-body font-medium text-snow disabled:opacity-60"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
