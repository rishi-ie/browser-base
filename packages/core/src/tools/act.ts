import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import type { SessionManager } from '../sessionManager.js';

const ActSchema = z.object({
  action: z.string().describe('Action to perform (e.g., "click the submit button")'),
});

export function createActTool() {
  return defineTool({
    name: 'act',
    description: 'Perform an action in the browser (click, type, etc.)',
    schema: ActSchema,
    handler: async (sessionManager: SessionManager, params: z.infer<typeof ActSchema>) => {
      if (!sessionManager.isActive()) {
        return err('No browser session running. Use the start tool first.');
      }

      try {
        const result = await sessionManager.act(params.action);
        return ok(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(`Action failed: ${message}`);
      }
    },
  });
}

export const actTool = createActTool();