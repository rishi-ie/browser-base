import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Config } from './config.js';

export async function createTransport(
  config: Config,
  server: Server
): Promise<StdioServerTransport | StreamableHTTPServerTransport> {
  if (config.port) {
    const transport = new StreamableHTTPServerTransport({
      port: config.port,
    });
    return transport;
  }

  return new StdioServerTransport();
}
