import { Command } from 'commander';
import { createBrowser, type Config } from '@browserbase/local';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';

export const navigateCommand = new Command('navigate')
  .description('Navigate the browser to a URL')
  .argument('<url>', 'URL to navigate to')
  .option('--context <name>', 'Browser context to use (overrides default)')
  .option('--keep-alive', 'Do not end the session after navigation')
  .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
  .option('--model <model>', 'LLM model to use (overrides config)')
  .option('--headful', 'Run Chrome in headful mode (overrides config)')
  .action(async (url: string, opts) => {
    const { config: project } = await loadProjectConfig();
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
      await browser.navigate(url);

      process.stdout.write(JSON.stringify({
        success: true,
        url,
        context: sessionInfo.context,
        debugUrl: sessionInfo.debugUrl,
      }, null, 2) + '\n');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(JSON.stringify({ error: message, url }, null, 2) + '\n');
      process.exitCode = 1;
    } finally {
      if (!keepAlive) {
        try { await browser.end(); } catch { /* ignore */ }
      }
    }
  });
