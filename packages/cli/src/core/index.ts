// Main exports — programmatic API
export { Browser, createBrowser } from './server.js';
export type { ActResult, Action, SessionInfo } from './sessionManager.js';
export { SessionManager } from './sessionManager.js';

// Config
export { resolveConfig, validateConfig, getAvailableContexts, contextExists } from './config.js';
export type { Config, ResolvedConfig } from './config.js';

// Logger
export { createLogger, createChildLogger } from './logger.js';
export type { LogLevel } from './logger.js';

// Tools for agent integration (pi, Claude Code, etc.)
export {
  createBrowserTool,
  browserAction,
  createNavigateTool,
  createActTool,
  createObserveTool,
  createExtractTool,
  navigate,
  act,
  observe,
  extract,
} from './tools/index.js';
export type {
  ToolContext,
  ToolResult,
  ToolUpdate,
  ToolContent,
} from './tools/index.js';