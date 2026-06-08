import * as fs from 'fs';
import * as path from 'path';
const DEFAULTS = {
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
export function resolveConfig(options = {}) {
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
        verbose: options.verbose ?? (envVerbose ? parseInt(envVerbose, 10) : DEFAULTS.verbose),
        defaultContext: options.defaultContext ?? (process.env['BROWSER_BASE_DEFAULT_CONTEXT'] ?? DEFAULTS.defaultContext),
    };
}
/**
 * Validate config and ensure required directories exist.
 */
export function validateConfig(config) {
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
export function getAvailableContexts(contextDir) {
    if (!fs.existsSync(contextDir)) {
        return [];
    }
    return fs.readdirSync(contextDir)
        .filter((name) => {
        // Skip hidden directories and non-directories
        if (name.startsWith('.'))
            return false;
        const fullPath = path.join(contextDir, name);
        return fs.statSync(fullPath).isDirectory();
    });
}
/**
 * Check if a context exists on disk.
 */
export function contextExists(contextDir, name) {
    const contextPath = path.join(contextDir, name);
    return fs.existsSync(contextPath) && fs.statSync(contextPath).isDirectory();
}
//# sourceMappingURL=config.js.map