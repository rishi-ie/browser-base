import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExtractTool } from './extract.js';
import { SessionManager } from '../sessionManager.js';
import type { Config } from '../config.js';

// Mock chrome-launcher
vi.mock('chrome-launcher', () => ({
  launch: vi.fn().mockResolvedValue({ pid: 12345, port: 9222, kill: vi.fn() }),
  getChromePath: vi.fn().mockReturnValue('/usr/bin/google-chrome'),
}));

// Mock @browserbasehq/stagehand
vi.mock('@browserbasehq/stagehand', () => ({
  Stagehand: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    act: vi.fn().mockResolvedValue({ success: true }),
    observe: vi.fn().mockResolvedValue([]),
    extract: vi.fn().mockResolvedValue({ title: 'Example Page', url: 'https://example.com' }),
    context: { pages: vi.fn().mockResolvedValue([{ goto: vi.fn() }]) },
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('extract tool', () => {
  let sessionManager: SessionManager;
  let extractTool: ReturnType<typeof createExtractTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockConfig: Config = {
      browserContextDir: '/tmp/test-contexts',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    extractTool = createExtractTool(sessionManager);
  });

  it('returns error if no session running', async () => {
    const result = await extractTool.handler({ instruction: 'get the page title' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No session running');
  });

  it('calls sessionManager.extract with instruction and schema', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'test-session' });
    
    const extractSpy = vi.spyOn(sessionManager, 'extract');
    const schema = { title: { type: 'string' } };
    
    const result = await extractTool.handler({ 
      instruction: 'get the page title',
      schema,
    });

    expect(extractSpy).toHaveBeenCalledWith('test-session', 'get the page title', schema);
    expect(result.isError).toBe(false);
  });

  it('uses specified context', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'my-context' });
    
    const extractSpy = vi.spyOn(sessionManager, 'extract');
    
    await extractTool.handler({ 
      instruction: 'get product info',
      context: 'my-context',
    });

    expect(extractSpy).toHaveBeenCalledWith('my-context', 'get product info', undefined);
  });

  it('works without schema', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'test-session' });
    
    const extractSpy = vi.spyOn(sessionManager, 'extract');
    
    const result = await extractTool.handler({ instruction: 'get all text' });

    expect(extractSpy).toHaveBeenCalledWith('test-session', 'get all text', undefined);
    expect(result.isError).toBe(false);
  });
});
