import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const ObserveSchema = z.object({
  instruction: z.string().describe('What to look for on the page'),
  context: z.string().optional().describe('Context name (default: "default")'),
});

export function createObserveTool(sessionManager: SessionManager) {
  return defineTool(
    'observe',
    'Observe and identify elements on the current page',
    ObserveSchema,
    async (args) => {
      const contextName = args.context ?? 'default';
      
      const session = sessionManager.getSession(contextName);
      if (!session) {
        return err(`No session running for context "${contextName}". Use the start tool first.`);
      }

      try {
        const elements = await sessionManager.observe(contextName, args.instruction);
        return ok({ elements });
      } catch (error) {
        return err(`Observation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
