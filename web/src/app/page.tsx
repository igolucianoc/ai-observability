import type { ReactElement } from 'react';
import { StatusPill } from '@/components/status-pill';

export default function HomePage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-[var(--page-max-width)] flex-col items-center justify-center gap-32 px-24 py-96 text-center">
      <StatusPill label="Bootstrap ready" />

      <h1
        className="max-w-3xl font-[family-name:var(--font-inter-tight)] text-heading-lg font-semibold tracking-tight text-forest-ink sm:text-display sm:leading-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #007a55, #00bc7d, #f59e0b)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        AI Observability Hub
      </h1>

      <p className="max-w-xl text-body text-graphite">
        Tracing, tokens, cost, latency and metrics for AI applications.
      </p>

      <a
        href="/api/health"
        className="inline-flex items-center gap-8 rounded-full bg-emerald-pulse px-24 py-8 text-body font-medium text-snow"
        style={{ boxShadow: 'var(--shadow-subtle)' }}
      >
        Check API health
      </a>
    </main>
  );
}
