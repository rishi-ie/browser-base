/**
 * browser-base project config (lives in <project>/.browser-base/browser-base.json).
 *
 * Resolution order (highest priority first):
 *   1. CLI flags (caller's responsibility to merge)
 *   2. .browser-base/browser-base.json in process.cwd()
 *   3. ~/.browser-base/config.json
 *   4. Environment variables
 *   5. Built-in defaults
 */
export interface ProjectConfig {
    /** Absolute path to the contexts directory. */
    contextDir: string;
    /** Default context name to use when none is specified. */
    defaultContext: string;
    /** LLM model string (provider/name), e.g. "openai/gpt-4.1-mini". */
    model: string;
    /** Run Chrome in headful (visible) mode. */
    headful: boolean;
    /** Verbosity level. */
    verbose: 0 | 1 | 2;
    /** Chrome remote debugging port. */
    chromePort: number;
    /** Absolute path to the Chrome binary (auto-detected if null). */
    browserPath: string | null;
}
/**
 * Load the project config, applying the documented precedence rules.
 * Returns both the resolved config and the path it was loaded from (for
 * diagnostic purposes / status output).
 */
export declare function loadProjectConfig(opts?: {
    cwd?: string;
    /** If true, also check ~/.browser-base/config.json. */
    includeUserConfig?: boolean;
}): Promise<{
    config: ProjectConfig;
    configPath: string | null;
}>;
/**
 * Convert a ProjectConfig into the shape expected by `@browserbase/local`'s
 * `resolveConfig`. The CLI subcommands consume this everywhere.
 */
export declare function toResolvedConfig(project: ProjectConfig): {
    headful: boolean;
    browserPath: string | undefined;
    contextDir: string;
    chromePort: number;
    model: string;
    verbose: 0 | 1 | 2;
    defaultContext: string;
};
//# sourceMappingURL=projectConfig.d.ts.map