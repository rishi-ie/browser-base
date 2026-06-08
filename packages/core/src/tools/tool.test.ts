import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTool, ok, err, type ToolResult } from './tool.js';

describe('Tool helper types', () => {
  describe('defineTool', () => {
    it('creates tool with correct shape', () => {
      const schema = z.object({
        name: z.string(),
      });

      const tool = defineTool(
        'test_tool',
        'A test tool',
        schema,
        async () => ({ content: [], isError: false })
      );

      expect(tool.name).toBe('test_tool');
      expect(tool.description).toBe('A test tool');
      expect(tool.inputSchema).toBe(schema);
      expect(typeof tool.handler).toBe('function');
    });

    it('creates tool with ZodObject schema', () => {
      const schema = z.object({
        url: z.string(),
        context: z.string().optional(),
      });

      const tool = defineTool(
        'navigate',
        'Navigate to URL',
        schema,
        async () => ({ content: [], isError: false })
      );

      expect(tool.schema).toMatchObject({
        type: 'object',
        properties: {
          url: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['url'],
      });
    });

    it('creates tool with simple string schema', () => {
      const schema = z.string();

      const tool = defineTool(
        'simple',
        'Simple tool',
        schema,
        async () => ({ content: [], isError: false })
      );

      expect(tool.schema).toEqual({ type: 'string' });
    });
  });

  describe('ok', () => {
    it('produces correct ToolResult for object', () => {
      const result = ok({ status: 'success', id: '123' });

      expect(result).toEqual({
        content: [{ type: 'text', text: '{"status":"success","id":"123"}' }],
        isError: false,
      });
    });

    it('produces correct ToolResult for string', () => {
      const result = ok('hello');

      expect(result).toEqual({
        content: [{ type: 'text', text: '"hello"' }],
        isError: false,
      });
    });

    it('produces correct ToolResult for array', () => {
      const result = ok([1, 2, 3]);

      expect(result).toEqual({
        content: [{ type: 'text', text: '[1,2,3]' }],
        isError: false,
      });
    });

    it('sets isError to false', () => {
      const result = ok({ data: 'test' });
      expect(result.isError).toBe(false);
    });
  });

  describe('err', () => {
    it('produces correct ToolResult with error message', () => {
      const result = err('Something went wrong');

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Something went wrong' }],
        isError: true,
      });
    });

    it('sets isError to true', () => {
      const result = err('Error message');
      expect(result.isError).toBe(true);
    });

    it('handles empty string', () => {
      const result = err('');
      expect(result).toEqual({
        content: [{ type: 'text', text: '' }],
        isError: true,
      });
    });
  });

  describe('schema validation', () => {
    it('validates ZodObject schema correctly', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      });

      const tool = defineTool(
        'user_info',
        'Get user info',
        schema,
        async () => ({ content: [], isError: false })
      );

      // Schema should have correct structure
      expect(tool.schema.type).toBe('object');
      expect(tool.schema.properties).toHaveProperty('name');
      expect(tool.schema.properties).toHaveProperty('age');
    });
  });
});
