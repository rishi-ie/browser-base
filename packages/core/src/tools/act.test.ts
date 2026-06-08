import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActTool } from './act.js';
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

describe('act tool', () => {
  let sessionManager: SessionManager;
  let actTool: ReturnType<typeof createActTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockConfig: Config = {
      browserContextDir: '/tmp/test-contexts',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    actTool = createActTool(sessionManager);
  });

  it('returns error if no session running', async () => {
    const result = await actTool.handler({ action: 'click the button' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No session running');
  });

  it('calls sessionManager.act with correct action', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'test-session' });
    
    const actSpy = vi.spyOn(sessionManager, 'act');
    
    const result = await actTool.handler({ action: 'click the submit button' });

    expect(actSpy).toHaveBeenCalledWith('test-session', 'click the submit button');
    expect(result.isError).toBe(false);
  });

  it('uses specified context', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'my-context' });
    
    const actSpy = vi.spyOn(sessionManager, 'act');
    
    await actTool.handler({ action: 'type hello', context: 'my-context' });

    expect(actSpy).toHaveBeenCalledWith('my-context', 'type hello');
  });
});
