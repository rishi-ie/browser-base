import { Command } from 'commander';
import { createServer } from '@browserbase/local';
import { loadConfig } from '@browserbase/local/config';

export const startCommand = new Command('start')
  .description('Start the browser-base MCP server')
  .option('--headful', 'Run Chrome in headful (visible) mode')
  .option('--context-dir <path>', 'Path to browser-context directory', './browser-context')
  .option('--port <port>', 'HTTP transport port (omit for stdio)', (v) => parseInt(v))
  .option('--host <host>', 'HTTP host', 'localhost')
  .option('--model <model>', 'LLM model to use', 'openai/gpt-4.1-mini')
  .option('--verbose <0|1|2>', 'Verbosity level', (v) => parseInt(v))
  .option('--default-context <name>', 'Default browser context', 'default')
  .option('--browser-path <path>', 'Path to Chrome binary')
  .action(async (opts) => {
    // Load .env if exists
    import('dotenv').then(dotenv => dotenv.config());
    
    const config = {
      headful: opts.headful ?? process.env.BROWSER_BASE_HEADFUL === '1',
      contextDir: opts.contextDir ?? process.env.BROWSER_BASE_CONTEXT_DIR ?? './browser-context',
      port: opts.port ?? (process.env.BROWSER_BASE_PORT ? parseInt(process.env.BROWSER_BASE_PORT) : undefined),
      host: opts.host ?? 'localhost',
      model: opts.model ?? process.env.BROWSER_BASE_MODEL ?? 'openai/gpt-4.1-mini',
      verbose: opts.verbose ?? (process.env.BROWSER_BASE_VERBOSE ? parseInt(process.env.BROWSER_BASE_VERBOSE) : 1),
      defaultContext: opts.defaultContext ?? process.env.BROWSER_BASE_DEFAULT_CONTEXT ?? 'default',
      browserPath: opts.browserPath ?? process.env.BROWSER_BASE_BROWSER_PATH,
    };
    
    console.error('[browser-base] Starting MCP server...');
    const { server, sessionManager } = createServer(config);
    
    if (config.port) {
      // HTTP transport
      const http = await import('http');
      const transport = new (await import('@modelcontextprotocol/sdk')).StreamableHTTPServerTransport({
        server: http.createServer(),
        port: config.port,
        host: config.host,
      });
      await server.connect(transport);
      console.error(`[browser-base] HTTP server listening on http://${config.host}:${config.port}/mcp`);
    } else {
      // stdio transport
      const transport = new (await import('@modelcontextprotocol/sdk')).StdioServerTransport();
      await server.connect(transport);
      console.error('[browser-base] MCP server connected over stdio');
    }
    
    // Log available contexts
    const contexts = sessionManager.getAvailableContexts();
    console.error(`[browser-base] Available contexts: ${contexts.join(', ') || '(none)'}`);
    console.error(`[browser-base] Default context: ${config.defaultContext}`);
  });
