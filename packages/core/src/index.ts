// Main exports
export { createServer } from './server.js';
export { SessionManager } from './sessionManager.js';
export { resolveConfig, validateConfig, getAvailableContexts, contextExists } from './config.js';
export type { Config } from './config.js';

// Tool types and helpers
export { defineTool, ok, err } from './tools/tool.js';
export type { Tool, ToolResult } from './tools/tool.js';

// Logger
export { createLogger, createChildLogger } from './logger.js';
export type { LogLevel } from './logger.js';

// Re-export tools
export {
  TOOLS,
  startTool,
  endTool,
  useContextTool,
  navigateTool,
  actTool,
  observeTool,
  extractTool,
} from './tools/index.js';