import type { ToolContext, ToolResult } from './types.js';

/**
 * Observe tool - finds actionable elements on the page matching an instruction.
 * Uses LLM to identify clickable/interactable elements.
 * 
 * Usage:
 * ```typescript
 * import { createObserveTool } from '@browserbase/local/tools';
 * 
 * const tool = createObserveTool({
 *   getBrowser: () => browser,
 * });
 * ```
 */
export function createObserveTool(options: {
  getBrowser: () => import('../server.js').Browser;
}) {
  return {
    name: 'browse_observe',
    label: 'Browser Observe',
    description: 'Find actionable elements on the page matching a description. Returns selectors and descriptions for clickable/interactable elements. Use this before act if unsure what elements are available.',
    
    async execute(
      toolCallId: string,
      params: { instruction?: string; context?: string },
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
        
        onUpdate?.({ content: [{ type: 'text', text: 'Finding elements...' }] });
        
        const actions = await browser.observe(params.instruction);
        
        // Format results as readable text
        const lines = actions.map((a, i) => 
          `[${i + 1}] ${a.description}${a.method ? ` (${a.method})` : ''}\n    selector: ${a.selector}`
        );
        
        return {
          success: true,
          content: [{ type: 'text', text: lines.join('\n') || 'No elements found' }],
          details: {
            count: actions.length,
            actions,
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
 * Simple observe executor for direct use without the tool wrapper.
 */
export async function observe(
  browser: import('../server.js').Browser,
  params: { instruction?: string; context?: string }
): Promise<ToolResult> {
  try {
    if (params.context) {
      await browser.useContext(params.context);
    }
    
    if (!browser.isActive()) {
      await browser.start();
    }
    
    const actions = await browser.observe(params.instruction);
    
    const lines = actions.map((a, i) => 
      `[${i + 1}] ${a.description}${a.method ? ` (${a.method})` : ''}\n    selector: ${a.selector}`
    );
    
    return {
      success: true,
      content: [{ type: 'text', text: lines.join('\n') || 'No elements found' }],
      details: {
        count: actions.length,
        actions,
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