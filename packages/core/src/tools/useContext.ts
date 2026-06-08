import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const UseContextSchema = z.object({
  context: z.string().describe('Context name to switch to'),
});

export function createUseContextTool(sessionManager: SessionManager) {
  return defineTool(
    'use_context',
    'Switch to a different browser context',
    UseContextSchema,
    async (args) => {
      const contextName = args.context;
      const contexts = sessionManager.getAvailableContexts();
      
      if (!contexts.includes(contextName)) {
        return err(
          `Context "${contextName}" does not exist. Available contexts: ${contexts.join(', ') || 'none'}`
        );
      }

      // Check if session is currently running
      const currentSession = sessionManager.getSession();
      if (currentSession) {
        // Close current session and start new one
        await sessionManager.closeSession();
      }

      // Start the new context
      try {
        await sessionManager.createSession(contextName);
        return ok({ context: contextName, status: 'switched' });
      } catch (error) {
        return err(`Failed to switch context: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
