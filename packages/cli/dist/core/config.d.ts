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
/**
 * Resolve config from CLI flags (options) and environment variables.
 * Priority: CLI flags > env vars > defaults
 */
export declare function resolveConfig(options?: Partial<Config>): ResolvedConfig;
/**
 * Validate config and ensure required directories exist.
 */
export declare function validateConfig(config: ResolvedConfig): void;
/**
 * Get list of available context names from the context directory.
 */
export declare function getAvailableContexts(contextDir: string): string[];
/**
 * Check if a context exists on disk.
 */
export declare function contextExists(contextDir: string, name: string): boolean;
//# sourceMappingURL=config.d.ts.map