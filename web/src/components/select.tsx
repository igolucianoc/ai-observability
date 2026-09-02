import { type CSSProperties, type ReactElement, type SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

// Aparência nativa removida (`appearance-none`) com uma seta (chevron)
// customizada. A imagem/posição vão via style inline (CSS puro) para não
// depender do parser de classes arbitrárias do Tailwind com data-URI, e o
// padding à direita (pr-40) reserva o espaço da seta. Centralizada aqui para
// que todos os selects da aplicação fiquem consistentes.
const baseClass =
  'cursor-pointer appearance-none rounded-full border border-hairline bg-snow py-8 pl-16 pr-40 text-body text-forest-ink disabled:opacity-60';

const chevronStyle: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233f6b52' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
};

/**
 * Select padrão da aplicação: aparência nativa removida e uma seta customizada
 * bem alinhada mesmo com bordas arredondadas. Aceita `className` extra (mesclada
 * ao final) e `style` extra (mesclado ao estilo da seta) para ajustes pontuais.
 */
export function Select({ className, style, ...props }: SelectProps): ReactElement {
  return (
    <select
      {...props}
      className={className ? `${baseClass} ${className}` : baseClass}
      style={{ ...chevronStyle, ...style }}
    />
  );
}
