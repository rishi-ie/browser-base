import { z } from 'zod';
import { defineTool, ok } from './tool.js';
import type { SessionManager } from '../sessionManager.js';

const EndSchema = z.object({});

export function createEndTool() {
  return defineTool({
    name: 'end',
    description: 'End the current browser session',
    schema: EndSchema,
    handler: async (sessionManager: SessionManager, _params: z.infer<typeof EndSchema>) => {
      // Idempotent - return success even if no session is running
      if (!sessionManager.isActive()) {
        return ok({ success: true, message: 'No session running' });
      }

      try {
        await sessionManager.end();
        return ok({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return ok({ success: false, error: message });
      }
    },
  });
}

export const endTool = createEndTool();