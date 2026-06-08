import http from 'http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ResolvedConfig } from './config.js';

/**
 * Create the appropriate transport based on config.
 * - If port is set: HTTP transport (StreamableHTTPServerTransport)
 * - Otherwise: stdio transport (StdioServerTransport)
 */
export async function createTransport(
  config: ResolvedConfig
): Promise<StdioServerTransport | StreamableHTTPServerTransport> {
  if (config.port !== undefined) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    return transport;
  }

  return new StdioServerTransport();
}

/**
 * Create an HTTP server for the given transport.
 * This is useful when you need to start the HTTP server separately.
 */
export function createHttpServer(
  transport: StreamableHTTPServerTransport
): http.Server {
  return http.createServer();
}