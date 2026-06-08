import { z } from 'zod';
import type { SessionManager } from '../sessionManager.js';

/**
 * Result returned by a tool handler.
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * A tool definition with schema, description, and handler.
 * Tools are simple functions that take a SessionManager and params, and return a ToolResult.
 * This is the internal abstraction — for programmatic use, just call methods on the Browser class.
 */
export interface Tool<T = unknown> {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodObject<any>;
  handler: (sessionManager: SessionManager, params: T) => Promise<ToolResult>;
}

/**
 * Helper to create a tool definition.
 */
export function defineTool<T>(def: Tool<T>): Tool<T> {
  return def;
}

/**
 * Create a success result.
 */
export function ok(content: unknown): ToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(content) }],
    isError: false,
  };
}

/**
 * Create an error result.
 */
export function err(message: string): ToolResult {
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Require a running session, returning an error result if not running.
 */
export function requireSession(sessionManager: SessionManager): void {
  if (!sessionManager.isActive()) {
    throw new Error('No browser session is running. Use the start tool first.');
  }
}
