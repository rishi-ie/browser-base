import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransport } from './transport.js';
import { resolveConfig } from './config.js';
import type { Config } from './config.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(function() {
    return {
      start: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(function(this: { port?: number }, opts: { port: number }) {
    this.port = opts.port;
    return {
      start: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

describe('transport', () => {
  let mockServer: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = new Server({} as any, {} as any);
  });

  it('selects stdio transport when no port', async () => {
    const config: Config = {
      browserContextDir: '/tmp',
      headless: true,
      strict: true,
      logLevel: 'info',
    };

    const transport = await createTransport(config, mockServer);

    expect(transport).toBeInstanceOf(StdioServerTransport);
  });

  it('selects HTTP transport when port set', async () => {
    const config: Config = {
      browserContextDir: '/tmp',
      port: 8080,
      headless: true,
      strict: true,
      logLevel: 'info',
    };

    const transport = await createTransport(config, mockServer);

    expect(transport).toBeInstanceOf(StreamableHTTPServerTransport);
  });

  it('passes correct port to HTTP transport', async () => {
    const config: Config = {
      browserContextDir: '/tmp',
      port: 3000,
      headless: true,
      strict: true,
      logLevel: 'info',
    };

    const transport = await createTransport(config, mockServer) as any;

    expect(transport.port).toBe(3000);
  });

  it('uses stdio for undefined port', async () => {
    const config: Config = {
      browserContextDir: '/tmp',
      port: undefined,
      headless: true,
      strict: true,
      logLevel: 'info',
    };

    const transport = await createTransport(config, mockServer);

    expect(transport).toBeInstanceOf(StdioServerTransport);
  });
});
