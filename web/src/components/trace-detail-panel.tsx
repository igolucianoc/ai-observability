'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { api } from '@/lib/api';
import { formatCostUsd, formatDateTime, formatDurationMs, formatNumber } from '@/lib/format';
import type { TraceDetail, TraceDetailSpan } from '@/types/analytics';
import { StatusBadge } from './status-badge';

interface TraceDetailPanelProps {
  traceId: string | null;
  onClose: () => void;
}

function SpanRow({ span }: { span: TraceDetailSpan }): ReactElement {
  const indent = span.parentSpanId ? 16 : 0;
  return (
    <div
      className="flex flex-col gap-8 border-b border-hairline py-16 last:border-b-0"
      style={{ paddingLeft: indent }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="rounded-md bg-paper px-8 py-8 text-caption text-graphite">
            {span.kind}
          </span>
          <span className="font-medium text-forest-ink">{span.name}</span>
        </div>
        <div className="flex items-center gap-16">
          <span className="text-caption text-graphite">{formatDurationMs(span.durationMs)}</span>
          <StatusBadge status={span.status} />
        </div>
      </div>
      {span.llmCall ? (
        <div className="flex flex-wrap gap-16 text-caption text-graphite">
          <span className="font-[family-name:var(--font-ui-monospace)]">
            {span.llmCall.provider}/{span.llmCall.model}
          </span>
          {span.llmCall.usage ? (
            <span>{formatNumber(span.llmCall.usage.totalTokens)} tokens</span>
          ) : null}
          <span>{formatCostUsd(span.llmCall.costUsd)}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Slide-in panel with the full detail of a single trace: header metrics, the
 * span tree, and any captured errors. Fetches on demand when a trace is picked.
 */
export function TraceDetailPanel({ traceId, onClose }: TraceDetailPanelProps): ReactElement | null {
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    if (!traceId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setExplanation(null);
    api
      .traceDetail(traceId)
      .then((result) => {
        if (active) {
          setDetail(result);
        }
      })
      .catch(() => {
        if (active) {
          setError('Falha ao carregar o detalhe do trace.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [traceId]);

  const handleExplain = async (): Promise<void> => {
    if (!traceId) {
      return;
    }
    setExplaining(true);
    try {
      const result = await api.explainTrace(traceId);
      setExplanation(result.explanation);
    } catch {
      setExplanation('Could not generate an explanation right now.');
    } finally {
      setExplaining(false);
    }
  };

  if (!traceId) {
    return null;
  }

  return (
    <aside
      className="fixed right-0 top-0 z-10 flex h-full w-full max-w-xl flex-col gap-24 overflow-y-auto border-l border-hairline bg-snow p-32"
      style={{ boxShadow: 'var(--shadow-subtle)' }}
      aria-label="Detalhe do trace"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-[family-name:var(--font-inter-tight)] text-heading-sm font-semibold text-forest-ink">
          {detail?.name ?? 'Detalhe do trace'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-hairline px-16 py-8 text-caption text-forest-ink hover:bg-paper"
        >
          Fechar
        </button>
      </div>

      {loading ? <p className="text-body text-graphite">Carregando…</p> : null}
      {error ? <p className="text-body text-signal-red">{error}</p> : null}

      {detail ? (
        <>
          <div className="flex flex-wrap gap-24 text-caption text-graphite">
            <StatusBadge status={detail.status} />
            <span>{formatDateTime(detail.startedAt)}</span>
            <span>{formatDurationMs(detail.durationMs)}</span>
            <span>{formatNumber(detail.totalTokens)} tokens</span>
            <span className="font-medium text-forest-ink">{formatCostUsd(detail.totalCostUsd)}</span>
          </div>

          <section className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h3 className="text-caption font-medium uppercase text-graphite">AI explanation</h3>
              <button
                type="button"
                onClick={handleExplain}
                disabled={explaining}
                className="rounded-full bg-emerald-pulse px-16 py-8 text-caption font-medium text-snow disabled:opacity-60"
              >
                {explaining ? 'Analyzing…' : 'Explain with AI'}
              </button>
            </div>
            {explanation ? (
              <p className="rounded-2xl border border-hairline bg-mint-mist p-16 text-body text-forest-ink">
                {explanation}
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-8">
            <h3 className="text-caption font-medium uppercase text-graphite">Spans</h3>
            <div className="rounded-2xl border border-hairline px-16">
              {detail.spans.map((span) => (
                <SpanRow key={span.id} span={span} />
              ))}
            </div>
          </section>

          {detail.errors.length > 0 ? (
            <section className="flex flex-col gap-8">
              <h3 className="text-caption font-medium uppercase text-graphite">Erros</h3>
              {detail.errors.map((err, index) => (
                <div
                  key={`${err.kind}-${index}`}
                  className="rounded-md border border-hairline bg-[#fef2f2] p-16 text-caption text-signal-red"
                >
                  <span className="font-medium">{err.kind}</span>
                  {err.code ? <span> ({err.code})</span> : null}: {err.message}
                </div>
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
