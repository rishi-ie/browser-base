import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createObserveTool } from './observe.js';
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
    observe: vi.fn().mockResolvedValue([{ text: 'button', role: 'button' }]),
    extract: vi.fn().mockResolvedValue({}),
    context: { pages: vi.fn().mockResolvedValue([{ goto: vi.fn() }]) },
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('observe tool', () => {
  let sessionManager: SessionManager;
  let observeTool: ReturnType<typeof createObserveTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockConfig: Config = {
      browserContextDir: '/tmp/test-contexts',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    observeTool = createObserveTool(sessionManager);
  });

  it('returns error if no session running', async () => {
    const result = await observeTool.handler({ instruction: 'find the login button' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No session running');
  });

  it('calls sessionManager.observe with instruction', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'test-session' });
    
    const observeSpy = vi.spyOn(sessionManager, 'observe');
    
    const result = await observeTool.handler({ instruction: 'find all buttons' });

    expect(observeSpy).toHaveBeenCalledWith('test-session', 'find all buttons');
    expect(result.isError).toBe(false);
  });

  it('uses specified context', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'my-context' });
    
    const observeSpy = vi.spyOn(sessionManager, 'observe');
    
    await observeTool.handler({ instruction: 'find the form', context: 'my-context' });

    expect(observeSpy).toHaveBeenCalledWith('my-context', 'find the form');
  });
});
