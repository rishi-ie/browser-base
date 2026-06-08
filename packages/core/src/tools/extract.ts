import type { ToolContext, ToolResult } from './types.js';

/**
 * Extract tool - extracts structured data from the current page.
 * Uses LLM to understand what data to extract and format it.
 * 
 * Usage:
 * ```typescript
 * import { createExtractTool } from '@browserbase/local/tools';
 * 
 * const tool = createExtractTool({
 *   getBrowser: () => browser,
 * });
 * ```
 */
export function createExtractTool(options: {
  getBrowser: () => import('../server.js').Browser;
}) {
  return {
    name: 'browse_extract',
    label: 'Browser Extract',
    description: 'Extract structured data from the current page using natural language. Returns JSON data based on the instruction. Optionally provide a JSON schema for typed extraction.',
    
    async execute(
      toolCallId: string,
      params: { instruction: string; schema?: unknown; context?: string },
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
        
        onUpdate?.({ content: [{ type: 'text', text: `Extracting: ${params.instruction}` }] });
        
        const data = await browser.extract(params.instruction, params.schema);
        
        return {
          success: true,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          details: {
            data,
            instruction: params.instruction,
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
 * Simple extract executor for direct use without the tool wrapper.
 */
export async function extract(
  browser: import('../server.js').Browser,
  params: { instruction: string; schema?: unknown; context?: string }
): Promise<ToolResult> {
  try {
    if (params.context) {
      await browser.useContext(params.context);
    }
    
    if (!browser.isActive()) {
      await browser.start();
    }
    
    const data = await browser.extract(params.instruction, params.schema);
    
    return {
      success: true,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      details: {
        data,
        instruction: params.instruction,
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