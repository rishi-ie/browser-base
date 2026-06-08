// Main exports — programmatic API
export { Browser, createBrowser } from './server.js';
export type { ActResult, Action, SessionInfo } from './sessionManager.js';
export { SessionManager } from './sessionManager.js';

// Config
export { resolveConfig, validateConfig, getAvailableContexts, contextExists } from './config.js';
export type { Config, ResolvedConfig } from './config.js';

// Tool types and helpers (still useful for type safety)
export { defineTool, ok, err, requireSession } from './tools/tool.js';
export type { Tool, ToolResult } from './tools/tool.js';

// Logger
export { createLogger, createChildLogger } from './logger.js';
export type { LogLevel } from './logger.js';

// Re-export individual tools (for advanced usage)
export {
  startTool,
  endTool,
  useContextTool,
  navigateTool,
  actTool,
  observeTool,
  extractTool,
} from './tools/index.js';
