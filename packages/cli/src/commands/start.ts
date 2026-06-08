import { Command } from 'commander';
import * as http from 'http';
import { createBrowser, type Config } from '../core/index.js';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';

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
export const startCommand = new Command('start')
  .description('Start a long-running browser session (keeps Chrome alive)')
  .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
  .option('--model <model>', 'LLM model to use (overrides config)')
  .option('--headful', 'Run Chrome in headful mode (overrides config)')
  .option('--context <name>', 'Initial context to start in (overrides default)')
  .option('--http-port <port>', 'Expose a small HTTP status server on this port', (v) => parseInt(v, 10))
  .option('--http-host <host>', 'HTTP status server host (default localhost)', 'localhost')
  .action(async (opts) => {
    const { config: project, configPath } = await loadProjectConfig();

    const config: Config = toResolvedConfig({
      ...project,
      contextDir: opts.contextDir ?? project.contextDir,
      model: opts.model ?? project.model,
      headful: Boolean(opts.headful) || project.headful,
    });

    const initialContext = opts.context ?? project.defaultContext;
    const browser = createBrowser(config as any);

    let shuttingDown = false;
    const shutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      process.stderr.write(`\n[browser-base] ${signal} received, ending session...\n`);
      try { await browser.end(); } catch { /* ignore */ }
      if (httpServer) await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    let info;
    try {
      info = await browser.start(initialContext);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const available = browser.getAvailableContexts();
      const payload: Record<string, unknown> = { error: message, phase: 'start' };
      if (available.length > 0) payload['available'] = available;
      process.stderr.write(JSON.stringify(payload, null, 2) + '\n');
      process.exit(1);
    }

    const status = () => ({
      isActive: browser.isActive(),
      currentContext: browser.getCurrentContext(),
      availableContexts: browser.getAvailableContexts(),
      debugUrl: browser.getDebugUrl(),
      cdpUrl: `ws://localhost:${config.chromePort}`,
      configPath,
      resolved: {
        contextDir: config.contextDir,
        defaultContext: config.defaultContext,
        model: config.model,
        headful: config.headful,
        chromePort: config.chromePort,
      },
    });

    // Print startup status as a single JSON blob
    process.stdout.write(JSON.stringify({
      success: true,
      session: info,
      status: status(),
    }, null, 2) + '\n');

    process.stderr.write(
      `[browser-base] session live on context '${info.context}' (debug: ${info.debugUrl})\n` +
      `[browser-base] press Ctrl+C to end\n`
    );

    // Optional HTTP status server
    let httpServer: http.Server | null = null;
    if (opts.httpPort) {
      httpServer = http.createServer((req, res) => {
        if (req.url === '/status' || req.url === '/') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(status()));
        } else if (req.url === '/healthz') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: browser.isActive() }));
        } else {
          res.writeHead(404);
          res.end('not found');
        }
      });
      httpServer.listen(opts.httpPort, opts.httpHost, () => {
        process.stderr.write(
          `[browser-base] HTTP status server listening on http://${opts.httpHost}:${opts.httpPort}/status\n`
        );
      });
    }

    await new Promise(() => {});
  });
