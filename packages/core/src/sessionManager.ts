import * as fs from 'fs';
import * as path from 'path';
import type { ChildProcess } from 'child_process';
import type { Logger } from 'pino';
import { launch, getChromePath, type LaunchedChrome } from 'chrome-launcher';
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
  private browserProcess: ChildProcess | null = null;
  private chromePort: number;
  private logger: Logger;
  private isRunning: boolean = false;
  private chromeInstance: LaunchedChrome | null = null;

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
   * Start a browser session with the given context.
   */
  async start(contextName?: string): Promise<SessionInfo> {
    const context = contextName ?? this.currentContext;

    // If already running, return existing session info
    if (this.isRunning) {
      return {
        sessionId: this.currentContext,
        debugUrl: this.getDebugUrl(),
        cdpUrl: `ws://localhost:${this.chromePort}`,
        context: this.currentContext,
      };
    }

    // Ensure context directory exists
    const contextPath = path.join(this.contextDir, context);
    if (!fs.existsSync(contextPath)) {
      fs.mkdirSync(contextPath, { recursive: true });
    }

    // Find Chrome path
    const chromePath = this.browserPath ?? getChromePath();

    // Launch Chrome
    this.logger.info(`Launching Chrome with context: ${context}`);

    this.chromeInstance = await launch({
      chromePath,
      userDataDir: contextPath,
      port: this.chromePort,
      chromeFlags: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--remote-debugging-port=${this.chromePort}`,
      ],
    });

    this.browserProcess = this.chromeInstance.process as ChildProcess;

    // Wait for CDP to be ready
    await this.waitForCdp();

    // Create V3 (Stagehand) with LOCAL environment
    // Extract just the model name without provider prefix (e.g., "gpt-4.1-mini" from "openai/gpt-4.1-mini")
    const modelName = this.model.includes('/')
      ? this.model.split('/')[1]
      : this.model;

    this.stagehand = new V3({
      env: 'LOCAL',
      localBrowserLaunchOptions: {
        cdpUrl: `ws://localhost:${this.chromePort}`,
        executablePath: chromePath,
        userDataDir: contextPath,
        headless: !this.headful,
      },
      model: modelName,
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
  private async waitForCdp(maxWaitMs: number = 30000): Promise<void> {
    const start = Date.now();
    const checkInterval = 100;

    while (Date.now() - start < maxWaitMs) {
      try {
        const response = await fetch(`http://localhost:${this.chromePort}/json/version`);
        if (response.ok) {
          return;
        }
      } catch {
        // Not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error('Timeout waiting for Chrome remote debugging port');
  }

  /**
   * Switch to a different browser context.
   */
  async useContext(name: string): Promise<void> {
    const contextPath = path.join(this.contextDir, name);

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

    // Switch context
    this.currentContext = name;
  }

  /**
   * End the current browser session.
   */
  async end(): Promise<void> {
    if (this.stagehand) {
      try {
        await this.stagehand.close();
      } catch (err) {
        this.logger.warn(`Error closing stagehand: ${err}`);
      }
      this.stagehand = null;
    }

    if (this.chromeInstance) {
      try {
        this.chromeInstance.kill();
      } catch (err) {
        this.logger.warn(`Error killing Chrome: ${err}`);
      }
      this.chromeInstance = null;
    }

    if (this.browserProcess) {
      this.browserProcess = null;
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
    const pages = ctx.pages();
    if (pages.length === 0) {
      throw new Error('No pages found in browser context');
    }

    await pages[0].goto(url);
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