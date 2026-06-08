/**
 * Shared types for browser-base tools.
 * These are designed for compatibility with pi agent extensions
 * and other CLI coding agents that use tool-based interfaces.
 */

// Tool execution context - passed to all tool executors
export interface ToolContext {
  browser: import('../server.js').Browser;
  signal?: AbortSignal;
  onUpdate?: (update: ToolUpdate) => void;
}

// Tool result types
export interface ToolResult {
  success: boolean;
  content: ToolContent[];
  details?: unknown;
  error?: string;
}

export interface ToolUpdate {
  content: ToolContent[];
  partial?: boolean;
}

export interface ToolContent {
  type: 'text' | 'image' | 'error';
  text?: string;
  data?: string; // base64 for images
  mediaType?: string;
}

// Browser tool action types
export type BrowserActionType = 
  | 'navigate'
  | 'act'
  | 'observe'
  | 'extract'
  | 'start'
  | 'end'
  | 'use-context'
  | 'status'
  | 'contexts'
  | 'context-create';

// Browser tool parameters
export interface NavigateParams {
  url: string;
  context?: string;
}

export interface ActParams {
  instruction: string;
  context?: string;
}

export interface ObserveParams {
  instruction?: string;
  context?: string;
}

export interface ExtractParams {
  instruction: string;
  schema?: unknown;
  context?: string;
}

export interface UseContextParams {
  name: string;
}

export interface ContextCreateParams {
  name: string;
}

export interface StartParams {
  context?: string;
  headful?: boolean;
}

export interface StatusParams {}

export interface ContextsParams {}

// Generic browser tool params (unified interface)
export interface BrowserParams {
  action: BrowserActionType;
  url?: string;
  instruction?: string;
  schema?: unknown;
  context?: string;
  name?: string;
  headful?: boolean;
}

// Re-export types from sessionManager
export type { ActResult, Action, SessionInfo } from '../sessionManager.js';

// Re-export config types
export type { Config, ResolvedConfig } from '../config.js';