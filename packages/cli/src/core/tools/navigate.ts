import type { ToolContext, ToolResult, NavigateParams } from './types.js';

/**
 * Navigate tool - opens a URL in the browser.
 * 
 * Usage:
 * ```typescript
 * import { createNavigateTool } from '@browserbase/local/tools';
 * 
 * const tool = createNavigateTool({
 *   getBrowser: () => browser,
 * });
 * ```
 */
export function createNavigateTool(options: {
  getBrowser: () => import('../server.js').Browser;
}) {
  return {
    name: 'browse_navigate',
    label: 'Navigate',
    description: 'Open a URL in the browser. No LLM needed - just navigates directly.',
    
    async execute(
      toolCallId: string,
      params: { url: string; context?: string },
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
        
        // Navigate
        onUpdate?.({ content: [{ type: 'text', text: `Navigating to ${params.url}...` }] });
        await browser.navigate(params.url);
        
        return {
          success: true,
          content: [{ type: 'text', text: `Navigated to ${params.url}` }],
          details: { url: params.url },
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
 * Simple navigate executor for direct use without the tool wrapper.
 */
export async function navigate(
  browser: import('../server.js').Browser,
  params: { url: string; context?: string }
): Promise<ToolResult> {
  try {
    if (params.context) {
      await browser.useContext(params.context);
    }
    
    if (!browser.isActive()) {
      await browser.start();
    }
    
    await browser.navigate(params.url);
    
    return {
      success: true,
      content: [{ type: 'text', text: `Navigated to ${params.url}` }],
      details: { url: params.url },
    };
  } catch (error) {
    return {
      success: false,
      content: [{ type: 'error', text: error instanceof Error ? error.message : String(error) }],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}