'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { api, type ChatReply } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { formatDurationMs, formatNumber } from '@/lib/format';
import type { ProjectSummary } from '@/types/analytics';
import { MarkdownMessage } from './markdown-message';
import { Select } from './select';

interface MiniChatProps {
  projects: ProjectSummary[];
  /// Projeto pré-selecionado ao abrir (ex.: o filtro atual do dashboard).
  defaultProjectId?: string | null;
  /// Chamado após cada resposta, para o dashboard recarregar as métricas.
  onMessageSent?: () => void;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  meta?: ChatReply;
}

/**
 * Mini chat de IA em um drawer lateral (desliza da direita). Cada mensagem é
 * enviada ao provedor de IA (Hugging Face) via a API e registrada como um trace
 * observável, vinculado ao projeto escolhido no seletor do próprio chat.
 */
export function MiniChat({
  projects,
  defaultProjectId,
  onMessageSent,
}: MiniChatProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Carrega a lista de modelos disponíveis (allowlist do backend) uma vez.
  useEffect(() => {
    let active = true;
    api
      .chatModels()
      .then((info) => {
        if (active) {
          setModels(info.models);
          setModel((prev) => prev || info.default || info.models[0] || '');
        }
      })
      .catch(() => {
        // Sem a lista, o chat ainda funciona usando o modelo padrão do backend.
      });
    return () => {
      active = false;
    };
  }, []);

  // Define um projeto padrão quando a lista chega ou quando abre o chat.
  useEffect(() => {
    if (!projectId) {
      setProjectId(defaultProjectId || projects[0]?.id || '');
    }
  }, [projects, defaultProjectId, projectId]);

  // Auto-scroll para a última mensagem.
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, open]);

  // Fecha com a tecla Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const message = input.trim();
    if (!message || !projectId || sending) {
      return;
    }

    setError(null);
    setSending(true);
    setInput('');
    setTurns((prev) => [...prev, { role: 'user', text: message }]);

    try {
      const reply = await api.chat(projectId, message, model || undefined);
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            reply.reply ??
            'A chamada de IA falhou, mas foi registrada como um trace no dashboard.',
          meta: reply,
        },
      ]);
      onMessageSent?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha ao enviar a mensagem';
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const handleClear = (): void => {
    setTurns([]);
    setError(null);
  };

  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const canSend = Boolean(projectId) && !sending && input.trim().length > 0;

  return (
    <>
      {/* Botão flutuante para abrir o chat */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-24 z-20 flex items-center gap-8 rounded-full bg-emerald-pulse px-24 py-16 text-body font-medium text-snow"
        style={{ boxShadow: 'var(--shadow-subtle)' }}
        aria-label="Abrir mini chat de IA"
      >
        <span aria-hidden>💬</span>
        Mini chat de IA
      </button>

      {/* Overlay */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-forest-ink/20"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Drawer lateral (desliza da direita) */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-hairline bg-snow transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ boxShadow: 'var(--shadow-subtle)' }}
        aria-hidden={!open}
        aria-label="Mini chat de IA"
      >
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-b border-hairline p-24">
          <h2 className="font-[family-name:var(--font-inter-tight)] text-heading-sm font-semibold text-forest-ink">
            Mini chat de IA
          </h2>
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={handleClear}
              disabled={turns.length === 0 || sending}
              className="rounded-full border border-hairline px-16 py-8 text-caption text-forest-ink hover:bg-paper disabled:opacity-60"
            >
              Limpar conversa
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-hairline px-16 py-8 text-caption text-forest-ink hover:bg-paper"
            >
              Fechar
            </button>
          </div>
        </header>

        {/* Seletor de projeto: define a qual projeto o trace será vinculado */}
        <div className="flex flex-col gap-8 border-b border-hairline p-24">
          <label className="flex flex-col gap-8 text-caption text-graphite">
            Projeto vinculado
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full"
            >
              {projects.length === 0 ? <option value="">Nenhum projeto</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-8 text-caption text-graphite">
            Modelo de IA
            <Select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={models.length === 0}
              className="w-full font-[family-name:var(--font-ui-monospace)]"
            >
              {models.length === 0 ? <option value="">Modelo padrão</option> : null}
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </label>
          <span className="text-caption text-graphite">
            As mensagens abaixo serão registradas como traces em{' '}
            <span className="font-medium text-forest-ink">
              {selectedProject?.name ?? 'nenhum projeto'}
            </span>
            .
          </span>
        </div>

        {/* Mensagens */}
        <div className="flex flex-1 flex-col gap-16 overflow-y-auto p-24">
          {turns.length === 0 ? (
            <p className="text-body text-graphite">
              Envie uma mensagem para começar. Cada troca vira um trace observável no dashboard.
            </p>
          ) : null}

          {turns.map((turn, index) => (
            <div
              key={index}
              className={`flex flex-col gap-8 ${
                turn.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-16 py-8 text-body ${
                  turn.role === 'user'
                    ? 'bg-emerald-pulse text-snow'
                    : 'border border-hairline bg-paper text-forest-ink'
                }`}
              >
                {turn.role === 'assistant' ? (
                  <MarkdownMessage content={turn.text} />
                ) : (
                  turn.text
                )}
              </div>
              {turn.meta ? (
                <span className="flex flex-wrap gap-8 px-8 text-caption text-graphite">
                  <span className="font-[family-name:var(--font-ui-monospace)]">
                    {turn.meta.model}
                  </span>
                  <span>
                    {formatNumber(turn.meta.promptTokens + turn.meta.completionTokens)} tokens
                  </span>
                  <span>{formatDurationMs(turn.meta.latencyMs)}</span>
                </span>
              ) : null}
            </div>
          ))}

          {sending ? (
            <div className="flex items-start">
              <div className="rounded-2xl border border-hairline bg-paper px-16 py-8 text-body text-graphite">
                Gerando resposta…
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {/* Rodapé com o input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 border-t border-hairline p-24">
          {error ? <p className="text-caption text-signal-red">{error}</p> : null}
          <div className="flex items-center gap-8">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite uma mensagem para a IA…"
              disabled={sending || !projectId}
              className="flex-1 rounded-full border border-hairline bg-snow px-16 py-8 text-body text-forest-ink disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-full bg-emerald-pulse px-24 py-8 text-body font-medium text-snow disabled:opacity-60"
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
