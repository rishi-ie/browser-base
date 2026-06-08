import * as fs from 'fs';
import * as path from 'path';
import { launch, getChromePath, ChromeInstance } from 'chrome-launcher';
import { Stagehand } from '@browserbasehq/stagehand';
import { Config } from './config.js';

export interface Session {
  id: string;
  contextName: string;
  contextDir: string;
  stagehand: Stagehand;
  chrome: ChromeInstance;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async createSession(contextName: string = 'default'): Promise<Session> {
    const existingSession = this.sessions.get(contextName);
    if (existingSession) {
      return existingSession;
    }

    const contextDir = this.getContextDir(contextName);
    
    if (this.config.strict && !fs.existsSync(contextDir)) {
      throw new Error(`Context "${contextName}" does not exist at ${contextDir}`);
    }

    // Ensure context directory exists
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    const chromePath = this.config.chromePath ?? getChromePath();
    
    const chrome = await launch({
      headless: this.config.headless,
      chromePath,
      userDataDir: contextDir,
    });

    const stagehand = new Stagehand({
      env: 'LOCAL',
      chromeEndpoint: `http://localhost:${chrome.port}`,
    });

    await stagehand.init();

    const session: Session = {
      id: contextName,
      contextName,
      contextDir,
      stagehand,
      chrome,
    };

    this.sessions.set(contextName, session);
    return session;
  }

  async closeSession(contextName: string = 'default'): Promise<void> {
    const session = this.sessions.get(contextName);
    if (!session) {
      return;
    }

    await session.stagehand.close();
    await session.chrome.kill();
    this.sessions.delete(contextName);
  }

  getSession(contextName: string = 'default'): Session | undefined {
    return this.sessions.get(contextName);
  }

  getAvailableContexts(): string[] {
    if (!fs.existsSync(this.config.browserContextDir)) {
      return [];
    }

    return fs.readdirSync(this.config.browserContextDir)
      .filter((name) => {
        const fullPath = path.join(this.config.browserContextDir, name);
        return fs.statSync(fullPath).isDirectory();
      });
  }

  getContextDir(contextName: string): string {
    return path.join(this.config.browserContextDir, contextName);
  }

  async navigate(contextName: string, url: string): Promise<void> {
    const session = this.getSession(contextName);
    if (!session) {
      throw new Error(`No session found for context "${contextName}"`);
    }

    const pages = await session.stagehand.context.pages();
    if (pages.length > 0) {
      await pages[0].goto(url);
    }
  }

  async act(contextName: string, action: string): Promise<{ success: boolean }> {
    const session = this.getSession(contextName);
    if (!session) {
      throw new Error(`No session found for context "${contextName}"`);
    }

    return session.stagehand.act({ action });
  }

  async observe(contextName: string, instruction: string): Promise<unknown[]> {
    const session = this.getSession(contextName);
    if (!session) {
      throw new Error(`No session found for context "${contextName}"`);
    }

    return session.stagehand.observe({ instruction });
  }

  async extract<T>(
    contextName: string,
    instruction: string,
    schema?: Record<string, unknown>
  ): Promise<T> {
    const session = this.getSession(contextName);
    if (!session) {
      throw new Error(`No session found for context "${contextName}"`);
    }

    return session.stagehand.extract<T>({ instruction, schema });
  }
}
