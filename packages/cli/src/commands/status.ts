import { Command } from 'commander';
import { createBrowser, type Config } from '@browserbase/local';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';

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
export const statusCommand = new Command('status')
  .description('Print current browser-base configuration and session state as JSON')
  .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
  .option('--model <model>', 'LLM model to use (overrides config)')
  .option('--headful', 'Run Chrome in headful mode (overrides config)')
  .action(async (opts) => {
    const { config: project, configPath } = await loadProjectConfig();

    const config: Config = toResolvedConfig({
      ...project,
      contextDir: opts.contextDir ?? project.contextDir,
      model: opts.model ?? project.model,
      headful: Boolean(opts.headful) || project.headful,
    });

    const browser = createBrowser(config as any);
    const available = browser.getAvailableContexts();
    const isActive = browser.isActive();

    const payload = {
      configPath,
      resolved: {
        contextDir: config.contextDir,
        defaultContext: config.defaultContext,
        model: config.model,
        headful: config.headful,
        verbose: config.verbose,
        chromePort: config.chromePort,
      },
      isActive,
      currentContext: isActive ? browser.getCurrentContext() : null,
      availableContexts: available,
      debugUrl: isActive ? browser.getDebugUrl() : null,
      cdpUrl: isActive ? `ws://localhost:${config.chromePort}` : null,
    };

    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  });
