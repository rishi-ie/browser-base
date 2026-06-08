import { Command } from 'commander';
import { createBrowser } from '../core/index.js';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';
/**
 * Long-running command. Switches to a different browser context,
 * restarting the session in the process. Keeps the session alive
 * after switching so subsequent \`act\` / \`navigate\` etc. calls can
 * reuse it via \`--context\`.
 *
 * Signal handling tears the session down on Ctrl+C / SIGTERM.
 */
export const useContextCommand = new Command('use-context')
    .description('Switch to a named browser context and keep the session alive')
    .argument('<name>', 'Context name to switch to (must already exist)')
    .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
    .option('--model <model>', 'LLM model to use (overrides config)')
    .option('--headful', 'Run Chrome in headful mode (overrides config)')
    .action(async (name, opts) => {
    const { config: project } = await loadProjectConfig();
    const config = toResolvedConfig({
        ...project,
        contextDir: opts.contextDir ?? project.contextDir,
        model: opts.model ?? project.model,
        headful: Boolean(opts.headful) || project.headful,
    });
    const browser = createBrowser(config);
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        process.stderr.write(`\n[browser-base] ${signal} received, ending session...\n`);
        try {
            await browser.end();
        }
        catch { /* ignore */ }
        process.exit(0);
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    try {
        const info = await browser.useContext(name);
        process.stdout.write(JSON.stringify({
            success: true,
            context: info.context,
            debugUrl: info.debugUrl,
            cdpUrl: info.cdpUrl,
            isActive: browser.isActive(),
        }, null, 2) + '\n');
        process.stderr.write(`[browser-base] switched to context '${info.context}'. Session is alive; press Ctrl+C to end.\n`);
        // Keep the process alive
        await new Promise(() => { });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const available = browser.getAvailableContexts();
        const payload = { error: message };
        if (available.length > 0)
            payload['available'] = available;
        process.stderr.write(JSON.stringify(payload, null, 2) + '\n');
        process.exitCode = 1;
    }
});
//# sourceMappingURL=useContext.js.map