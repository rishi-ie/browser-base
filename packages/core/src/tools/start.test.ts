import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStartTool } from './start.js';
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

describe('start tool', () => {
  let sessionManager: SessionManager;
  let startTool: ReturnType<typeof createStartTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockConfig: Config = {
      browserContextDir: '/tmp/test-contexts',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    startTool = createStartTool(sessionManager);
  });

  it('creates session with default context', async () => {
    const result = await startTool.handler({ context: undefined });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"started"');
  });

  it('creates session with named context', async () => {
    const result = await startTool.handler({ context: 'my-context' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"session":"my-context"');
  });

  it('is idempotent when already running', async () => {
    // First call starts the session
    await startTool.handler({ context: 'test-session' });
    
    // Second call should return already_running
    const result = await startTool.handler({ context: 'test-session' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"already_running"');
  });

  it('returns error when context does not exist in strict mode', async () => {
    const strictConfig: Config = {
      browserContextDir: '/tmp/nonexistent',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    const strictManager = new SessionManager(strictConfig);
    const strictStartTool = createStartTool(strictManager);

    const result = await strictStartTool.handler({ context: 'nonexistent' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('does not exist');
  });
});
