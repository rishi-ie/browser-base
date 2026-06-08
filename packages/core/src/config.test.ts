import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveConfig, validateConfig, type Config } from './config.js';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveConfig', () => {
    it('applies defaults when no options or env vars provided', () => {
      const config = resolveConfig();
      
      expect(config.browserContextDir).toBe('./browser-context');
      expect(config.port).toBeUndefined();
      expect(config.chromePath).toBeUndefined();
      expect(config.headless).toBe(true);
      expect(config.strict).toBe(true);
      expect(config.logLevel).toBe('info');
    });

    it('env var overrides default for browserContextDir', () => {
      process.env.BROWSER_CONTEXT_DIR = '/custom/path';
      const config = resolveConfig();
      
      expect(config.browserContextDir).toBe('/custom/path');
    });

    it('env var overrides default for port', () => {
      process.env.PORT = '8080';
      const config = resolveConfig();
      
      expect(config.port).toBe(8080);
    });

    it('env var overrides default for chromePath', () => {
      process.env.CHROME_PATH = '/usr/bin/chrome';
      const config = resolveConfig();
      
      expect(config.chromePath).toBe('/usr/bin/chrome');
    });

    it('HEADFUL=1 disables headless mode', () => {
      process.env.HEADFUL = '1';
      const config = resolveConfig();
      
      expect(config.headless).toBe(false);
    });

    it('STRICT=1 enables strict mode', () => {
      process.env.STRICT = '1';
      const config = resolveConfig();
      
      expect(config.strict).toBe(true);
    });

    it('LOG_LEVEL env var is applied', () => {
      process.env.LOG_LEVEL = 'debug';
      const config = resolveConfig();
      
      expect(config.logLevel).toBe('debug');
    });

    it('CLI options override env vars', () => {
      process.env.BROWSER_CONTEXT_DIR = '/env/path';
      process.env.PORT = '3000';
      
      const config = resolveConfig({
        browserContextDir: '/cli/path',
        port: 9000,
      });
      
      expect(config.browserContextDir).toBe('/cli/path');
      expect(config.port).toBe(9000);
    });

    it('CLI options override defaults', () => {
      const config = resolveConfig({
        browserContextDir: '/custom',
        headless: false,
        strict: false,
        logLevel: 'debug',
      });
      
      expect(config.browserContextDir).toBe('/custom');
      expect(config.headless).toBe(false);
      expect(config.strict).toBe(false);
      expect(config.logLevel).toBe('debug');
    });
  });

  describe('validateConfig', () => {
    it('throws when browserContextDir is missing', () => {
      const config = { browserContextDir: '', headless: true, strict: true, logLevel: 'info' } as Config;
      
      expect(() => validateConfig(config)).toThrow('browserContextDir is required');
    });

    it('throws when port is out of range', () => {
      const config = { browserContextDir: '/tmp', port: 70000, headless: true, strict: true, logLevel: 'info' } as Config;
      
      expect(() => validateConfig(config)).toThrow('port must be between 1 and 65535');
    });

    it('throws when port is less than 1', () => {
      const config = { browserContextDir: '/tmp', port: 0, headless: true, strict: true, logLevel: 'info' } as Config;
      
      expect(() => validateConfig(config)).toThrow('port must be between 1 and 65535');
    });

    it('throws when logLevel is invalid', () => {
      const config = { browserContextDir: '/tmp', headless: true, strict: true, logLevel: 'invalid' } as Config;
      
      expect(() => validateConfig(config)).toThrow('logLevel must be one of: debug, info, warn, error');
    });

    it('does not throw for valid config', () => {
      const config: Config = {
        browserContextDir: '/tmp',
        port: 8080,
        headless: true,
        strict: true,
        logLevel: 'info',
      };
      
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('does not throw when port is undefined', () => {
      const config: Config = {
        browserContextDir: '/tmp',
        headless: true,
        strict: true,
        logLevel: 'info',
      };
      
      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
