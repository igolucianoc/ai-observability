import { type ReactElement, type ReactNode } from 'react';

interface MarkdownMessageProps {
  content: string;
}

/**
 * Renderizador leve de Markdown para as respostas do chat de IA. Cobre o
 * subconjunto que os modelos costumam produzir: títulos, negrito, itálico,
 * código inline, listas com marcador e numeradas, e parágrafos separados por
 * linha em branco.
 *
 * Não usa dangerouslySetInnerHTML: todo o texto é inserido como nós React, de
 * modo que qualquer HTML vindo do modelo é tratado como texto (sem risco de XSS).
 */
export function MarkdownMessage({ content }: MarkdownMessageProps): ReactElement {
  const blocks = parseBlocks(content);
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

/// Agrupa as linhas do texto em blocos (títulos, listas, parágrafos).
function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };
  const flushList = (): void => {
    if (list && list.items.length > 0) {
      blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1].trim());
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1].trim());
      continue;
    }

    // Linha comum: acumula no parágrafo atual (encerra lista se houver).
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderBlock(block: Block, key: number): ReactElement {
  if (block.type === 'heading') {
    return (
      <p
        key={key}
        className="font-[family-name:var(--font-inter-tight)] text-body font-semibold text-forest-ink"
      >
        {renderInline(block.text)}
      </p>
    );
  }

  if (block.type === 'list') {
    const items = block.items.map((item, index) => (
      <li key={index}>{renderInline(item)}</li>
    ));
    return block.ordered ? (
      <ol key={key} className="flex list-decimal flex-col gap-8 pl-16">
        {items}
      </ol>
    ) : (
      <ul key={key} className="flex list-disc flex-col gap-8 pl-16">
        {items}
      </ul>
    );
  }

  return <p key={key}>{renderInline(block.text)}</p>;
}

/// Aplica a formatação inline: negrito, itálico e código inline.
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-forest-ink">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded-md bg-paper px-8 font-[family-name:var(--font-ui-monospace)] text-caption"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = pattern.lastIndex;
    key += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
