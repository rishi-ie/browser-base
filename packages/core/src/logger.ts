import pino, { Logger } from 'pino';

export type { Logger };
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Create a pino logger with the given verbosity level.
 * verbose: 0 = silent, 1 = info, 2 = debug
 */
export function createLogger(verbose: 0 | 1 | 2 = 0): Logger {
  const level: LogLevel = verbose === 0 ? 'silent' : verbose === 1 ? 'info' : 'debug';

  return pino({
    level,
    ...(level !== 'silent' ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    } : {}),
  });
}

/**
 * Create a child logger with a specific prefix.
 */
export function createChildLogger(parent: Logger, prefix: string): Logger {
  return parent.child({ prefix });
}