# Observabilidade do próprio sistema

Este documento descreve como a **API observa a si mesma** — algo distinto dos traces de IA que ela
ingere como domínio. Os dois nunca se misturam: a auto-telemetria é escrita no stdout como logs
estruturados e **nunca** é ingerida como trace de domínio, então não há loop de observabilidade.

## Perguntas de plantão que isto responde

1. As rotas da API estão respondendo, e com que latência e taxa de erro?
2. Quando uma requisição falha, qual foi ela e qual o resultado?

## O que é capturado

Cada requisição emite uma linha de log JSON estruturada (`event: "http_request"`) com:

| Campo | Exemplo | Por quê |
|-------|---------|---------|
| `requestId` | `9f1c…` | Correlation id, também devolvido no header de resposta `x-request-id` |
| `method` | `POST` | RED — identidade da requisição |
| `route` | `/api/traces/:id` | **Template** da rota, não a URL crua (cardinalidade limitada) |
| `statusClass` | `2xx` / `4xx` / `5xx` | RED — erros, como classe de baixa cardinalidade |
| `durationMs` | `42` | RED — duração |
| `service`, `level`, `time` | — | Envelope padrão em toda linha |

Um header `x-request-id` de entrada é respeitado (para correlação entre serviços); caso contrário,
um novo id é gerado por requisição.

## O que NÃO é capturado

- **Nenhum segredo ou token.** `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`,
  `authorization`, `cookie`, `set-cookie` e os segredos JWT são redigidos por `redact()` antes de
  qualquer linha ser escrita.
- **Nenhuma PII em campos de métrica.** Ids de usuário, e-mails, URLs cruas e texto de mensagem de
  erro nunca são usados como labels `route`/`statusClass` (estourariam a cardinalidade e vazariam
  dados). A identidade do usuário, quando necessária, vai em um evento de log específico, não na
  linha agregada `http_request`.
- **Nenhum corpo de requisição ou resposta.** Payloads não são logados.
- **Nenhum status HTTP exato como label** — apenas a classe (`2xx`…), para manter o sinal
  agregável.

## Por que não há tracing distribuído (OpenTelemetry)

Omitido de propósito. Esta é uma API de serviço único, e o termo "trace" já significa uma execução
de IA no domínio do produto — emitir spans OTel traria pouco valor para um serviço só e ainda
convidaria à confusão com os traces de domínio. Logs estruturados com correlation id respondem às
perguntas de plantão aqui. Se o sistema crescer para múltiplos serviços, a auto-instrumentação do
OTel é o próximo passo natural.

## Como evita loops de observabilidade

O caminho de auto-observabilidade é apenas stdout. Ele não chama `POST /api/traces/ingest`, não
escreve no banco e não assina o stream SSE. Observar a API, portanto, não produz tráfego de domínio
que seria observado novamente.

## Configuração

- `LOG_LEVEL` (`debug` | `info` | `warn` | `error`, padrão `info`) controla o nível mínimo escrito.
