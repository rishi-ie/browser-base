import type { ResolvedConfig } from './config.js';
import { SessionManager, type ActResult, type Action, type SessionInfo } from './sessionManager.js';


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
export class Browser {
  private sessionManager: SessionManager;

  constructor(config: ResolvedConfig) {
    this.sessionManager = new SessionManager(config);
  }

  /**
   * Start a browser session with the given context.
   * If a session is already running, returns existing info (idempotent).
   *
   * @param context - Optional context name. Must already exist on disk.
   * @throws If context doesn't exist.
   */
  async start(context?: string): Promise<SessionInfo> {
    return this.sessionManager.start(context);
  }

  /**
   * End the current browser session. Idempotent.
   */
  async end(): Promise<void> {
    return this.sessionManager.end();
  }

  /**
   * Switch to a different browser context. Restarts the session if running.
   *
   * @param name - Context name. Must already exist on disk.
   * @throws If context doesn't exist.
   */
  async useContext(name: string): Promise<SessionInfo> {
    return this.sessionManager.useContext(name);
  }

  /**
   * Navigate the current page to a URL.
   *
   * @throws If no session is running.
   */
  async navigate(url: string): Promise<void> {
    return this.sessionManager.navigate(url);
  }

  /**
   * Perform an action in the browser (click, type, etc.) using natural language.
   *
   * @throws If no session is running.
   */
  async act(action: string): Promise<ActResult> {
    return this.sessionManager.act(action);
  }

  /**
   * Find actionable elements on the page matching an instruction.
   *
   * @throws If no session is running.
   */
  async observe(instruction?: string): Promise<Action[]> {
    return this.sessionManager.observe(instruction);
  }

  /**
   * Extract structured data from the current page.
   *
   * @throws If no session is running.
   */
  async extract(instruction?: string, schema?: unknown): Promise<unknown> {
    return this.sessionManager.extract(instruction, schema);
  }

  /**
   * Get list of available browser context names.
   */
  getAvailableContexts(): string[] {
    return this.sessionManager.getAvailableContexts();
  }

  /**
   * Get the Chrome DevTools debug URL.
   */
  getDebugUrl(): string {
    return this.sessionManager.getDebugUrl();
  }

  /**
   * Check if a session is currently running.
   */
  isActive(): boolean {
    return this.sessionManager.isActive();
  }

  /**
   * Get the current context name.
   */
  getCurrentContext(): string {
    return this.sessionManager.getCurrentContext();
  }
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
export function createBrowser(config: ResolvedConfig): Browser {
  return new Browser(config);
}
