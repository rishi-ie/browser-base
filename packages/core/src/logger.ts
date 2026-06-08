import pino, { Logger } from 'pino';

export type { Logger };
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Create a pino logger with the given verbosity level.
 * verbose: 0 = info, 1 = debug, 2 = trace
 */
export function createLogger(verbose: 0 | 1 | 2 = 0): Logger {
  const level: LogLevel = verbose === 0 ? 'info' : verbose === 1 ? 'debug' : 'debug';

  return pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}

/**
 * Create a child logger with a specific prefix.
 */
export function createChildLogger(
  parent: Logger,
  prefix: string
): Logger {
  return parent.child({ prefix });
}