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
 */
export interface Tool<T = unknown> {
  name: string;
  description: string;
  schema: z.ZodType;
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