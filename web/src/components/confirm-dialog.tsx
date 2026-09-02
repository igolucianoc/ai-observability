'use client';

import { useEffect, useRef, type ReactElement } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /// Quando true, o botão de confirmação usa o estilo destrutivo (vermelho).
  destructive?: boolean;
  /// Desabilita as ações enquanto a confirmação está em andamento.
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmação modal alinhado ao design system da aplicação (mesmos
 * tokens de cor, raio, sombra e overlay usados no restante da UI). Substitui o
 * window.confirm nativo por uma experiência consistente e acessível: fecha com
 * Escape, foca o botão primário ao abrir e usa role="dialog".
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement | null {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Foca o botão primário ao abrir e fecha com Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-24"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-forest-ink/20"
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />

      {/* Card */}
      <div
        className="relative flex w-full max-w-md flex-col gap-24 rounded-2xl border border-hairline bg-snow p-32"
        style={{ boxShadow: 'var(--shadow-subtle)' }}
      >
        <div className="flex flex-col gap-8">
          <h2
            id="confirm-dialog-title"
            className="font-[family-name:var(--font-inter-tight)] text-heading-sm font-semibold text-forest-ink"
          >
            {title}
          </h2>
          <p id="confirm-dialog-description" className="text-body text-graphite">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-hairline px-24 py-8 text-body text-forest-ink hover:bg-paper disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              destructive
                ? 'rounded-full bg-signal-red px-24 py-8 text-body font-medium text-snow disabled:opacity-60'
                : 'rounded-full bg-emerald-pulse px-24 py-8 text-body font-medium text-snow disabled:opacity-60'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
