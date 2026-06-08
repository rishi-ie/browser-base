import { Command } from 'commander';
/**
 * Long-running command. Switches to a different browser context,
 * restarting the session in the process. Keeps the session alive
 * after switching so subsequent \`act\` / \`navigate\` etc. calls can
 * reuse it via \`--context\`.
 *
 * Signal handling tears the session down on Ctrl+C / SIGTERM.
 */
export declare const useContextCommand: Command;
//# sourceMappingURL=useContext.d.ts.map