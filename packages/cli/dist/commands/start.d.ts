import { Command } from 'commander';
/**
 * Long-running server mode. Starts a Chrome session in the default
 * context and keeps the process alive.
 *
 *   - On startup, prints a JSON status blob to stdout (parseable by
 *     scripts / agents).
 *   - Logs progress to stderr.
 *   - Optionally exposes a small HTTP status server (--http-port)
 *     so other processes can poll `isActive` / `currentContext`
 *     without spinning up their own Chrome.
 *   - Wires SIGINT / SIGTERM to a clean shutdown.
 */
export declare const startCommand: Command;
//# sourceMappingURL=start.d.ts.map