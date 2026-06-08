import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for the browser-base MCP server.
 */
export type Config = {
  /** Run Chrome in headful mode (default: false) */
  headful?: boolean;
  /** Path to Chrome binary (auto-detect if absent) */
  browserPath?: string;
  /** Path to browser-context directory (default: ./browser-context) */
  contextDir?: string;
  /** Remote debugging port (default: 9222) */
  chromePort?: number;
  /** If set, use HTTP transport on this port */
  port?: number;
  /** HTTP host (default: localhost) */
  host?: string;
  /** Model to use (e.g., "openai/gpt-4.1-mini") */
  model?: string;
  /** Logging verbosity (default: 0) */
  verbose?: 0 | 1 | 2;
  /** Context name to use by default */
  defaultContext?: string;
};

/**
 * Resolved configuration with all values filled in.
 */
export interface ResolvedConfig {
  headful: boolean;
  browserPath: string | null;
  contextDir: string;
  chromePort: number;
  port: number | undefined;
  host: string;
  model: string;
  verbose: 0 | 1 | 2;
  defaultContext: string;
}

const DEFAULTS: Omit<ResolvedConfig, 'port'> = {
  headful: false,
  browserPath: null,
  contextDir: './browser-context',
  chromePort: 9222,
  host: 'localhost',
  model: 'openai/gpt-4.1-mini',
  verbose: 0,
  defaultContext: 'default',
};

/**
 * Resolve config from CLI flags (options) and environment variables.
 * Priority: CLI flags > env vars > defaults
 */
export function resolveConfig(options: Partial<Config> = {}): ResolvedConfig {
  const envPort = process.env['BROWSER_BASE_PORT'];
  const envChromePort = process.env['BROWSER_BASE_CHROME_PORT'];
  const envVerbose = process.env['BROWSER_BASE_VERBOSE'];
  const envHost = process.env['BROWSER_BASE_HOST'];

  return {
    headful: options.headful ?? process.env['BROWSER_BASE_HEADFUL'] === '1',
    browserPath: options.browserPath ?? (process.env['BROWSER_BASE_BROWSER_PATH'] ?? DEFAULTS.browserPath),
    contextDir: options.contextDir ?? (process.env['BROWSER_BASE_CONTEXT_DIR'] ?? DEFAULTS.contextDir),
    chromePort: options.chromePort ?? (envChromePort ? parseInt(envChromePort, 10) : DEFAULTS.chromePort),
    port: options.port ?? (envPort ? parseInt(envPort, 10) : undefined),
    host: options.host ?? (envHost ?? DEFAULTS.host),
    model: options.model ?? (process.env['BROWSER_BASE_MODEL'] ?? DEFAULTS.model),
    verbose: options.verbose ?? (envVerbose ? (parseInt(envVerbose, 10) as 0 | 1 | 2) : DEFAULTS.verbose),
    defaultContext: options.defaultContext ?? (process.env['BROWSER_BASE_DEFAULT_CONTEXT'] ?? DEFAULTS.defaultContext),
  };
}

/**
 * Validate config and ensure required directories exist.
 */
export function validateConfig(config: ResolvedConfig): void {
  // Ensure context directory exists
  if (!fs.existsSync(config.contextDir)) {
    fs.mkdirSync(config.contextDir, { recursive: true });
  }

  // Validate port range (with NaN check)
  if (config.port !== undefined && (!Number.isFinite(config.port) || config.port < 1 || config.port > 65535)) {
    throw new Error(`Port must be an integer between 1 and 65535, got ${config.port}`);
  }

  // Validate chromePort range
  if (!Number.isFinite(config.chromePort) || config.chromePort < 1 || config.chromePort > 65535) {
    throw new Error(`Chrome port must be an integer between 1 and 65535, got ${config.chromePort}`);
  }

  // Validate verbose range (with NaN check)
  if (!Number.isFinite(config.verbose) || config.verbose < 0 || config.verbose > 2) {
    throw new Error(`Verbose must be 0, 1, or 2, got ${config.verbose}`);
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
      // Skip hidden directories and non-directories
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