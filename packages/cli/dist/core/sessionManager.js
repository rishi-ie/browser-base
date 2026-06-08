import * as fs from 'fs';
import * as path from 'path';
import { getChromePath } from 'chrome-launcher';
import { V3 } from '@browserbasehq/stagehand';
import { contextExists, getAvailableContexts } from './config.js';
import { createLogger } from './logger.js';
export class SessionManager {
    stagehand = null;
    currentContext;
    contextDir;
    browserPath;
    headful;
    model;
    verbose;
    chromePort;
    logger;
    isRunning = false;
    constructor(config) {
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
    validateContextName(name) {
        if (!name || name.includes('/') || name.includes('\\') || name === '..' || name === '.') {
            throw new Error(`Invalid context name: '${name}'. Context names must be non-empty and cannot contain path separators.`);
        }
    }
    /**
     * Start a browser session with the given context.
     */
    async start(contextName) {
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
            throw new Error(`Context '${context}' not found. Available contexts: ${available.join(', ') || '(none)'}`);
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
    async useContext(name) {
        this.validateContextName(name);
        if (!contextExists(this.contextDir, name)) {
            const available = this.getAvailableContexts();
            throw new Error(`Context '${name}' not found. Available contexts: ${available.join(', ') || '(none)'}`);
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
    async end() {
        if (this.stagehand) {
            try {
                // Stagehand.close() handles CDP cleanup AND Chrome kill via
                // cleanupLocalBrowser when keepAlive is not set.
                await this.stagehand.close();
            }
            catch (err) {
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
    async navigate(url) {
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
    async act(action) {
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
    async observe(instruction) {
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
    async extract(instruction, schema) {
        if (!this.stagehand) {
            throw new Error('No browser session running');
        }
        const result = instruction
            ? schema
                ? await this.stagehand.extract(instruction, schema)
                : await this.stagehand.extract(instruction)
            : await this.stagehand.extract();
        this.logger.debug(`Extract result: ${JSON.stringify(result)}`);
        return result;
    }
    /**
     * Get list of available contexts.
     */
    getAvailableContexts() {
        return getAvailableContexts(this.contextDir);
    }
    /**
     * Get the Chrome DevTools debug URL.
     */
    getDebugUrl() {
        return `chrome://inspect#devtools/?ws=localhost:${this.chromePort}`;
    }
    /**
     * Get the Chrome DevTools Protocol WebSocket URL.
     */
    getCdpUrl() {
        return `ws://localhost:${this.chromePort}`;
    }
    /**
     * Get the Chrome remote debugging port.
     */
    getChromePort() {
        return this.chromePort;
    }
    /**
     * Check if a session is currently running.
     */
    isActive() {
        return this.isRunning;
    }
    /**
     * Get the current context name.
     */
    getCurrentContext() {
        return this.currentContext;
    }
}
//# sourceMappingURL=sessionManager.js.map