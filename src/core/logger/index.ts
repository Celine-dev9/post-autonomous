export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogContext {
  runId?: string;
  jobId?: string;
  platform?: string;
  topic?: string;
  stage?: string;
  [key: string]: unknown;
}

// Patterns that identify secrets and sensitive credentials for scrubbing
const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /key/i,
  /auth/i,
  /credential/i,
  /bearer/i,
  /signature/i,
];

export class Logger {
  private level: LogLevel;
  private defaultContext: LogContext;

  constructor(level: LogLevel = 'info', defaultContext: LogContext = {}) {
    this.level = level;
    this.defaultContext = defaultContext;
  }

  public child(context: LogContext): Logger {
    return new Logger(this.level, { ...this.defaultContext, ...context });
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }

  private sanitize(obj: unknown, depth = 0): unknown {
    if (depth > 6) return '[DeeplyNested]';
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      // Mask bearer tokens
      if (/bearer\s+[a-z0-9_\-\.]+/i.test(obj)) {
        return obj.replace(/bearer\s+([a-z0-9_\-\.]+)/gi, 'Bearer ***MASKED***');
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitive && typeof value === 'string' && value.length > 0) {
          sanitized[key] = '***MASKED***';
        } else {
          sanitized[key] = this.sanitize(value, depth + 1);
        }
      }
      return sanitized;
    }

    return obj;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.defaultContext, ...meta };
    const sanitizedMeta = this.sanitize(mergedContext) as Record<string, unknown>;

    const hasMeta = Object.keys(sanitizedMeta).length > 0;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    let contextStr = '';
    if (sanitizedMeta.runId) contextStr += ` [Run:${sanitizedMeta.runId}]`;
    if (sanitizedMeta.platform) contextStr += ` [${sanitizedMeta.platform}]`;
    if (sanitizedMeta.stage) contextStr += ` [${sanitizedMeta.stage}]`;

    const formattedMessage = `${prefix}${contextStr} ${message}`;

    if (level === 'error') {
      console.error(formattedMessage, hasMeta ? sanitizedMeta : '');
    } else if (level === 'warn') {
      console.warn(formattedMessage, hasMeta ? sanitizedMeta : '');
    } else if (level === 'debug') {
      console.debug(formattedMessage, hasMeta ? sanitizedMeta : '');
    } else {
      console.log(formattedMessage, hasMeta ? sanitizedMeta : '');
    }
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
