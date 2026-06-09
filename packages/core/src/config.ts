import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for browser-base.
 */
export interface Config {
  /** Run Chrome in headful mode (visible window). Default: true - user needs to see browser to sign in */
  headful?: boolean;
  /** Path to Chrome binary. Auto-detected if not provided. */
  browserPath?: string;
  /** Directory for browser contexts (profiles). Default: ./browser-context */
  contextDir?: string;
  /** Chrome remote debugging port. Default: 9222 */
  chromePort?: number;
  /** Enable verbose logging. 0=silent, 1=info, 2=debug. Default: 0 */
  verbose?: 0 | 1 | 2;
  /** Default context name. Default: default */
  defaultContext?: string;
  /** Timeout for browser operations in ms. Default: 30000 */
  timeout?: number;
}

/**
 * Resolved configuration with all defaults applied.
 */
export interface ResolvedConfig {
  headful: boolean;
  browserPath: string | null;
  contextDir: string;
  chromePort: number;
  verbose: 0 | 1 | 2;
  defaultContext: string;
  timeout: number;
}

const DEFAULTS: ResolvedConfig = {
  headful: true,  // Default to headful - user needs to see browser to sign in
  browserPath: null,
  contextDir: './browser-context',
  chromePort: 9222,
  verbose: 0,
  defaultContext: 'default',
  timeout: 30000,
};

/**
 * Parse a number from string, with fallback.
 */
function parseIntOr(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Resolve config from options and environment variables.
 * Priority: options > env vars > defaults
 */
export function resolveConfig(options: Config = {}): ResolvedConfig {
  const env = process.env;

  return {
    headful: options.headful ?? env['BROWSER_BASE_HEADFUL'] !== '0',
    browserPath: options.browserPath ?? (env['BROWSER_BASE_BROWSER_PATH'] ?? DEFAULTS.browserPath),
    contextDir: options.contextDir ?? (env['BROWSER_BASE_CONTEXT_DIR'] ?? DEFAULTS.contextDir),
    chromePort: options.chromePort ?? parseIntOr(env['BROWSER_BASE_CHROME_PORT'], DEFAULTS.chromePort),
    verbose: options.verbose ?? (parseIntOr(env['BROWSER_BASE_VERBOSE'], DEFAULTS.verbose) as 0 | 1 | 2),
    defaultContext: options.defaultContext ?? (env['BROWSER_BASE_DEFAULT_CONTEXT'] ?? DEFAULTS.defaultContext),
    timeout: options.timeout ?? parseIntOr(env['BROWSER_BASE_TIMEOUT'], DEFAULTS.timeout),
  };
}

/**
 * Validate a context name to prevent path traversal.
 */
export function validateContextName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error('Context name cannot be empty');
  }
  if (name.includes('/') || name.includes('\\')) {
    throw new Error(`Context name cannot contain path separators: ${name}`);
  }
  if (name === '..' || name === '.') {
    throw new Error(`Invalid context name: ${name}`);
  }
}

/**
 * Get list of available context names from the context directory.
 */
export function getAvailableContexts(contextDir: string): string[] {
  if (!fs.existsSync(contextDir)) {
    return [];
  }

  return fs.readdirSync(contextDir)
    .filter((name) => {
      if (name.startsWith('.')) return false;
      const fullPath = path.join(contextDir, name);
      return fs.statSync(fullPath).isDirectory();
    });
}

/**
 * Check if a context exists on disk.
 */
export function contextExists(contextDir: string, name: string): boolean {
  const contextPath = path.join(contextDir, name);
  return fs.existsSync(contextPath) && fs.statSync(contextPath).isDirectory();
}

/**
 * Create a new context directory. Idempotent - returns path if exists.
 */
export function createContext(contextDir: string, name: string): string {
  validateContextName(name);
  const contextPath = path.join(contextDir, name);
  
  if (!fs.existsSync(contextPath)) {
    fs.mkdirSync(contextPath, { recursive: true });
  }
  
  return contextPath;
}

/**
 * Ensure a context exists, creating it if necessary. Idempotent.
 */
export function ensureContext(contextDir: string, name: string): string {
  return createContext(contextDir, name);
}

/**
 * Delete a context directory.
 */
export function deleteContext(contextDir: string, name: string): void {
  validateContextName(name);
  const contextPath = path.join(contextDir, name);
  
  if (!fs.existsSync(contextPath)) {
    throw new Error(`Context '${name}' does not exist`);
  }

  fs.rmSync(contextPath, { recursive: true, force: true });
}

/**
 * Extract domain from URL for context naming.
 * "https://twitter.com/home" -> "twitter"
 * "https://www.instagram.com" -> "instagram"
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    // Get first part of domain (e.g., "twitter" from "twitter.com")
    return hostname.split('.')[0];
  } catch {
    return 'default';
  }
}