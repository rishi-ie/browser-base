import pino from 'pino';
/**
 * Create a pino logger with the given verbosity level.
 * verbose: 0 = info, 1 = debug, 2 = trace
 */
export function createLogger(verbose = 0) {
    const level = verbose === 0 ? 'info' : verbose === 1 ? 'debug' : 'debug';
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
export function createChildLogger(parent, prefix) {
    return parent.child({ prefix });
}
//# sourceMappingURL=logger.js.map