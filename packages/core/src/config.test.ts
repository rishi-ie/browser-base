import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveConfig, validateConfig, getAvailableContexts, contextExists, type Config } from './config.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('config', () => {
  const originalEnv = process.env;
  const testDir = path.join(os.tmpdir(), 'browser-base-test');

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('resolveConfig', () => {
    it('applies defaults when no options or env vars provided', () => {
      const config = resolveConfig();

      expect(config.headful).toBe(false);
      expect(config.contextDir).toBe('./browser-context');
      expect(config.chromePort).toBe(9222);
      expect(config.host).toBe('localhost');
      expect(config.model).toBe('openai/gpt-4.1-mini');
      expect(config.verbose).toBe(0);
      expect(config.defaultContext).toBe('default');
      expect(config.port).toBeUndefined();
    });

    it('env var overrides default for contextDir', () => {
      process.env.BROWSER_BASE_CONTEXT_DIR = '/custom/path';
      const config = resolveConfig();

      expect(config.contextDir).toBe('/custom/path');
    });

    it('env var overrides default for port', () => {
      process.env.BROWSER_BASE_PORT = '8080';
      const config = resolveConfig();

      expect(config.port).toBe(8080);
    });

    it('HEADFUL=1 enables headful mode', () => {
      process.env.BROWSER_BASE_HEADFUL = '1';
      const config = resolveConfig();

      expect(config.headful).toBe(true);
    });

    it('CLI options override defaults', () => {
      const config = resolveConfig({
        headful: true,
        contextDir: '/custom',
        model: 'anthropic/claude-sonnet-4-6',
        verbose: 2,
      });

      expect(config.headful).toBe(true);
      expect(config.contextDir).toBe('/custom');
      expect(config.model).toBe('anthropic/claude-sonnet-4-6');
      expect(config.verbose).toBe(2);
    });

    it('CLI options override env vars', () => {
      process.env.BROWSER_BASE_CONTEXT_DIR = '/env/path';

      const config = resolveConfig({
        contextDir: '/cli/path',
      });

      expect(config.contextDir).toBe('/cli/path');
    });
  });

  describe('validateConfig', () => {
    it('creates context directory if it does not exist', () => {
      const config = resolveConfig({ contextDir: testDir });
      validateConfig(config);

      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('throws when port is out of range', () => {
      const config = resolveConfig({ contextDir: testDir, port: 70000 });
      expect(() => validateConfig(config)).toThrow('Port must be between 1 and 65535');
    });

    it('throws when port is less than 1', () => {
      const config = resolveConfig({ contextDir: testDir, port: 0 });
      expect(() => validateConfig(config)).toThrow('Port must be between 1 and 65535');
    });

    it('throws when verbose is invalid', () => {
      const config = resolveConfig({ contextDir: testDir, verbose: 5 as any });
      expect(() => validateConfig(config)).toThrow('Verbose must be 0, 1, or 2');
    });
  });

  describe('getAvailableContexts', () => {
    it('returns empty array when directory does not exist', () => {
      const result = getAvailableContexts('/nonexistent/path');
      expect(result).toEqual([]);
    });

    it('returns list of directories', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, 'github-main'));
      fs.mkdirSync(path.join(testDir, 'default'));
      fs.writeFileSync(path.join(testDir, 'not-a-dir.txt'), '');

      const result = getAvailableContexts(testDir);
      expect(result).toContain('github-main');
      expect(result).toContain('default');
      expect(result).not.toContain('not-a-dir.txt');
    });

    it('filters out hidden directories', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, '.hidden'));
      fs.mkdirSync(path.join(testDir, 'visible'));

      const result = getAvailableContexts(testDir);
      expect(result).toContain('visible');
      expect(result).not.toContain('.hidden');
    });
  });

  describe('contextExists', () => {
    it('returns true when context directory exists', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, 'github-main'));

      expect(contextExists(testDir, 'github-main')).toBe(true);
    });

    it('returns false when context directory does not exist', () => {
      fs.mkdirSync(testDir, { recursive: true });

      expect(contextExists(testDir, 'nonexistent')).toBe(false);
    });
  });
});
