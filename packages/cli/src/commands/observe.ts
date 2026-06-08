import { Command } from 'commander';
import { createBrowser, type Config } from '../core/index.js';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';

export const observeCommand = new Command('observe')
  .description('Observe actionable elements on the current page')
  .argument('[instruction]', 'Optional natural-language filter / instruction')
  .option('--context <name>', 'Browser context to use (overrides default)')
  .option('--keep-alive', 'Do not end the session after observing')
  .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
  .option('--model <model>', 'LLM model to use (overrides config)')
  .option('--headful', 'Run Chrome in headful mode (overrides config)')
  .action(async (instruction: string | undefined, opts) => {
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
      const actions = await browser.observe(instruction);

      process.stdout.write(JSON.stringify({
        actions,
        context: sessionInfo.context,
        instruction: instruction ?? null,
      }, null, 2) + '\n');
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
