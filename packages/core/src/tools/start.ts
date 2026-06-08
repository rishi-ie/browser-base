import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import type { SessionManager } from '../sessionManager.js';
import { getAvailableContexts } from '../config.js';

const StartSchema = z.object({
  context: z.string().optional().describe('Context name to use (default: default)'),
});

export function createStartTool() {
  return defineTool({
    name: 'start',
    description: 'Start a browser session with the specified context',
    schema: StartSchema,
    handler: async (sessionManager: SessionManager, params: z.infer<typeof StartSchema>) => {
      const contextName = params.context ?? 'default';

      // If session already running, return existing info (idempotent)
      if (sessionManager.isActive()) {
        const info = {
          sessionId: sessionManager.getCurrentContext(),
          debugUrl: sessionManager.getDebugUrl(),
          cdpUrl: `ws://localhost:9222`,
          context: sessionManager.getCurrentContext(),
        };
        return ok(info);
      }

      try {
        const sessionInfo = await sessionManager.start(contextName);
        return ok(sessionInfo);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Check if it's a context not found error
        if (message.includes('context')) {
          const available = sessionManager.getAvailableContexts();
          return err(`Context '${contextName}' not found. Available contexts: ${available.join(', ') || '(none)'}`);
        }

        return err(`Failed to start session: ${message}`);
      }
    },
  });
}

export const startTool = createStartTool();