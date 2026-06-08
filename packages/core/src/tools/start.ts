import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const StartSchema = z.object({
  context: z.string().optional().describe('Context name (default: "default")'),
});

export function createStartTool(sessionManager: SessionManager) {
  return defineTool(
    'start',
    'Start a browser session with the specified context',
    StartSchema,
    async (args) => {
      const contextName = args.context ?? 'default';
      
      // Check if already running
      const existing = sessionManager.getSession(contextName);
      if (existing) {
        return ok({ session: contextName, status: 'already_running' });
      }

      // Check if context exists (strict mode)
      const contexts = sessionManager.getAvailableContexts();
      if (!contexts.includes(contextName) && sessionManager['config']['strict']) {
        return err(`Context "${contextName}" does not exist. Available contexts: ${contexts.join(', ') || 'none'}`);
      }

      try {
        await sessionManager.createSession(contextName);
        return ok({ session: contextName, status: 'started' });
      } catch (error) {
        return err(`Failed to start session: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
