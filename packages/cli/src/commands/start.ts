import { Command } from 'commander';
import { createBrowser, resolveConfig, type Config } from '@browserbase/local';

export const startCommand = new Command('start')
  .description('Start the browser-base server (programmatic API)')
  .option('--headful', 'Run Chrome in headful (visible) mode')
  .option('--context-dir <path>', 'Path to browser-context directory', './browser-context')
  .option('--model <model>', 'LLM model to use', 'openai/gpt-4.1-mini')
  .option('--verbose <0|1|2>', 'Verbosity level', (v) => parseInt(v))
  .option('--default-context <name>', 'Default browser context', 'default')
  .option('--browser-path <path>', 'Path to Chrome binary')
  .option('--chrome-port <port>', 'Chrome remote debugging port', (v) => parseInt(v))
  .action(async (opts) => {
    // Load .env if exists
    const dotenv = await import('dotenv');
    dotenv.config();

    const configOpts: Partial<Config> = {
      headful: opts.headful,
      contextDir: opts.contextDir,
      model: opts.model,
      verbose: opts.verbose,
      defaultContext: opts.defaultContext,
      browserPath: opts.browserPath,
      chromePort: opts.chromePort,
    };

    const config = resolveConfig(configOpts);

    console.error('[browser-base] Starting browser session...');
    const browser = createBrowser(config);

    // List available contexts
    const contexts = browser.getAvailableContexts();
    console.error(`[browser-base] Available contexts: ${contexts.join(', ') || '(none)'}`);
    console.error(`[browser-base] Default context: ${config.defaultContext}`);

    // Start the default session
    try {
      const sessionInfo = await browser.start(config.defaultContext);
      console.error(`[browser-base] Session started:`);
      console.error(`  Context: ${sessionInfo.context}`);
      console.error(`  Debug URL: ${sessionInfo.debugUrl}`);
      console.error(`  CDP URL: ${sessionInfo.cdpUrl}`);
    } catch (error) {
      console.error(`[browser-base] Failed to start: ${error}`);
      process.exit(1);
    }

    // Keep the process alive
    console.error('[browser-base] Browser session is ready. Press Ctrl+C to exit.');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\n[browser-base] Shutting down...');
      await browser.end();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\n[browser-base] Shutting down...');
      await browser.end();
      process.exit(0);
    });

    // Keep alive indefinitely
    await new Promise(() => {});
  });
