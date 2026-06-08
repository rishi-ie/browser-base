import * as fs from 'fs';
import * as path from 'path';

import type { Logger } from 'pino';
import { getChromePath } from 'chrome-launcher';
import { V3 } from '@browserbasehq/stagehand';
import type { ResolvedConfig } from './config.js';
import { contextExists, getAvailableContexts } from './config.js';
import { createLogger } from './logger.js';

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

export class SessionManager {
  private stagehand: V3 | null = null;
  private currentContext: string;
  private contextDir: string;
  private browserPath: string | null;
  private headful: boolean;
  private model: string;
  private verbose: 0 | 1 | 2;

  private chromePort: number;
  private logger: Logger;
  private isRunning: boolean = false;


  constructor(config: ResolvedConfig) {
    this.currentContext = config.defaultContext;
    this.contextDir = config.contextDir;
    this.browserPath = config.browserPath ?? null;
    this.headful = config.headful;
    this.model = config.model;
    this.verbose = config.verbose;
    this.chromePort = config.chromePort;
    this.logger = createLogger(config.verbose);
  }

  /**
   * Validate a context name to prevent path traversal.
   */
  private validateContextName(name: string): void {
    if (!name || name.includes('/') || name.includes('\\') || name === '..' || name === '.') {
      throw new Error(`Invalid context name: '${name}'. Context names must be non-empty and cannot contain path separators.`);
    }
  }

  /**
   * Start a browser session with the given context.
   */
  async start(contextName?: string): Promise<SessionInfo> {
    const context = contextName ?? this.currentContext;
    this.validateContextName(context);

    // If already running, return existing session info
    if (this.isRunning) {
      return {
        sessionId: this.currentContext,
        debugUrl: this.getDebugUrl(),
        cdpUrl: this.getCdpUrl(),
        context: this.currentContext,
      };
    }

    // Strict mode: context directory must already exist on disk
    const contextPath = path.join(this.contextDir, context);
    if (!fs.existsSync(contextPath)) {
      const available = this.getAvailableContexts();
      throw new Error(
        `Context '${context}' not found. Available contexts: ${available.join(', ') || '(none)'}`
      );
    }

    // Find Chrome path
    const chromePath = this.browserPath ?? getChromePath();

    // Create V3 (Stagehand) with LOCAL environment.
    // Stagehand will launch Chrome via its own chrome-launcher integration,
    // so we pass executablePath + userDataDir in localBrowserLaunchOptions.
    // We do NOT launch Chrome ourselves — that caused a double-launch conflict
    // where the second Chrome's WebSocket (at ws://localhost:9222/devtools/browser/...)
    // wasn't reachable because we passed the bare ws://localhost:9222.
    this.logger.info(`Starting Stagehand with context: ${context}`);

    this.stagehand = new V3({
      env: 'LOCAL',
      localBrowserLaunchOptions: {
        executablePath: chromePath,
        userDataDir: contextPath,
        headless: !this.headful,
        // NOTE: We intentionally do NOT set cdpUrl here.
        // Omitting cdpUrl causes Stagehand to call launchLocalChrome()
        // internally, which properly discovers the WebSocket URL via /json/version
        // and returns the full path (ws://localhost:9222/devtools/browser/<id>).
      },
      model: this.model,
      verbose: this.verbose,
    });

    await this.stagehand.init();

    this.currentContext = context;
    this.isRunning = true;

    this.logger.info(`Browser session started for context: ${context}`);

    return {
      sessionId: context,
      debugUrl: this.getDebugUrl(),
      cdpUrl: `ws://localhost:${this.chromePort}`,
      context,
    };
  }

  /**
   * Wait for CDP WebSocket to be ready.
   */
  /**
   * Switch to a different browser context. Restarts the session if running.
   */
  async useContext(name: string): Promise<SessionInfo> {
    this.validateContextName(name);

    if (!contextExists(this.contextDir, name)) {
      const available = this.getAvailableContexts();
      throw new Error(
        `Context '${name}' not found. Available contexts: ${available.join(', ') || '(none)'}`
      );
    }

    // If session is running, close it first
    if (this.isRunning) {
      await this.end();
    }

    // Switch context and start new session
    this.currentContext = name;
    return this.start(name);
  }

  /**
   * End the current browser session.
   */
  async end(): Promise<void> {
    if (this.stagehand) {
      try {
        // Stagehand.close() handles CDP cleanup AND Chrome kill via
        // cleanupLocalBrowser when keepAlive is not set.
        await this.stagehand.close();
      } catch (err) {
        this.logger.warn(`Error closing stagehand: ${err}`);
      }
      this.stagehand = null;
    }

    this.isRunning = false;
    this.logger.info('Browser session ended');
  }

  /**
   * Navigate to a URL.
   */
  async navigate(url: string): Promise<void> {
    if (!this.stagehand) {
      throw new Error('No browser session running');
    }

    const ctx = this.stagehand.context;
    // Prefer the active page (user's current tab) over pages[0] (oldest)
    const page = ctx.activePage() ?? ctx.pages()[0];
    if (!page) {
      throw new Error('No pages found in browser context');
    }

    await page.goto(url);
    this.logger.debug(`Navigated to: ${url}`);
  }

  /**
   * Perform an action in the browser.
   */
  async act(action: string): Promise<ActResult> {
    if (!this.stagehand) {
      throw new Error('No browser session running');
    }

    const result = await this.stagehand.act(action);
    this.logger.debug(`Act result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Observe elements on the current page.
   */
  async observe(instruction?: string): Promise<Action[]> {
    if (!this.stagehand) {
      throw new Error('No browser session running');
    }

    const result = instruction
      ? await this.stagehand.observe(instruction)
      : await this.stagehand.observe();

    this.logger.debug(`Observe result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Extract structured data from the current page.
   */
  async extract(instruction?: string, schema?: unknown): Promise<unknown> {
    if (!this.stagehand) {
      throw new Error('No browser session running');
    }

    const result = instruction
      ? schema
        ? await this.stagehand.extract(instruction, schema as any)
        : await this.stagehand.extract(instruction)
      : await this.stagehand.extract();

    this.logger.debug(`Extract result: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Get list of available contexts.
   */
  getAvailableContexts(): string[] {
    return getAvailableContexts(this.contextDir);
  }

  /**
   * Get the Chrome DevTools debug URL.
   */
  getDebugUrl(): string {
    return `chrome://inspect#devtools/?ws=localhost:${this.chromePort}`;
  }

  /**
   * Get the Chrome DevTools Protocol WebSocket URL.
   */
  getCdpUrl(): string {
    return `ws://localhost:${this.chromePort}`;
  }

  /**
   * Get the Chrome remote debugging port.
   */
  getChromePort(): number {
    return this.chromePort;
  }

  /**
   * Check if a session is currently running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the current context name.
   */
  getCurrentContext(): string {
    return this.currentContext;
  }
}