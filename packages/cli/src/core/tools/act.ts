import type { ToolContext, ToolResult } from './types.js';

/**
 * Act tool - performs a natural language action in the browser.
 * Uses LLM to interpret the action and select/interact with elements.
 * 
 * Usage:
 * ```typescript
 * import { createActTool } from '@browserbase/local/tools';
 * 
 * const tool = createActTool({
 *   getBrowser: () => browser,
 * });
 * ```
 */
export function createActTool(options: {
  getBrowser: () => import('../server.js').Browser;
}) {
  return {
    name: 'browse_act',
    label: 'Browser Act',
    description: 'Perform a natural language action in the browser (click, type, hover, etc.). Uses LLM to interpret the instruction and find/interact with elements. Use observe first if unsure what elements are available.',
    
    async execute(
      toolCallId: string,
      params: { instruction: string; context?: string },
      signal?: AbortSignal,
      onUpdate?: (update: { content: { type: 'text'; text: string }[] }) => void,
      _ctx?: ToolContext
    ): Promise<ToolResult> {
      try {
        const browser = options.getBrowser();
        
        // Switch context if specified
        if (params.context) {
          await browser.useContext(params.context);
        }
        
        // Ensure session is running
        if (!browser.isActive()) {
          await browser.start();
        }
        
        onUpdate?.({ content: [{ type: 'text', text: `Performing: ${params.instruction}` }] });
        
        const result = await browser.act(params.instruction);
        
        return {
          success: result.success,
          content: [{ type: 'text', text: result.message || result.actionDescription }],
          details: {
            success: result.success,
            actionDescription: result.actionDescription,
            actions: result.actions,
            cacheStatus: result.cacheStatus,
          },
        };
      } catch (error) {
        return {
          success: false,
          content: [{ type: 'error', text: error instanceof Error ? error.message : String(error) }],
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

/**
 * Simple act executor for direct use without the tool wrapper.
 */
export async function act(
  browser: import('../server.js').Browser,
  params: { instruction: string; context?: string }
): Promise<ToolResult> {
  try {
    if (params.context) {
      await browser.useContext(params.context);
    }
    
    if (!browser.isActive()) {
      await browser.start();
    }
    
    const result = await browser.act(params.instruction);
    
    return {
      success: result.success,
      content: [{ type: 'text', text: result.message || result.actionDescription }],
      details: {
        success: result.success,
        actionDescription: result.actionDescription,
        actions: result.actions,
        cacheStatus: result.cacheStatus,
      },
    };
  } catch (error) {
    return {
      success: false,
      content: [{ type: 'error', text: error instanceof Error ? error.message : String(error) }],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}