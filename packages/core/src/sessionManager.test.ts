import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from './sessionManager.js';
import { resolveConfig } from './config.js';
import * as path from 'path';
import * as os from 'os';

// Mock chrome-launcher
vi.mock('chrome-launcher', () => ({
  launch: vi.fn().mockResolvedValue({
    pid: 12345,
    port: 9222,
    kill: vi.fn(),
    process: { pid: 12345 },
  }),
  getChromePath: vi.fn().mockReturnValue('/usr/bin/google-chrome'),
}));

// Mock @browserbasehq/stagehand
vi.mock('@browserbasehq/stagehand', () => ({
  V3: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    act: vi.fn().mockResolvedValue({ success: true, message: 'done', actionDescription: 'test', actions: [] }),
    observe: vi.fn().mockResolvedValue([]),
    extract: vi.fn().mockResolvedValue({ extraction: 'test' }),
    context: { pages: () => [{ goto: vi.fn() }] },
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('SessionManager', () => {
  const testDir = path.join(os.tmpdir(), 'browser-base-sm-test');
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    const config = resolveConfig({ contextDir: testDir });
    sessionManager = new SessionManager(config);
  });

  describe('getAvailableContexts', () => {
    it('returns empty array when context dir does not exist', () => {
      const contexts = sessionManager.getAvailableContexts();
      expect(contexts).toEqual([]);
    });
  });

  describe('isActive', () => {
    it('returns false initially', () => {
      expect(sessionManager.isActive()).toBe(false);
    });
  });

  describe('getCurrentContext', () => {
    it('returns default context initially', () => {
      expect(sessionManager.getCurrentContext()).toBe('default');
    });
  });

  describe('getDebugUrl', () => {
    it('returns Chrome DevTools URL', () => {
      const url = sessionManager.getDebugUrl();
      expect(url).toContain('chrome://inspect');
      expect(url).toContain('9222');
    });
  });

  describe('error cases', () => {
    it('navigate throws when session not running', async () => {
      await expect(sessionManager.navigate('https://example.com'))
        .rejects.toThrow('No browser session running');
    });

    it('act throws when session not running', async () => {
      await expect(sessionManager.act('click'))
        .rejects.toThrow('No browser session running');
    });

    it('observe throws when session not running', async () => {
      await expect(sessionManager.observe('find button'))
        .rejects.toThrow('No browser session running');
    });

    it('extract throws when session not running', async () => {
      await expect(sessionManager.extract('get title'))
        .rejects.toThrow('No browser session running');
    });

    it('useContext throws when context does not exist', async () => {
      await expect(sessionManager.useContext('nonexistent'))
        .rejects.toThrow("Context 'nonexistent' not found");
    });
  });
});
