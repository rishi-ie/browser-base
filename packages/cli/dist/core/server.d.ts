import type { ResolvedConfig } from './config.js';
import { type ActResult, type Action, type SessionInfo } from './sessionManager.js';
/**
 * Browser session — the main programmatic interface.
 *
 * Usage:
 * ```typescript
 * import { Browser, resolveConfig } from '@browserbase/local';
 *
 * const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
 * await browser.start('github-main');
 * await browser.navigate('https://github.com');
 * const result = await browser.act('click the sign-in button');
 * await browser.end();
 * ```
 */
export declare class Browser {
    private sessionManager;
    constructor(config: ResolvedConfig);
    /**
     * Start a browser session with the given context.
     * If a session is already running, returns existing info (idempotent).
     *
     * @param context - Optional context name. Must already exist on disk.
     * @throws If context doesn't exist.
     */
    start(context?: string): Promise<SessionInfo>;
    /**
     * End the current browser session. Idempotent.
     */
    end(): Promise<void>;
    /**
     * Switch to a different browser context. Restarts the session if running.
     *
     * @param name - Context name. Must already exist on disk.
     * @throws If context doesn't exist.
     */
    useContext(name: string): Promise<SessionInfo>;
    /**
     * Navigate the current page to a URL.
     *
     * @throws If no session is running.
     */
    navigate(url: string): Promise<void>;
    /**
     * Perform an action in the browser (click, type, etc.) using natural language.
     *
     * @throws If no session is running.
     */
    act(action: string): Promise<ActResult>;
    /**
     * Find actionable elements on the page matching an instruction.
     *
     * @throws If no session is running.
     */
    observe(instruction?: string): Promise<Action[]>;
    /**
     * Extract structured data from the current page.
     *
     * @throws If no session is running.
     */
    extract(instruction?: string, schema?: unknown): Promise<unknown>;
    /**
     * Get list of available browser context names.
     */
    getAvailableContexts(): string[];
    /**
     * Get the Chrome DevTools debug URL.
     */
    getDebugUrl(): string;
    /**
     * Check if a session is currently running.
     */
    isActive(): boolean;
    /**
     * Get the current context name.
     */
    getCurrentContext(): string;
}
/**
 * Factory function for creating a Browser instance.
 *
 * @example
 * ```typescript
 * const browser = createBrowser({ contextDir: './browser-context' });
 * await browser.start('github-main');
 * ```
 */
export declare function createBrowser(config: ResolvedConfig): Browser;
//# sourceMappingURL=server.d.ts.map