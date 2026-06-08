import type { ToolContext, ToolResult, BrowserParams } from './types.js';
import { navigate } from './navigate.js';
import { act } from './act.js';
import { observe } from './observe.js';
import { extract } from './extract.js';

/**
 * Unified browser tool that handles all browser actions.
 * This is the primary integration point for coding agents.
 * 
 * Usage with pi agent:
 * ```typescript
 * import { createBrowserTool } from '@browserbase/local/tools';
 * 
 * const tool = createBrowserTool({
 *   getBrowser: () => browser,
 * });
 * 
 * pi.registerTool(tool);
 * ```
 * 
 * Direct usage:
 * ```typescript
 * import { browserTool } from '@browserbase/local/tools';
 * 
 * const result = await browserTool.execute(id, {
 *   action: 'navigate',
 *   url: 'https://github.com',
 * });
 * ```
 */
export function createBrowserTool(options: {
  getBrowser: () => import('../server.js').Browser;
}) {
  const browserTool = {
    name: 'browser',
    label: 'Browser',
    description: 'Control a local Chrome browser with persistent login sessions. Actions: navigate (open URL), act (click/type using natural language), observe (find elements), extract (get structured data), start/end session, manage contexts.',
    
    async execute(
      toolCallId: string,
      params: {
        action: string;
        url?: string;
        instruction?: string;
        schema?: unknown;
        context?: string;
        name?: string;
        headful?: boolean;
      },
      signal?: AbortSignal,
      onUpdate?: (update: { content: { type: 'text'; text: string }[] }) => void,
      _ctx?: ToolContext
    ): Promise<ToolResult> {
      const browser = options.getBrowser();
      
      switch (params.action) {
        case 'navigate':
          if (!params.url) {
            return { success: false, content: [{ type: 'error', text: 'URL required for navigate action' }] };
          }
          return navigate(browser, { url: params.url, context: params.context });
        
        case 'act':
          if (!params.instruction) {
            return { success: false, content: [{ type: 'error', text: 'Instruction required for act action' }] };
          }
          return act(browser, { instruction: params.instruction, context: params.context });
        
        case 'observe':
          return observe(browser, { instruction: params.instruction, context: params.context });
        
        case 'extract':
          if (!params.instruction) {
            return { success: false, content: [{ type: 'error', text: 'Instruction required for extract action' }] };
          }
          return extract(browser, { instruction: params.instruction, schema: params.schema, context: params.context });
        
        case 'start':
          try {
            const info = await browser.start(params.context);
            return {
              success: true,
              content: [{ type: 'text', text: `Browser started with context: ${info.context}` }],
              details: info,
            };
          } catch (error) {
            return {
              success: false,
              content: [{ type: 'error', text: error instanceof Error ? error.message : String(error) }],
            };
          }
        
        case 'end':
          try {
            await browser.end();
            return { success: true, content: [{ type: 'text', text: 'Browser session ended' }] };
          } catch (error) {
            return {
              success: false,
              content: [{ type: 'error', text: error instanceof Error ? error.message : String(error) }],
            };
          }
        
        case 'use-context':
          if (!params.name) {
            return { success: false, content: [{ type: 'error', text: 'Context name required for use-context action' }] };
          }
          try {
            const info = await browser.useContext(params.name);
            return {
              success: true,
              content: [{ type: 'text', text: `Switched to context: ${info.context}` }],
              details: info,
            };
          } catch (error) {
            return {
              success: false,
              content: [{ type: 'error', text: error instanceof Error ? error.message : String(error) }],
            };
          }
        
        case 'status':
          return {
            success: true,
            content: [{
              type: 'text',
              text: JSON.stringify({
                active: browser.isActive(),
                currentContext: browser.getCurrentContext(),
                availableContexts: browser.getAvailableContexts(),
                debugUrl: browser.getDebugUrl(),
              }, null, 2),
            }],
          };
        
        case 'contexts':
          return {
            success: true,
            content: [{ type: 'text', text: browser.getAvailableContexts().join('\n') || '(none)' }],
            details: { contexts: browser.getAvailableContexts() },
          };
        
        case 'context-create':
          if (!params.name) {
            return { success: false, content: [{ type: 'error', text: 'Context name required for context-create action' }] };
          }
          // This needs to be done via CLI or config - we can't create context dirs from here
          // For now, just return instructions
          return {
            success: true,
            content: [{
              type: 'text',
              text: `To create context "${params.name}", run: browse-local context create ${params.name}`,
            }],
          };
        
        default:
          return {
            success: false,
            content: [{ type: 'error', text: `Unknown action: ${params.action}` }],
          };
      }
    },
  };
  
  return browserTool;
}

/**
 * Convenience function to execute a browser action directly.
 */
export async function browserAction(
  browser: import('../server.js').Browser,
  params: {
    action: string;
    url?: string;
    instruction?: string;
    schema?: unknown;
    context?: string;
    name?: string;
  }
): Promise<ToolResult> {
  const tool = createBrowserTool({ getBrowser: () => browser });
  return tool.execute('inline', params as any);
}

// Re-export individual tools
export { createNavigateTool, navigate } from './navigate.js';
export { createActTool, act } from './act.js';
export { createObserveTool, observe } from './observe.js';
export { createExtractTool, extract } from './extract.js';

// Re-export types
export type { ToolContext, ToolResult, ToolUpdate, ToolContent } from './types.js';
export type {
  BrowserParams,
  NavigateParams,
  ActParams,
  ObserveParams,
  ExtractParams,
  UseContextParams,
  ContextCreateParams,
  StartParams,
  StatusParams,
  ContextsParams,
  BrowserActionType,
} from './types.js';