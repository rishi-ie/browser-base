import { Command } from 'commander';
/**
 * Status command. Returns a JSON blob describing the configured and
 * actual state of the browser-base CLI:
 *
 *   {
 *     configPath: '/abs/path/to/.browser-base/browser-base.json',
 *     resolved: { contextDir, defaultContext, model, headful, ... },
 *     isActive: false,
 *     currentContext: null,
 *     availableContexts: ['default', 'github'],
 *     debugUrl: null,
 *     cdpUrl: null
 *   }
 *
 * Importantly, \`status\` does NOT start a Chrome session — it only
 * reports on the configuration and the (potential) state of an
 * already-running session that the caller has wired up out-of-band.
 */
export declare const statusCommand: Command;
//# sourceMappingURL=status.d.ts.map