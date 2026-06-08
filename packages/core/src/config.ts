export interface Config {
  /** Chrome user data directory (browser context) */
  browserContextDir: string;
  /** Port for HTTP transport (omit for stdio) */
  port?: number;
  /** Path to Chrome executable */
  chromePath?: string;
  /** Run Chrome in headless mode */
  headless: boolean;
  /** Strict mode: fail if context doesn't exist */
  strict: boolean;
  /** Logging level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ConfigOptions {
  browserContextDir?: string;
  port?: number;
  chromePath?: string;
  headless?: boolean;
  strict?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_CONFIG: Required<Config> = {
  browserContextDir: './browser-context',
  port: undefined,
  chromePath: undefined,
  headless: true,
  strict: true,
  logLevel: 'info',
};

export function resolveConfig(options: ConfigOptions = {}): Config {
  return {
    browserContextDir: options.browserContextDir ?? process.env.BROWSER_CONTEXT_DIR ?? DEFAULT_CONFIG.browserContextDir,
    port: options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined),
    chromePath: options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CONFIG.chromePath,
    headless: options.headless ?? (process.env.HEADFUL === '1' ? false : DEFAULT_CONFIG.headless),
    strict: options.strict ?? (process.env.STRICT === '1' ? true : DEFAULT_CONFIG.strict),
    logLevel: options.logLevel ?? (process.env.LOG_LEVEL as Config['logLevel']) ?? DEFAULT_CONFIG.logLevel,
  };
}

export function validateConfig(config: Config): void {
  if (!config.browserContextDir) {
    throw new Error('browserContextDir is required');
  }
  if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
    throw new Error('port must be between 1 and 65535');
  }
  if (config.logLevel && !['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
    throw new Error('logLevel must be one of: debug, info, warn, error');
  }
}
