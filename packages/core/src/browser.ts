import * as path from 'path';
import { chromium, type Browser as PlaywrightBrowser, type Page, type Locator } from 'playwright';
import { getChromePath } from 'chrome-launcher';
import type { Logger } from 'pino';
import { createLogger } from './logger.js';
import { 
  resolveConfig, 
  validateContextName, 
  contextExists, 
  getAvailableContexts,
  createContext,
  ensureContext,
  type Config,
  type ResolvedConfig 
} from './config.js';
import { checkLoginStatus } from './auth.js';

/**
 * Information about a running browser session.
 */
export interface SessionInfo {
  sessionId: string;
  context: string;
  debugUrl: string;
  cdpUrl: string;
  headful: boolean;
  needsLogin: boolean;
}

/**
 * Element information for observe results.
 */
export interface ElementInfo {
  selector: string;
  role: string;
  name: string;
  text: string;
  html: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  isVisible: boolean;
  isEnabled: boolean;
  isChecked: boolean | null;
  attributes: Record<string, string>;
  clickable: boolean;
  editable: boolean;
  focusable: boolean;
}

/**
 * Result from a click action.
 */
export interface ClickResult {
  success: boolean;
  selector: string;
  elementText?: string;
  error?: string;
}

/**
 * Result from a type action.
 */
export interface TypeResult {
  success: boolean;
  selector: string;
  text: string;
  error?: string;
}

/**
 * Result from an extract action.
 */
export interface ExtractResult {
  success: boolean;
  selector: string;
  text?: string;
  texts?: string[];
  html?: string;
  attribute?: string;
  error?: string;
}

/**
 * Browser status information.
 */
export interface BrowserStatus {
  active: boolean;
  context: string | null;
  url: string | null;
  title: string | null;
  needsLogin: boolean;
  loginMessage: string;
  availableContexts: string[];
  debugUrl: string | null;
}

/**
 * Options for navigating to a URL.
 */
export interface NavigateOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
}

/**
 * Options for clicking an element.
 */
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
  timeout?: number;
  force?: boolean;
}

/**
 * Options for typing into an element.
 */
export interface TypeOptions {
  delay?: number;
  timeout?: number;
  force?: boolean;
  clear?: boolean;
}

/**
 * Options for waiting for elements.
 */
export interface WaitForOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

/**
 * The main Browser class - deterministic browser control for agents.
 * 
 * Key features:
 * - Auto-creates contexts on-demand
 * - Headful by default (user can see browser to sign in)
 * - Login detection to prompt user when needed
 */
export class Browser {
  private config: ResolvedConfig;
  private browser: PlaywrightBrowser | null = null;
  private page: Page | null = null;
  private currentContext: string;
  private contextPath: string;
  private logger: Logger;
  private isActive: boolean = false;
  private lastNeedsLogin: boolean = false;
  private lastLoginMessage: string = '';

  constructor(config: ResolvedConfig) {
    this.config = config;
    this.currentContext = config.defaultContext;
    this.contextPath = path.join(config.contextDir, this.currentContext);
    this.logger = createLogger(config.verbose);
  }

