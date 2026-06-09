import { resolveConfig } from './config.js';
import { Browser } from './browser.js';

// Core exports
export { Browser, createBrowser, type SessionInfo, type BrowserStatus } from './browser.js';
export type {
  ElementInfo,
  ClickResult,
  TypeResult,
  ExtractResult,
  NavigateOptions,
  ClickOptions,
  TypeOptions,
  WaitForOptions,
} from './browser.js';

// Config exports
export {
  resolveConfig,
  validateContextName,
  getAvailableContexts,
  contextExists,
  createContext,
  ensureContext,
  deleteContext,
  extractDomainFromUrl,
  type Config,
  type ResolvedConfig,
} from './config.js';

// Auth exports
export {
  isContextLoggedIn,
  checkLocalStorageAuth,
  checkDomLoginState,
  checkLoginStatus,
} from './auth.js';

// Logger exports
export { createLogger, createChildLogger, type Logger, type LogLevel } from './logger.js';

// Default instance factory
export function createDefaultBrowser(): Browser {
  return new Browser(resolveConfig({ headful: true }));
}