import { Logger } from 'pino';
export type { Logger };
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
/**
 * Create a pino logger with the given verbosity level.
 * verbose: 0 = info, 1 = debug, 2 = trace
 */
export declare function createLogger(verbose?: 0 | 1 | 2): Logger;
/**
 * Create a child logger with a specific prefix.
 */
export declare function createChildLogger(parent: Logger, prefix: string): Logger;
//# sourceMappingURL=logger.d.ts.map