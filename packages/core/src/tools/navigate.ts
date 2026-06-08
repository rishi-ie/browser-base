import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const NavigateSchema = z.object({
  url: z.string().describe('URL to navigate to'),
  context: z.string().optional().describe('Context name (default: "default")'),
});

export function createNavigateTool(sessionManager: SessionManager) {
  return defineTool(
    'navigate',
    'Navigate to a URL in the browser',
    NavigateSchema,
    async (args) => {
      const contextName = args.context ?? 'default';
      
      const session = sessionManager.getSession(contextName);
      if (!session) {
        return err(`No session running for context "${contextName}". Use the start tool first.`);
      }

      try {
        await sessionManager.navigate(contextName, args.url);
        return ok({ url: args.url, status: 'navigated' });
      } catch (error) {
        return err(`Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
