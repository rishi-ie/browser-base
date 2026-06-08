import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEndTool } from './end.js';
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

describe('end tool', () => {
  let sessionManager: SessionManager;
  let endTool: ReturnType<typeof createEndTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockConfig: Config = {
      browserContextDir: '/tmp/test-contexts',
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    endTool = createEndTool(sessionManager);
  });

  it('closes session when running', async () => {
    // First start a session
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'test-session' });
    
    // Then end it
    const result = await endTool.handler({ context: 'test-session' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"closed"');
  });

  it('is idempotent when not running', async () => {
    const result = await endTool.handler({ context: 'nonexistent-session' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"not_running"');
  });

  it('closes default context when no context specified', async () => {
    // Start default session
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: undefined });
    
    // End default
    const result = await endTool.handler({ context: undefined });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"closed"');
  });
});
