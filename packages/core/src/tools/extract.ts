import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import type { SessionManager } from '../sessionManager.js';

const ExtractSchema = z.object({
  instruction: z.string().optional().describe('What data to extract from the page'),
  schema: z.record(z.unknown()).optional().describe('Zod schema for the extracted data'),
});

export function createExtractTool() {
  return defineTool({
    name: 'extract',
    description: 'Extract structured data from the current page',
    schema: ExtractSchema,
    handler: async (sessionManager: SessionManager, params: z.infer<typeof ExtractSchema>) => {
      if (!sessionManager.isActive()) {
        return err('No browser session running. Use the start tool first.');
      }

      try {
        const data = await sessionManager.extract(params.instruction, params.schema);
        return ok({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(`Extraction failed: ${message}`);
      }
    },
  });
}

export const extractTool = createExtractTool();