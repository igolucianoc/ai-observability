import { redact } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogFields {
  event: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Minimal structured (JSON) logger. Emits one JSON object per line with a
 * stable `event` name, a level, a timestamp and the bound context (e.g. a
 * requestId). Sensitive fields are redacted before serialization.
 */
export class StructuredLogger {
  constructor(
    private readonly context: Record<string, unknown> = {},
    private readonly minLevel: LogLevel = 'info',
  ) {}

  /// Returns a logger that carries additional context on every line.
  child(context: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({ ...this.context, ...context }, this.minLevel);
  }

  debug(fields: LogFields): void {
    this.write('debug', fields);
  }
  info(fields: LogFields): void {
    this.write('info', fields);
  }
  warn(fields: LogFields): void {
    this.write('warn', fields);
  }
  error(fields: LogFields): void {
    this.write('error', fields);
  }

  private write(level: LogLevel, fields: LogFields): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) {
      return;
    }
    const line = {
      level,
      time: new Date().toISOString(),
      ...this.context,
      ...(redact(fields) as Record<string, unknown>),
    };

    console.log(JSON.stringify(line));
  }
}

export const rootLogger = new StructuredLogger(
  { service: 'ai-observability-api' },
  (process.env.LOG_LEVEL as LogLevel) || 'info',
);
