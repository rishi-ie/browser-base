import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
const DEFAULTS = {
    defaultContext: 'default',
    model: 'openai/gpt-4.1-mini',
    headful: false,
    verbose: 0,
    chromePort: 9222,
};
const ENV_KEYS = {
    contextDir: 'BROWSER_BASE_CONTEXT_DIR',
    defaultContext: 'BROWSER_BASE_DEFAULT_CONTEXT',
    model: 'BROWSER_BASE_MODEL',
    headful: 'BROWSER_BASE_HEADFUL',
    verbose: 'BROWSER_BASE_VERBOSE',
    chromePort: 'BROWSER_BASE_CHROME_PORT',
    browserPath: 'BROWSER_BASE_BROWSER_PATH',
};
/** Path to a project-level config file, or null if it doesn't exist. */
async function findProjectConfig(startDir) {
    // Walk up from CWD looking for .browser-base/browser-base.json
    let dir = path.resolve(startDir);
    const { root } = path.parse(dir);
    while (true) {
        const candidate = path.join(dir, '.browser-base', 'browser-base.json');
        try {
            await fs.access(candidate);
            return candidate;
        }
        catch {
            // not found here
        }
        if (dir === root)
            break;
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
}
async function readJsonConfig(configPath) {
    try {
        const raw = await fs.readFile(configPath, 'utf-8');
        const data = JSON.parse(raw);
        return data;
    }
    catch {
        return null;
    }
}
/**
 * Load the project config, applying the documented precedence rules.
 * Returns both the resolved config and the path it was loaded from (for
 * diagnostic purposes / status output).
 */
export async function loadProjectConfig(opts = {}) {
    const cwd = opts.cwd ?? process.cwd();
    const home = os.homedir();
    // 1. Project config (walks up from CWD)
    const projectPath = await findProjectConfig(cwd);
    const fileConfig = projectPath ? await readJsonConfig(projectPath) : null;
    // 2. User-level config (optional)
    let userConfig = null;
    if (opts.includeUserConfig !== false) {
        const userPath = path.join(home, '.browser-base', 'config.json');
        userConfig = await readJsonConfig(userPath);
    }
    const merged = {
        ...(userConfig ?? {}),
        ...(fileConfig ?? {}),
    };
    // 3. Environment variables
    const env = process.env;
    const contextDirRaw = merged.contextDir ?? env[ENV_KEYS.contextDir];
    // Default to ./browser-context (matches browse-local context create default)
    const contextDir = contextDirRaw
        ? path.resolve(cwd, contextDirRaw)
        : path.resolve(cwd, './browser-context');
    const defaultContext = merged.defaultContext ?? env[ENV_KEYS.defaultContext] ?? DEFAULTS.defaultContext;
    const model = merged.model ?? env[ENV_KEYS.model] ?? DEFAULTS.model;
    const headful = merged.headful ?? (env[ENV_KEYS.headful] === '1' || env[ENV_KEYS.headful] === 'true');
    const verbose = (() => {
        if (typeof merged.verbose === 'number')
            return merged.verbose;
        const raw = env[ENV_KEYS.verbose];
        if (!raw)
            return DEFAULTS.verbose;
        const n = parseInt(raw, 10);
        if (n === 0 || n === 1 || n === 2)
            return n;
        return DEFAULTS.verbose;
    })();
    const chromePort = (() => {
        if (typeof merged.chromePort === 'number')
            return merged.chromePort;
        const raw = env[ENV_KEYS.chromePort];
        if (!raw)
            return DEFAULTS.chromePort;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : DEFAULTS.chromePort;
    })();
    const browserPath = merged.browserPath ?? env[ENV_KEYS.browserPath] ?? null;
    return {
        config: {
            contextDir,
            defaultContext,
            model,
            headful,
            verbose,
            chromePort,
            browserPath,
        },
        configPath: projectPath,
    };
}
/**
 * Convert a ProjectConfig into the shape expected by `@browserbase/local`'s
 * `resolveConfig`. The CLI subcommands consume this everywhere.
 */
export function toResolvedConfig(project) {
    return {
        headful: project.headful,
        browserPath: project.browserPath ?? undefined,
        contextDir: project.contextDir,
        chromePort: project.chromePort,
        model: project.model,
        verbose: project.verbose,
        defaultContext: project.defaultContext,
    };
}
//# sourceMappingURL=projectConfig.js.map