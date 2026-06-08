import type { ResolvedConfig } from './config.js';
/**
 * Information about a running session.
 */
export interface SessionInfo {
    sessionId: string;
    debugUrl: string;
    cdpUrl: string;
    context: string;
}
/**
 * Result from the act tool.
 */
export interface ActResult {
    success: boolean;
    message: string;
    actionDescription: string;
    actions: Action[];
    cacheStatus?: 'HIT' | 'MISS';
}
/**
 * Action identified by the observe tool.
 */
export interface Action {
    selector: string;
    description: string;
    method?: string;
    arguments?: string[];
}
export declare class SessionManager {
    private stagehand;
    private currentContext;
    private contextDir;
    private browserPath;
    private headful;
    private model;
    private verbose;
    private chromePort;
    private logger;
    private isRunning;
    constructor(config: ResolvedConfig);
    /**
     * Validate a context name to prevent path traversal.
     */
    private validateContextName;
    /**
     * Start a browser session with the given context.
     */
    start(contextName?: string): Promise<SessionInfo>;
    /**
     * Wait for CDP WebSocket to be ready.
     */
    /**
     * Switch to a different browser context. Restarts the session if running.
     */
    useContext(name: string): Promise<SessionInfo>;
    /**
     * End the current browser session.
     */
    end(): Promise<void>;
    /**
     * Navigate to a URL.
     */
    navigate(url: string): Promise<void>;
    /**
     * Perform an action in the browser.
     */
    act(action: string): Promise<ActResult>;
    /**
     * Observe elements on the current page.
     */
    observe(instruction?: string): Promise<Action[]>;
    /**
     * Extract structured data from the current page.
     */
    extract(instruction?: string, schema?: unknown): Promise<unknown>;
    /**
     * Get list of available contexts.
     */
    getAvailableContexts(): string[];
    /**
     * Get the Chrome DevTools debug URL.
     */
    getDebugUrl(): string;
    /**
     * Get the Chrome DevTools Protocol WebSocket URL.
     */
    getCdpUrl(): string;
    /**
     * Get the Chrome remote debugging port.
     */
    getChromePort(): number;
    /**
     * Check if a session is currently running.
     */
    isActive(): boolean;
    /**
     * Get the current context name.
     */
    getCurrentContext(): string;
}
//# sourceMappingURL=sessionManager.d.ts.map