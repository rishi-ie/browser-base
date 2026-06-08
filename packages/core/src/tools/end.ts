import { z } from 'zod';
import { defineTool, ok } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const EndSchema = z.object({
  context: z.string().optional().describe('Context name (default: "default")'),
});

export function createEndTool(sessionManager: SessionManager) {
  return defineTool(
    'end',
    'End a browser session',
    EndSchema,
    async (args) => {
      const contextName = args.context ?? 'default';
      
      // Idempotent - no error if not running
      const existing = sessionManager.getSession(contextName);
      if (!existing) {
        return ok({ session: contextName, status: 'not_running' });
      }

      await sessionManager.closeSession(contextName);
      return ok({ session: contextName, status: 'closed' });
    }
  );
}