  /**
   * Start a browser session with the given context.
   * Auto-creates context if it doesn't exist.
   */
  async start(contextName?: string): Promise<SessionInfo> {
    const context = contextName ?? this.currentContext;
    validateContextName(context);

    // If already running with same context, return existing info
    if (this.isActive && this.currentContext === context && this.browser) {
      return this.getSessionInfo();
    }

    // If running with different context, end current session first
    if (this.isActive && this.currentContext !== context) {
      await this.end();
    }

    // Auto-create context if it doesn't exist
    if (!contextExists(this.config.contextDir, context)) {
      this.logger.info(`Context '${context}' not found, creating automatically...`);
      ensureContext(this.config.contextDir, context);
    }

    const ctxPath = path.join(this.config.contextDir, context);
    const chromePath = this.config.browserPath ?? getChromePath();

    this.logger.info(`Starting browser with context: ${context} (${ctxPath})`);
    this.logger.info(`Chrome window: ${this.config.headful ? 'visible' : 'hidden'}`);

    try {
      // Launch Chrome with persistent context
      this.browser = await chromium.launch({
        executablePath: chromePath,
        headless: !this.config.headful,
        args: [
          `--remote-debugging-port=${this.config.chromePort}`,
          `--user-data-dir=${ctxPath}`,
          '--no-first-run',
          '--no-default-browser-check',
        ],
      });

      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout);

      this.currentContext = context;
      this.contextPath = ctxPath;
      this.isActive = true;

      this.logger.info(`Browser session started for context: ${context}`);

      // Initialize login state as unknown
      this.lastNeedsLogin = true;
      this.lastLoginMessage = 'Please navigate to a URL to check login status';

      return this.getSessionInfo();
    } catch (error) {
      this.logger.error(`Failed to start browser: ${error}`);
      // Clean up on failure
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      this.page = null;
      this.isActive = false;
      throw error;
    }
  }

  /**
   * End the current browser session.
   */
  async end(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        this.logger.warn(`Error closing page: ${error}`);
      }
      this.page = null;
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        this.logger.warn(`Error closing browser: ${error}`);
      }
      this.browser = null;
    }

    this.isActive = false;
    this.logger.info('Browser session ended');
  }

  /**
   * Switch to a different browser context.
   */
  async useContext(name: string): Promise<SessionInfo> {
    validateContextName(name);

    this.logger.info(`Switching to context: ${name}`);
    
    // End current session
    if (this.isActive) {
      await this.end();
    }

    // Start new session with new context
    return this.start(name);
  }

  /**
   * Navigate to a URL and check login status.
   */
  async navigate(url: string, options?: NavigateOptions): Promise<void> {
    this.requireActive();

    const timeout = options?.timeout ?? this.config.timeout;
    const waitUntil = options?.waitUntil ?? 'domcontentloaded';

    this.logger.debug(`Navigating to: ${url}`);

    try {
      await this.page!.goto(url, { timeout, waitUntil });
      this.logger.debug(`Navigated to: ${url}`);

      // Check login status after navigation
      const loginStatus = await checkLoginStatus(this.page!);
      this.lastNeedsLogin = !loginStatus.loggedIn;
      this.lastLoginMessage = loginStatus.message;

      if (this.lastNeedsLogin) {
        this.logger.info(`Login may be required: ${this.lastLoginMessage}`);
      } else {
        this.logger.info(`User appears logged in: ${this.lastLoginMessage}`);
      }
    } catch (error) {
      this.logger.error(`Navigation failed: ${error}`);
      throw new Error(`Failed to navigate to ${url}: ${error}`);
    }
  }

  /**
   * Get current login status.
   */
  async getLoginStatus(): Promise<{ needsLogin: boolean; message: string }> {
    this.requireActive();
    
    // Re-check login status
    const loginStatus = await checkLoginStatus(this.page!);
    this.lastNeedsLogin = !loginStatus.loggedIn;
    this.lastLoginMessage = loginStatus.message;

    return {
      needsLogin: this.lastNeedsLogin,
      message: this.lastLoginMessage,
    };
  }

  /**
   * Click an element by selector.
   */
  async click(selector: string, options?: ClickOptions): Promise<ClickResult> {
    this.requireActive();

    try {
      const element = this.page!.locator(selector).first();
      
      const timeout = options?.timeout ?? this.config.timeout;
      await element.waitFor({ state: 'visible', timeout });

      const text = await element.textContent().catch(() => undefined);

      await element.click({
        button: options?.button ?? 'left',
        clickCount: options?.clickCount ?? 1,
        modifiers: options?.modifiers,
        force: options?.force,
        timeout,
      });

      this.logger.debug(`Clicked: ${selector}`);

      return {
        success: true,
        selector,
        elementText: text?.slice(0, 100),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Click failed on ${selector}: ${message}`);
      return { success: false, selector, error: message };
    }
  }

  /**
   * Type text into an element.
   */
  async type(selector: string, text: string, options?: TypeOptions): Promise<TypeResult> {
    this.requireActive();

    try {
      const element = this.page!.locator(selector).first();
      const timeout = options?.timeout ?? this.config.timeout;

      await element.waitFor({ state: 'visible', timeout });

      if (options?.clear) {
        await element.clear();
      }

      await element.fill(text);

      this.logger.debug(`Typed into: ${selector}`);

      return {
        success: true,
        selector,
        text,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Type failed on ${selector}: ${message}`);
      return { success: false, selector, text, error: message };
    }
  }

  /**
   * Press a keyboard key.
   */
  async press(selector: string | undefined, key: string, options?: { timeout?: number }): Promise<{ success: boolean; error?: string }> {
    this.requireActive();

    const timeout = options?.timeout ?? this.config.timeout;

    try {
      if (selector) {
        const element = this.page!.locator(selector).first();
        await element.press(key, { timeout });
      } else {
        await this.page!.keyboard.press(key);
      }

      this.logger.debug(`Pressed: ${key}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Hover over an element.
   */
  async hover(selector: string, options?: { timeout?: number }): Promise<{ success: boolean; error?: string }> {
    this.requireActive();

    const timeout = options?.timeout ?? this.config.timeout;

    try {
      const element = this.page!.locator(selector).first();
      await element.hover({ timeout });
      this.logger.debug(`Hovered: ${selector}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Select options in a <select> element.
   */
  async select(selector: string, values: string | string[], options?: { timeout?: number }): Promise<{ success: boolean; selected: string[]; error?: string }> {
    this.requireActive();

    const timeout = options?.timeout ?? this.config.timeout;

    try {
      const element = this.page!.locator(selector).first();
      const selected = await element.selectOption(values, { timeout });
      this.logger.debug(`Selected in ${selector}: ${selected.join(', ')}`);
      return { success: true, selected };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, selected: [], error: message };
    }
  }

  /**
   * Scroll an element or the page.
   */
  async scroll(selector: string | undefined, direction: 'up' | 'down' | 'left' | 'right', amount: number = 3): Promise<{ success: boolean; error?: string }> {
    this.requireActive();

    try {
      const scrollAmount = direction === 'up' || direction === 'left' ? -500 : 500;

      for (let i = 0; i < amount; i++) {
        if (selector) {
          await this.page!.locator(selector).first().evaluate((el: HTMLElement, delta) => {
            el.scrollBy(delta, delta);
          }, scrollAmount);
        } else {
          await this.page!.evaluate((_delta: number) => {
            window.scrollBy(0, _delta);
          }, scrollAmount);
        }
        await this.page!.waitForTimeout(100);
      }

      this.logger.debug(`Scrolled ${direction} ${amount} times`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Wait for a selector to appear or disappear.
   */
  async waitFor(selector: string, options?: WaitForOptions): Promise<{ success: boolean; error?: string }> {
    this.requireActive();

    const timeout = options?.timeout ?? this.config.timeout;
    const state = options?.state ?? 'visible';

    try {
      const element = this.page!.locator(selector).first();
      await element.waitFor({ state, timeout });
      this.logger.debug(`Waited for ${selector} (${state})`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Observe elements on the current page.
   */
  async observe(filter?: string): Promise<ElementInfo[]> {
    this.requireActive();

    const elements: ElementInfo[] = [];

    const selectors = [
      'a', 'button', 'input', 'select', 'textarea',
      '[onclick]', '[role="button"]', '[role="link"]', '[role="input"]',
      'summary', 'details'
    ];

    const seenSelectors = new Set<string>();

    for (const sel of selectors) {
      try {
        const locator = this.page!.locator(sel);
        const count = await locator.count();

        for (let i = 0; i < Math.min(count, 50); i++) {
          const element = locator.nth(i);
          
          try {
            const el = await element.elementHandle();
            if (!el) continue;

            const tagName = await el.evaluate((e: Element) => e.tagName);
            let selectorStr = sel;

            const id = await element.getAttribute('id');
            if (id) {
              selectorStr = `#${id}`;
            } else {
              const name = await element.getAttribute('name');
              if (name) {
                selectorStr = `${tagName.toLowerCase()}[name="${name}"]`;
              }
            }

            if (seenSelectors.has(selectorStr)) continue;
            seenSelectors.add(selectorStr);

            if (filter) {
              const text = await element.textContent().catch(() => '');
              if (!text?.toLowerCase().includes(filter.toLowerCase())) {
                continue;
              }
            }

            const info = await this.getElementInfoFromLocator(element, selectorStr);
            if (info && (info.isVisible || info.clickable)) {
              elements.push(info);
            }
          } catch {
            // Skip elements we can't get info for
          }
        }
      } catch {
        // Selector might not exist in this page
      }
    }

    this.logger.debug(`Observed ${elements.length} elements`);
    return elements;
  }

  private async getElementInfoFromLocator(element: Locator, selectorStr: string): Promise<ElementInfo | null> {
    try {
      const [boundingBox, role, name, text, isVisible, isEnabled, isChecked, attributes] = await Promise.all([
        element.boundingBox(),
        element.getAttribute('role'),
        element.getAttribute('name'),
        element.textContent(),
        element.isVisible(),
        element.isEnabled(),
        element.isChecked().catch(() => null) as Promise<boolean | null>,
        element.evaluate((el: Element) => {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }),
      ]);

      const tagName = await element.evaluate((el: Element) => el.tagName);
      const clickable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tagName) ||
        !!attributes['onclick'] || attributes['role'] === 'button';

      const editable = ['INPUT', 'TEXTAREA'].includes(tagName) || 
        await element.isEditable().catch(() => false);

      const isHidden = await element.isHidden().catch(() => false);

      return {
        selector: selectorStr,
        role: role || tagName.toLowerCase(),
        name: name || '',
        text: text?.trim().slice(0, 200) || '',
        html: await element.innerHTML().catch(() => '') as string,
        boundingBox,
        isVisible,
        isEnabled,
        isChecked,
        attributes,
        clickable,
        editable,
        focusable: !isHidden,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get detailed information about an element.
   */
  async getElementInfo(selector: string): Promise<ElementInfo | null> {
    this.requireActive();

    try {
      const element = this.page!.locator(selector).first();
      return this.getElementInfoFromLocator(element, selector);
    } catch {
      return null;
    }
  }

  /**
   * Get all text content matching a selector.
   */
  async extract(selector: string, options?: { many?: boolean; attribute?: string }): Promise<ExtractResult> {
    this.requireActive();

    try {
      const locator = this.page!.locator(selector);

      if (options?.many) {
        const texts = await locator.allTextContents();
        return { success: true, selector, texts };
      }

      if (options?.attribute) {
        const value = await locator.first().getAttribute(options.attribute);
        return { success: true, selector, attribute: value ?? undefined };
      }

      const text = await locator.first().textContent();
      const html = await locator.first().innerHTML().catch(() => undefined);

      return { success: true, selector, text: text?.trim(), html: html as string | undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, selector, error: message };
    }
  }

  /**
   * Execute JavaScript in the page context.
   */
  async evaluate(script: string): Promise<{ success: boolean; result?: unknown; error?: string }> {
    this.requireActive();

    try {
      const result = await this.page!.evaluate(script);
      return { success: true, result: result as unknown };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get the current URL.
   */
  async getUrl(): Promise<string | null> {
    if (!this.isActive || !this.page) return null;
    return this.page.url() as unknown as string;
  }

  /**
   * Get the page title.
   */
  async getTitle(): Promise<string | null> {
    if (!this.isActive || !this.page) return null;
    return this.page.title() as unknown as string;
  }

  /**
   * Get the full HTML of the page.
   */
  async getHtml(): Promise<string | null> {
    this.requireActive();
    return this.page!.content();
  }

  /**
   * Take a screenshot.
   */
  async screenshot(options?: { path?: string; fullPage?: boolean }): Promise<{ success: boolean; path?: string; error?: string }> {
    this.requireActive();

    try {
      await this.page!.screenshot({
        path: options?.path,
        fullPage: options?.fullPage,
      });
      return { success: true, path: options?.path || 'screenshot.png' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Check if the page has an element matching the selector.
   */
  async has(selector: string): Promise<boolean> {
    this.requireActive();
    const count = await this.page!.locator(selector).count();
    return count > 0;
  }

  /**
   * Get browser status information.
   */
  async getStatus(): Promise<BrowserStatus> {
    const availableContexts = getAvailableContexts(this.config.contextDir);

    if (!this.isActive || !this.page) {
      return {
        active: false,
        context: null,
        url: null,
        title: null,
        needsLogin: false,
        loginMessage: '',
        availableContexts,
        debugUrl: null,
      };
    }

    const pageUrl = this.page.url() as unknown as string;
    const pageTitle = this.page.title() as unknown as string;

    return {
      active: true,
      context: this.currentContext,
      url: pageUrl,
      title: pageTitle,
      needsLogin: this.lastNeedsLogin,
      loginMessage: this.lastLoginMessage,
      availableContexts,
      debugUrl: `chrome://inspect#devtools/?ws=localhost:${this.config.chromePort}`,
    };
  }

  /**
   * Get available contexts.
   */
  getAvailableContexts(): string[] {
    return getAvailableContexts(this.config.contextDir);
  }

  /**
   * Check if browser is active.
   */
  isBrowserActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current context name.
   */
  getCurrentContext(): string | null {
    return this.isActive ? this.currentContext : null;
  }

  /**
   * Get session info.
   */
  getSessionInfo(): SessionInfo {
    this.requireActive();
    return {
      sessionId: this.currentContext,
      context: this.currentContext,
      debugUrl: `chrome://inspect#devtools/?ws=localhost:${this.config.chromePort}`,
      cdpUrl: `ws://localhost:${this.config.chromePort}`,
      headful: this.config.headful,
      needsLogin: this.lastNeedsLogin,
    };
  }

  /**
   * Get the underlying Playwright page for advanced operations.
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Reload the current page.
   */
  async reload(options?: NavigateOptions): Promise<void> {
    this.requireActive();
    const timeout = options?.timeout ?? this.config.timeout;
    await this.page!.reload({ timeout });
    
    // Re-check login status after reload
    const loginStatus = await checkLoginStatus(this.page!);
    this.lastNeedsLogin = !loginStatus.loggedIn;
    this.lastLoginMessage = loginStatus.message;
  }

  /**
   * Go back in browser history.
   */
  async back(): Promise<void> {
    this.requireActive();
    await this.page!.goBack();
  }

  /**
   * Go forward in browser history.
   */
  async forward(): Promise<void> {
    this.requireActive();
    await this.page!.goForward();
  }

  /**
   * Require an active browser session.
   */
  private requireActive(): void {
    if (!this.isActive || !this.page) {
      throw new Error('No browser session active. Call browser.navigate first.');
    }
  }
}

/**
 * Factory function for creating a Browser instance.
 */
export function createBrowser(config: Config = {}): Browser {
  return new Browser(resolveConfig(config));
}