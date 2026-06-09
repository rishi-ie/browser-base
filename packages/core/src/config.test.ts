import { describe, it, expect } from 'vitest';
import {
  resolveConfig,
  validateContextName,
  getAvailableContexts,
  contextExists,
  createContext,
  deleteContext,
} from './config.js';
import * as fs from 'fs';
import * as path from 'path';

describe('config', () => {
  describe('resolveConfig', () => {
    it('should return defaults when no options provided', () => {
      const config = resolveConfig({});
      
      expect(config.headful).toBe(false);
      expect(config.browserPath).toBeNull();
      expect(config.contextDir).toBe('./browser-context');
      expect(config.chromePort).toBe(9222);
      expect(config.verbose).toBe(0);
      expect(config.defaultContext).toBe('default');
      expect(config.timeout).toBe(30000);
    });

    it('should override defaults with provided options', () => {
      const config = resolveConfig({
        headful: true,
        contextDir: '/custom/path',
        verbose: 2,
      });
      
      expect(config.headful).toBe(true);
      expect(config.contextDir).toBe('/custom/path');
      expect(config.verbose).toBe(2);
    });
  });

  describe('validateContextName', () => {
    it('should accept valid context names', () => {
      expect(() => validateContextName('default')).not.toThrow();
      expect(() => validateContextName('github-main')).not.toThrow();
      expect(() => validateContextName('test_123')).not.toThrow();
    });

    it('should reject empty names', () => {
      expect(() => validateContextName('')).toThrow('cannot be empty');
      expect(() => validateContextName('   ')).toThrow('cannot be empty');
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateContextName('..')).toThrow('Invalid context name');
      expect(() => validateContextName('../other')).toThrow('path separators');
      expect(() => validateContextName('foo/bar')).toThrow('path separators');
      expect(() => validateContextName('foo\\bar')).toThrow('path separators');
    });
  });

  describe('getAvailableContexts', () => {
    it('should return empty array for non-existent directory', () => {
      const contexts = getAvailableContexts('/non/existent/path');
      expect(contexts).toEqual([]);
    });
  });
});

describe('Browser', () => {
  // Note: These tests require Chrome to be installed
  // Skip if Chrome is not available

  const { Browser } = require('./browser.js');

  describe('start/end lifecycle', () => {
    it('should track active state correctly', () => {
      const config = resolveConfig({ contextDir: '/tmp/test-browser-context' });
      const browser = new Browser(config);
      
      expect(browser.isBrowserActive()).toBe(false);
    });
  });
});