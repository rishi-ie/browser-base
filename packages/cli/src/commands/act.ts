import { Command } from 'commander';
import { createBrowser, type Config } from '../core/index.js';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';

export const actCommand = new Command('act')
  .description('Perform an action in the browser using natural language')
  .argument('<action>', 'Natural-language description of the action to perform')
  .option('--context <name>', 'Browser context to use (overrides default)')
  .option('--keep-alive', 'Do not end the session after the action (alias for BROWSER_BASE_KEEP_ALIVE=1)')
  .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
  .option('--model <model>', 'LLM model to use (overrides config)')
  .option('--headful', 'Run Chrome in headful mode (overrides config)')
  .action(async (action: string, opts) => {
    const { config: project, configPath } = await loadProjectConfig();
    const useContext = opts.context ?? project.defaultContext;
    const keepAlive = Boolean(opts.keepAlive) || process.env['BROWSER_BASE_KEEP_ALIVE'] === '1';

    const config: Config = toResolvedConfig({
      ...project,
      contextDir: opts.contextDir ?? project.contextDir,
      model: opts.model ?? project.model,
      headful: Boolean(opts.headful) || project.headful,
    });

    const browser = createBrowser(config as any);

    try {
      const sessionInfo = await browser.start(useContext);
      process.stderr.write(
        `[browser-base] acting on context '${sessionInfo.context}' (debug: ${sessionInfo.debugUrl})\n`
      );

      const result = await browser.act(action);

      process.stdout.write(JSON.stringify({
        success: result.success,
        message: result.message,
        actionDescription: result.actionDescription,
        actions: result.actions,
        cacheStatus: result.cacheStatus,
        context: sessionInfo.context,
        configPath,
      }, null, 2) + '\n');

      if (!result.success) {
        process.exitCode = 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(JSON.stringify({ error: message }, null, 2) + '\n');
      process.exitCode = 1;
    } finally {
      if (!keepAlive) {
        try { await browser.end(); } catch { /* ignore */ }
      }
    }
  });
