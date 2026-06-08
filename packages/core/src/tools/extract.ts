import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const ExtractSchema = z.object({
  instruction: z.string().describe('What data to extract from the page'),
  schema: z.record(z.unknown()).optional().describe('Zod schema for the extracted data'),
  context: z.string().optional().describe('Context name (default: "default")'),
});

export function createExtractTool(sessionManager: SessionManager) {
  return defineTool(
    'extract',
    'Extract structured data from the current page',
    ExtractSchema,
    async (args) => {
      const contextName = args.context ?? 'default';
      
      const session = sessionManager.getSession(contextName);
      if (!session) {
        return err(`No session running for context "${contextName}". Use the start tool first.`);
      }

      try {
        const data = await sessionManager.extract(contextName, args.instruction, args.schema);
        return ok({ data });
      } catch (error) {
        return err(`Extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
