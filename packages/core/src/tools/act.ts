import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const ActSchema = z.object({
  action: z.string().describe('Action to perform (e.g., "click the submit button")'),
  context: z.string().optional().describe('Context name (default: "default")'),
});

export function createActTool(sessionManager: SessionManager) {
  return defineTool(
    'act',
    'Perform an action in the browser (click, type, etc.)',
    ActSchema,
    async (args) => {
      const contextName = args.context ?? 'default';
      
      const session = sessionManager.getSession(contextName);
      if (!session) {
        return err(`No session running for context "${contextName}". Use the start tool first.`);
      }

      try {
        const result = await sessionManager.act(contextName, args.action);
        return ok(result);
      } catch (error) {
        return err(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
