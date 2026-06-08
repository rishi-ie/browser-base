import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import type { SessionManager } from '../sessionManager.js';

const UseContextSchema = z.object({
  name: z.string().describe('Name of the context to switch to'),
});

export function createUseContextTool() {
  return defineTool({
    name: 'use_context',
    description: 'Switch to a different browser context',
    schema: UseContextSchema,
    handler: async (sessionManager: SessionManager, params: z.infer<typeof UseContextSchema>) => {
      const contextName = params.name;

      // Check if context exists on disk
      const available = sessionManager.getAvailableContexts();
      if (!available.includes(contextName)) {
        return err(`Context '${contextName}' not found. Available contexts: ${available.join(', ') || '(none)'}`);
      }

      const wasRunning = sessionManager.isActive();

      try {
        await sessionManager.useContext(contextName);
        return ok({
          success: true,
          context: contextName,
          wasRunning,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(`Failed to switch context: ${message}`);
      }
    },
  });
}

export const useContextTool = createUseContextTool();