import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUseContextTool } from './useContext.js';
import { SessionManager } from '../sessionManager.js';
import type { Config } from '../config.js';
import * as fs from 'fs';

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

describe('use_context tool', () => {
  let sessionManager: SessionManager;
  let useContextTool: ReturnType<typeof createUseContextTool>;
  const testDir = '/tmp/test-use-context';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test directory with contexts
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.mkdirSync(`${testDir}/existing-context`, { recursive: true });
    
    const mockConfig: Config = {
      browserContextDir: testDir,
      headless: true,
      strict: true,
      logLevel: 'info',
    };
    
    sessionManager = new SessionManager(mockConfig);
    useContextTool = createUseContextTool(sessionManager);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('switches context when session not running', async () => {
    const result = await useContextTool.handler({ context: 'existing-context' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"switched"');
  });

  it('switches context when session running (restart)', async () => {
    // Start a session first
    const startTool = (await import('./start.js')).createStartTool(sessionManager);
    await startTool.handler({ context: 'existing-context' });
    
    // Switch should close old and start new
    const result = await useContextTool.handler({ context: 'existing-context' });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('"status":"switched"');
  });

  it('returns error when context does not exist', async () => {
    const result = await useContextTool.handler({ context: 'nonexistent' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('does not exist');
  });

  it('lists available contexts on error', async () => {
    const result = await useContextTool.handler({ context: 'nonexistent' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('existing-context');
  });
});
