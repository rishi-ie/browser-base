import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNavigateTool } from './navigate.js';
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
    extract: vi.fn().mockResolvedValue({}),
    context: { pages: vi.fn().mockResolvedValue([{ goto: vi.fn() }]) },
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('navigate tool', () => {
  let sessionManager: SessionManager;
  let navigateTool: ReturnType<typeof createNavigateTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockConfig: Config = {
      browserContextDir: '/tmp/test-contexts',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    navigateTool = createNavigateTool(sessionManager);
  });

  it('returns error if no session running', async () => {
    const result = await navigateTool.handler({ url: 'https://example.com' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No session running');
  });

  it('calls sessionManager.navigate with correct URL', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'test-session' });
    
    const navigateSpy = vi.spyOn(sessionManager, 'navigate');
    
    const result = await navigateTool.handler({ url: 'https://example.com' });

    expect(navigateSpy).toHaveBeenCalledWith('test-session', 'https://example.com');
    expect(result.isError).toBe(false);
  });

  it('uses specified context', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'my-context' });
    
    const navigateSpy = vi.spyOn(sessionManager, 'navigate');
    
    await navigateTool.handler({ url: 'https://example.com', context: 'my-context' });

    expect(navigateSpy).toHaveBeenCalledWith('my-context', 'https://example.com');
  });
});
