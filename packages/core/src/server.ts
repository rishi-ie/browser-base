import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ResolvedConfig } from './config.js';
import { SessionManager } from './sessionManager.js';
import { TOOLS } from './tools/index.js';
import type { ToolResult } from './tools/tool.js';

/**
 * MCP server options.
 */
interface ServerOptions {
  name?: string;
  version?: string;
}

/**
 * Create and configure an MCP server with all tools.
 */
export function createServer(
  config: ResolvedConfig,
  options: ServerOptions = {}
): { server: McpServer; sessionManager: SessionManager } {
  const { name = 'browser-base', version = '0.1.0' } = options;

  // Create session manager
  const sessionManager = new SessionManager(config);

  // Create MCP server
  const server = new McpServer(
    { name, version },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any) => {
        const result = await tool.handler(sessionManager, args);
        return {
          content: result.content,
          isError: result.isError,
        } as CallToolResult;
      }
    );
  }

  return { server, sessionManager };
}